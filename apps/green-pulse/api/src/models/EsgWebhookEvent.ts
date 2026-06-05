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

export interface EsgWebhookEventDocument extends Document {
  /**
   * Stable idempotency key for the delivery. Either the upstream-supplied
   * `job_id` (preferred, when the payload carries one) or a SHA-256 hex
   * digest of the raw signed bytes (fallback, when no natural id exists).
   */
  eventKey: string
  /** ESG event type snapshot (informational / debugging). */
  eventType?: string
  /** When the event was first claimed and processed. */
  processedAt: Date
  createdAt: Date
  updatedAt: Date
}

const esgWebhookEventSchema = new Schema<EsgWebhookEventDocument>(
  {
    eventKey: { type: String, required: true },
    eventType: { type: String },
    processedAt: { type: Date, default: Date.now },
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
 * Atomically claim a webhook event for processing.
 *
 * Returns `true` if THIS call is the first to see `eventKey` (caller should
 * proceed to run the event's side-effects). Returns `false` if the event was
 * already claimed by a previous (or concurrent) delivery — the caller must
 * no-op and acknowledge with 200.
 *
 * The claim is a single atomic `insertOne`: MongoDB enforces the unique index
 * server-side, so two concurrent deliveries cannot both win. On duplicate the
 * insert throws E11000, which we translate to `false`. Any other error
 * propagates so the handler can decide (typically: don't ack, let the upstream
 * retry).
 *
 * @param eventKey - Stable idempotency token (job_id or SHA-256 of raw bytes).
 * @param meta - Optional event type snapshot for observability.
 * @returns `true` when first-seen (process now), `false` when already processed.
 */
export async function claimEsgWebhookEvent(
  eventKey: string,
  meta?: { eventType?: string }
): Promise<boolean> {
  const EsgWebhookEvent = await getEsgWebhookEventModel()
  try {
    await EsgWebhookEvent.create({
      eventKey,
      eventType: meta?.eventType,
      processedAt: new Date(),
    })
    return true
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return false
    }
    throw err
  }
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
