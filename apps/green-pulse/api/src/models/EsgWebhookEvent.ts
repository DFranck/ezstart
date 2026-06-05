import { connectToMongo, ttlPlugin } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { Schema, type Model, type Document } from 'mongoose'

/**
 * ESG webhook idempotency ledger.
 *
 * Every inbound ESG SaaS webhook delivery is recorded here exactly once,
 * keyed on a stable idempotency token (either a payload-supplied event id,
 * or — when the upstream payload has no natural id — a SHA-256 hash of the
 * raw signed bytes). The handler attempts to claim a token BEFORE running any
 * side-effect; a duplicate claim (E11000 on the unique `eventKey` index)
 * means the event was already processed — the handler then no-ops and
 * returns 200.
 *
 * ## Why this matters (hacker A1b — E2)
 *
 * Without dedup, a replay (cf. V3 timestamp protection) — or a legitimate
 * at-least-once redelivery from the upstream ESG SaaS — would re-run
 * `handleReportCompleted` / `handleReportFailed` / `handleDataProcessed`
 * N times. Once those handlers grow real side-effects (DB writes, email
 * notifications, dashboard mutations) the duplication becomes a user-visible
 * bug (double emails, inflated metrics). This ledger collapses every
 * redelivery to a single processing event.
 *
 * Documents auto-expire after 30 days via a TTL index — long enough to
 * cover any reasonable upstream redelivery window while keeping the
 * collection bounded.
 *
 * @module apps/green-pulse/api/src/models/EsgWebhookEvent
 */

/** TTL for processed webhook event records (30 days, in seconds). */
export const ESG_WEBHOOK_EVENT_TTL_SECONDS = 30 * 24 * 60 * 60

/**
 * Stale-claim recovery window (hacker A1b.5 — E4).
 *
 * If a `claimedAt` record was inserted but `processedAt` is still null AND
 * `claimedAt` is older than this threshold, we assume the previous process
 * crashed mid-dispatch and the claim can be reclaimed by the next delivery
 * (at-least-once recovery). Tuned to comfortably exceed any single webhook
 * handler latency (DB writes + emails + downstream API calls) while staying
 * short enough that a real upstream redelivery recovers promptly.
 */
export const ESG_WEBHOOK_STALE_CLAIM_MS = 5 * 60 * 1000

export interface EsgWebhookEventDocument extends Document {
  /**
   * Stable idempotency key for the delivery. Either the upstream-supplied
   * `job_id` (preferred, when the payload carries one) or a SHA-256 hex
   * digest of the raw signed bytes (fallback, when no natural id exists).
   */
  eventKey: string
  /** ESG event type snapshot (informational / debugging). */
  eventType?: string
  /**
   * When this delivery was first claimed for processing. Set on every
   * `claim`/`reclaim`. Used to detect crashed-mid-dispatch claims older
   * than {@link ESG_WEBHOOK_STALE_CLAIM_MS}.
   */
  claimedAt: Date
  /**
   * When the dispatch finished successfully. `null` while in flight; set
   * by {@link markEsgWebhookEventProcessed} on dispatch success. A
   * `processedAt: null` row older than the stale window is a recoverable
   * crash (hacker A1b.5 — E4 at-least-once).
   */
  processedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const esgWebhookEventSchema = new Schema<EsgWebhookEventDocument>(
  {
    eventKey: { type: String, required: true },
    eventType: { type: String },
    claimedAt: { type: Date, default: Date.now, required: true },
    // `null` while in flight — only set after dispatch succeeds. Allows
    // crash recovery via the stale-claim window in {@link claimEsgWebhookEvent}.
    processedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    bufferCommands: false, // fail-fast, never queue when disconnected
  }
)

// Unique idempotency key — duplicate deliveries collapse to a single
// processing event via E11000 on insert.
esgWebhookEventSchema.index({ eventKey: 1 }, { unique: true })

// Auto-purge processed events after the redelivery window closes.
esgWebhookEventSchema.plugin(ttlPlugin, { ttlSeconds: ESG_WEBHOOK_EVENT_TTL_SECONDS })

/**
 * Factory function to get EsgWebhookEvent model attached to the shared
 * connection. MUST be called after `connectToMongo()` has been initialized.
 */
export async function getEsgWebhookEventModel(): Promise<Model<EsgWebhookEventDocument>> {
  const mongoose = await connectToMongo('greenpulse')
  return (
    mongoose.models.EsgWebhookEvent ||
    mongoose.model<EsgWebhookEventDocument>('EsgWebhookEvent', esgWebhookEventSchema)
  )
}

/**
 * Eagerly build the `EsgWebhookEvent` indexes (the unique `eventKey`
 * index) so idempotency is guaranteed from the very first webhook after boot.
 *
 * Mongoose builds schema indexes lazily and asynchronously after the model
 * is first used. `connectToMongo` does NOT enable a synchronous `autoIndex`
 * barrier, so on a fresh deploy the unique index may not exist yet when the
 * first webhooks arrive. In that race window two deliveries of the same
 * `eventKey` can BOTH `insertOne` successfully — the duplicate-key guard in
 * {@link claimEsgWebhookEvent} silently no-ops and the side-effect fires
 * twice.
 *
 * Calling `createIndexes()` at boot — AFTER `connectToMongo` resolves and
 * BEFORE the HTTP listener accepts traffic (wired via the `bootApi`
 * `onReady` hook) — closes that race deterministically.
 *
 * Idempotent: re-running at boot is a no-op when the index already exists.
 */
export async function ensureEsgWebhookEventIndexes(): Promise<void> {
  const EsgWebhookEvent = await getEsgWebhookEventModel()
  try {
    await EsgWebhookEvent.createIndexes()
    logger.info('[EsgWebhookEvent] Indexes ensured (unique eventKey ready for webhook idempotency)')
  } catch (err) {
    if (isIndexOptionsConflictError(err)) {
      logger.error(
        '[EsgWebhookEvent] Index options conflict while ensuring indexes — ' +
          'an out-of-band index with diverging options exists. Idempotency may ' +
          'be degraded; review the EsgWebhookEvent collection indexes.',
        err instanceof Error ? err.message : String(err)
      )
      return
    }
    throw err
  }
}

/**
 * MongoDB duplicate-key error code. Surfaced when two webhook deliveries race
 * to claim the same `eventKey` — exactly the case idempotency must absorb.
 */
const MONGO_DUPLICATE_KEY_CODE = 11000

/**
 * MongoDB "index options conflict" error code (`IndexOptionsConflict`). Thrown
 * by `createIndexes()` only when an index with the SAME name already exists but
 * with different options.
 */
const INDEX_OPTIONS_CONFLICT_CODE = 85

/**
 * Outcome of a claim attempt (hacker A1b.5 — E4 at-least-once).
 *
 *   • `'fresh'`        — first delivery of this `eventKey`, run side-effects.
 *   • `'recovered'`    — a previous claim crashed mid-dispatch (its
 *                        `claimedAt` exceeded the stale window). The caller
 *                        has now re-claimed and SHOULD run side-effects.
 *                        Side-effects MUST be idempotent at the business
 *                        layer (upserts, dedup'd emails by job_id).
 *   • `'duplicate'`    — a previous delivery already finished
 *                        (`processedAt` set). Caller acks 200 with no work.
 *   • `'in-flight'`    — another worker is currently processing this event
 *                        (claim is fresh, not stale). Caller returns 503 so
 *                        the upstream retries after the in-flight worker
 *                        finishes or the stale window opens.
 */
export type EsgWebhookClaimOutcome = 'fresh' | 'recovered' | 'duplicate' | 'in-flight'

/**
 * Atomically claim a webhook event for processing.
 *
 * Pattern (at-least-once, hacker A1b.5 — E4):
 *   1. `insertOne({ eventKey, claimedAt: now, processedAt: null })` — atomic.
 *   2. On E11000 (duplicate `eventKey`) → inspect the existing row:
 *      • `processedAt` set            → `'duplicate'` (already finished).
 *      • `processedAt` null AND
 *        `claimedAt` < now − stale-window → take over: `'recovered'`.
 *      • `processedAt` null AND
 *        `claimedAt` recent           → `'in-flight'` (let upstream retry).
 *
 * The caller MUST call {@link markEsgWebhookEventProcessed} on dispatch
 * success and {@link releaseEsgWebhookEventClaim} on dispatch failure —
 * the two together guarantee at-least-once delivery semantics.
 *
 * @param eventKey - Stable idempotency token (job_id or SHA-256 of raw bytes).
 * @param meta - Optional event type snapshot for observability.
 * @returns Discriminated outcome — the caller maps to dispatch / ack / 503.
 */
export async function claimEsgWebhookEvent(
  eventKey: string,
  meta?: { eventType?: string }
): Promise<EsgWebhookClaimOutcome> {
  const EsgWebhookEvent = await getEsgWebhookEventModel()
  const now = new Date()
  try {
    await EsgWebhookEvent.create({
      eventKey,
      eventType: meta?.eventType,
      claimedAt: now,
      processedAt: null,
    })
    return 'fresh'
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err
    // E11000 — read the existing row to discriminate between
    // already-processed (idempotent ack) and in-flight / crashed.
    const existing = await EsgWebhookEvent.findOne({ eventKey }).lean().exec()
    if (!existing) {
      // Race: the existing row was purged (TTL) between the insert attempt
      // and the read. Treat as fresh — retry the insert once.
      try {
        await EsgWebhookEvent.create({
          eventKey,
          eventType: meta?.eventType,
          claimedAt: now,
          processedAt: null,
        })
        return 'fresh'
      } catch (retryErr) {
        if (isDuplicateKeyError(retryErr)) {
          // Genuine concurrent insert with another worker — treat as in-flight.
          return 'in-flight'
        }
        throw retryErr
      }
    }
    if (existing.processedAt !== null && existing.processedAt !== undefined) {
      return 'duplicate'
    }
    // processedAt is null — either in-flight or crashed mid-dispatch.
    const claimedAtMs = existing.claimedAt instanceof Date ? existing.claimedAt.getTime() : 0
    const ageMs = now.getTime() - claimedAtMs
    if (ageMs < ESG_WEBHOOK_STALE_CLAIM_MS) {
      return 'in-flight'
    }
    // Stale claim — previous worker crashed. Take over by refreshing
    // `claimedAt` (compare-and-swap on the still-stale claimedAt to avoid
    // racing two recovery workers).
    const recovered = await EsgWebhookEvent.updateOne(
      { eventKey, claimedAt: existing.claimedAt, processedAt: null },
      { $set: { claimedAt: now, eventType: meta?.eventType ?? existing.eventType } }
    ).exec()
    if (recovered.modifiedCount === 1) {
      return 'recovered'
    }
    // Another recovery worker beat us to it.
    return 'in-flight'
  }
}

/**
 * Mark a claimed webhook event as fully processed.
 *
 * Called by the handler AFTER all dispatch side-effects succeed — closes the
 * at-least-once window so future replays of the same `eventKey` short-circuit
 * to `'duplicate'`.
 *
 * @param eventKey - The same key that was passed to {@link claimEsgWebhookEvent}.
 */
export async function markEsgWebhookEventProcessed(eventKey: string): Promise<void> {
  const EsgWebhookEvent = await getEsgWebhookEventModel()
  await EsgWebhookEvent.updateOne({ eventKey }, { $set: { processedAt: new Date() } }).exec()
}

/**
 * Release a claim when dispatch fails (hacker A1b.5 — E4).
 *
 * On dispatch error the caller invokes this to "expire" the claim so the
 * next upstream retry can reclaim immediately, rather than waiting for the
 * stale window to elapse. Implemented by stamping `claimedAt` far enough in
 * the past that the next {@link claimEsgWebhookEvent} sees a stale claim
 * and returns `'recovered'`.
 *
 * Note: we do NOT delete the row — deleting would lose the audit trail and
 * race with TTL purge. Stamping `claimedAt = epoch` is forward-safe.
 */
export async function releaseEsgWebhookEventClaim(eventKey: string): Promise<void> {
  const EsgWebhookEvent = await getEsgWebhookEventModel()
  await EsgWebhookEvent.updateOne(
    { eventKey, processedAt: null },
    { $set: { claimedAt: new Date(0) } }
  ).exec()
}

/**
 * Narrow an unknown error to a MongoDB duplicate-key (E11000) error.
 *
 * @internal
 */
function isDuplicateKeyError(err: unknown): boolean {
  return readErrorCode(err) === MONGO_DUPLICATE_KEY_CODE
}

/**
 * Narrow an unknown error to a MongoDB `IndexOptionsConflict` (code 85).
 *
 * @internal
 */
function isIndexOptionsConflictError(err: unknown): boolean {
  return readErrorCode(err) === INDEX_OPTIONS_CONFLICT_CODE
}

/**
 * Read the numeric `.code` off an unknown MongoDB error without `any`.
 *
 * @internal
 */
function readErrorCode(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const code = (err as { code?: unknown }).code
  return typeof code === 'number' ? code : undefined
}
