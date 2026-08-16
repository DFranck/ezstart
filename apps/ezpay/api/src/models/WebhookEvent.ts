import { connectToMongo, ttlPlugin } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { Schema, Model, Document } from 'mongoose'

/**
 * Webhook idempotency ledger.
 *
 * Every inbound provider webhook (Stripe `event.id`) is recorded here exactly
 * once PER MODE. The handler attempts to claim an event id BEFORE running any
 * side-effect; a duplicate claim (E11000 on the compound unique
 * `{ eventId, isTestMode }` index) means the event was already processed for
 * that mode — the handler then no-ops and returns 200.
 *
 * ## Why dedup is mode-scoped (Wave E MED-2)
 *
 * Stripe issues test-mode and live-mode event ids from independent namespaces.
 * A globally-unique `eventId` index would let a test event id (theoretically)
 * short-circuit a live delivery sharing the same string, dropping a real
 * side-effect. Scoping uniqueness by `{ eventId, isTestMode }` keeps the two
 * partitions fully isolated — exactly the Stripe test/live separation pattern
 * (`standard-saas-data.md` §4).
 *
 * This guards against:
 *   - Stripe redelivery (retries on non-2xx, or operator "Resend")
 *   - At-least-once delivery semantics double-firing promo burns / renewals
 *
 * Documents auto-expire after 30 days via a TTL index — long enough to cover
 * Stripe's redelivery window (~3 days for retries, plus manual resends) while
 * keeping the collection bounded.
 *
 * @module apps/ezpay/api/src/models/WebhookEvent
 */

/** TTL for processed webhook event records (30 days, in seconds). */
export const WEBHOOK_EVENT_TTL_SECONDS = 30 * 24 * 60 * 60

export interface WebhookEventDocument extends Document {
  /**
   * Provider event id (Stripe `event.id`, e.g. `evt_1AbC...`). Unique PER MODE
   * (compound with {@link isTestMode}), not globally.
   */
  eventId: string
  /** Provider that emitted the event. */
  provider: 'stripe' | 'paypal'
  /** Stripe event type snapshot (informational / debugging). */
  eventType?: string
  /**
   * Stripe-pattern test/live partition derived from the verified event's
   * `livemode` field (`isTestMode = !event.livemode`). Part of the compound
   * uniqueness key so test + live event ids never collide.
   */
  isTestMode: boolean
  /** When the event was first claimed and processed. */
  processedAt: Date
  createdAt: Date
  updatedAt: Date
}

const webhookEventSchema = new Schema<WebhookEventDocument>(
  {
    // No field-level `unique`/`index` here — the compound
    // `{ eventId, isTestMode }` unique index below both enforces dedup AND
    // serves eventId-prefix lookups, so a separate single-field index would be
    // redundant (and would shadow the compound one in index introspection).
    eventId: { type: String, required: true },
    provider: { type: String, enum: ['stripe', 'paypal'], default: 'stripe' },
    eventType: { type: String },
    // Default false (live) so legacy rows without the field read as live.
    isTestMode: { type: Boolean, required: true, default: false },
    processedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    bufferCommands: false, // fail-fast, never queue when disconnected
  }
)

// Mode-scoped idempotency: a Stripe event id is unique WITHIN a mode, not
// across modes (test + live event ids come from independent namespaces).
webhookEventSchema.index({ eventId: 1, isTestMode: 1 }, { unique: true })

// Auto-purge processed events after the redelivery window closes.
webhookEventSchema.plugin(ttlPlugin, { ttlSeconds: WEBHOOK_EVENT_TTL_SECONDS })

/**
 * Factory function to get WebhookEvent model attached to the shared connection.
 * MUST be called after connectToMongo() has been initialized.
 */
export async function getWebhookEventModel(): Promise<Model<WebhookEventDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return (
    mongoose.models.WebhookEvent ||
    mongoose.model<WebhookEventDocument>('WebhookEvent', webhookEventSchema)
  )
}

/**
 * Eagerly build the `WebhookEvent` indexes (notably the UNIQUE `eventId`
 * index) so idempotency is guaranteed from the very first webhook after boot.
 *
 * ### Why this is mandatory (Wave E Lot 1.5B — hacker MED-1)
 *
 * Mongoose builds schema indexes lazily and asynchronously after the model is
 * first used. `connectToMongo` does NOT enable a synchronous `autoIndex`
 * barrier, so on a fresh deploy the unique `{ eventId, isTestMode }` index may
 * not exist yet when the first webhooks arrive. In that window two deliveries
 * of the same `event.id` can BOTH `insertOne` successfully — the duplicate-key
 * guard in {@link claimWebhookEvent} silently no-ops and the side-effect
 * (promo burn, subscription renewal credit) fires twice → double-credit.
 *
 * Calling `createIndexes()` at boot — AFTER `connectToMongo` resolves and
 * BEFORE the HTTP listener accepts traffic (wired in `index.ts` via the
 * `bootApi` `onReady` hook) — closes that race deterministically: the unique
 * index provably exists before any webhook can be claimed.
 *
 * ### Legacy index migration (Wave E MED-2)
 *
 * Earlier revisions used a single-field unique index `eventId_1`. The dedup is
 * now mode-scoped (`{ eventId, isTestMode }`), so the legacy index would
 * (a) be redundant and (b) wrongly reject a test event sharing an id with a
 * live event. We drop `eventId_1` if present before building the compound
 * index. The drop is best-effort — a missing index is a benign no-op.
 *
 * Idempotent: re-running at boot is a no-op when the index already exists.
 * MongoDB only errors when the SAME index name is requested with conflicting
 * options ({@link INDEX_OPTIONS_CONFLICT_CODE}); a benign "already exists" is
 * not an error. We log and swallow the conflict case rather than crash boot,
 * because an out-of-band index drift should not take the whole API down — it
 * is surfaced as an error log for the operator instead.
 */
export async function ensureWebhookEventIndexes(): Promise<void> {
  const WebhookEvent = await getWebhookEventModel()

  // Drop the legacy single-field unique index (`eventId_1`) before building
  // the mode-scoped compound index. Best-effort: a fresh DB never has it.
  try {
    await WebhookEvent.collection.dropIndex('eventId_1')
    logger.info('[WebhookEvent] Dropped legacy unique index eventId_1 (migrated to compound)')
  } catch (err) {
    // `IndexNotFound` (code 27) is the expected case on a fresh DB or a
    // collection already migrated — swallow it. Anything else is logged but
    // not fatal (we still attempt the compound build below).
    if (!isIndexNotFoundError(err)) {
      logger.warn(
        '[WebhookEvent] dropIndex(eventId_1) failed (continuing):',
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  try {
    await WebhookEvent.createIndexes()
    logger.info(
      '[WebhookEvent] Indexes ensured (unique {eventId,isTestMode} ready for idempotency)'
    )
  } catch (err) {
    if (isIndexOptionsConflictError(err)) {
      // Pre-existing index with diverging options — do not crash boot. The
      // unique eventId index already exists; surface the drift for the operator.
      logger.error(
        '[WebhookEvent] Index options conflict while ensuring indexes — ' +
          'an out-of-band index with diverging options exists. Idempotency may ' +
          'be degraded; review the WebhookEvent collection indexes.',
        err instanceof Error ? err.message : String(err)
      )
      return
    }
    throw err
  }
}

/**
 * MongoDB duplicate-key error code. Surfaced when two webhook deliveries race
 * to claim the same `event.id` — exactly the case idempotency must absorb.
 */
const MONGO_DUPLICATE_KEY_CODE = 11000

/**
 * MongoDB "index options conflict" error code (`IndexOptionsConflict`). Thrown
 * by `createIndexes()` only when an index with the SAME name already exists but
 * with different options. A plain re-build of an identical index is a no-op and
 * does NOT raise this — so swallowing it keeps the boot step idempotent.
 */
const INDEX_OPTIONS_CONFLICT_CODE = 85

/**
 * MongoDB `IndexNotFound` error code. Raised by `dropIndex()` when the named
 * index does not exist (fresh DB or already-migrated collection) — a benign
 * no-op for the legacy-index drop.
 */
const INDEX_NOT_FOUND_CODE = 27

/**
 * Atomically claim a webhook event id for processing.
 *
 * Returns `true` if THIS call is the first to see `eventId` (the caller should
 * proceed to run the event's side-effects). Returns `false` if the event was
 * already claimed by a previous (or concurrent) delivery — the caller must
 * no-op and acknowledge with 200.
 *
 * The claim is a single atomic `insertOne`: MongoDB enforces the unique index
 * server-side, so two concurrent deliveries cannot both win. On duplicate the
 * insert throws E11000, which we translate to `false`. Any other error
 * propagates so the handler can decide (typically: don't ack, let Stripe
 * retry).
 *
 * The claim is scoped by mode: the uniqueness key is `{ eventId, isTestMode }`,
 * so a test event and a live event sharing an id are independent claims.
 *
 * @param eventId - Provider event id (Stripe `event.id`).
 * @param meta - Snapshot fields (provider, eventType) + the partition mode.
 *   `isTestMode` defaults to `false` (live) when omitted, matching the schema
 *   default — callers SHOULD pass the verified `!event.livemode`.
 * @returns `true` when first-seen (process now), `false` when already processed.
 */
export async function claimWebhookEvent(
  eventId: string,
  meta?: { provider?: 'stripe' | 'paypal'; eventType?: string; isTestMode?: boolean }
): Promise<boolean> {
  const WebhookEvent = await getWebhookEventModel()
  try {
    await WebhookEvent.create({
      eventId,
      provider: meta?.provider ?? 'stripe',
      eventType: meta?.eventType,
      isTestMode: meta?.isTestMode ?? false,
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
 * Narrow an unknown error to a MongoDB duplicate-key (E11000) error without
 * resorting to `any`/`as unknown`.
 *
 * @internal
 */
function isDuplicateKeyError(err: unknown): boolean {
  return readErrorCode(err) === MONGO_DUPLICATE_KEY_CODE
}

/**
 * Narrow an unknown error to a MongoDB `IndexOptionsConflict` (code 85) error.
 *
 * @internal
 */
function isIndexOptionsConflictError(err: unknown): boolean {
  return readErrorCode(err) === INDEX_OPTIONS_CONFLICT_CODE
}

/**
 * Narrow an unknown error to a MongoDB `IndexNotFound` (code 27) error —
 * raised when dropping an index that does not exist.
 *
 * @internal
 */
function isIndexNotFoundError(err: unknown): boolean {
  return readErrorCode(err) === INDEX_NOT_FOUND_CODE
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
