import { connectToMongo, ttlPlugin } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { Schema, Model, Document } from 'mongoose'

/**
 * Webhook idempotency ledger.
 *
 * Every inbound provider webhook (Stripe `event.id`) is recorded here exactly
 * once. The handler attempts to claim an event id BEFORE running any
 * side-effect; a duplicate claim (E11000 on the unique `eventId` index) means
 * the event was already processed — the handler then no-ops and returns 200.
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
  /** Provider event id (Stripe `event.id`, e.g. `evt_1AbC...`). Unique. */
  eventId: string
  /** Provider that emitted the event. */
  provider: 'stripe' | 'paypal'
  /** Stripe event type snapshot (informational / debugging). */
  eventType?: string
  /** When the event was first claimed and processed. */
  processedAt: Date
  createdAt: Date
  updatedAt: Date
}

const webhookEventSchema = new Schema<WebhookEventDocument>(
  {
    eventId: { type: String, required: true, unique: true },
    provider: { type: String, enum: ['stripe', 'paypal'], default: 'stripe' },
    eventType: { type: String },
    processedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    bufferCommands: false, // fail-fast, never queue when disconnected
  }
)

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
 * barrier, so on a fresh deploy the unique `eventId` index may not exist yet
 * when the first webhooks arrive. In that window two deliveries of the same
 * `event.id` can BOTH `insertOne` successfully — the duplicate-key guard in
 * {@link claimWebhookEvent} silently no-ops and the side-effect (promo burn,
 * subscription renewal credit) fires twice → double-credit.
 *
 * Calling `createIndexes()` at boot — AFTER `connectToMongo` resolves and
 * BEFORE the HTTP listener accepts traffic (wired in `index.ts` via the
 * `bootApi` `onReady` hook) — closes that race deterministically: the unique
 * index provably exists before any webhook can be claimed.
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
  try {
    await WebhookEvent.createIndexes()
    logger.info('[WebhookEvent] Indexes ensured (unique eventId ready for idempotency)')
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
 * @param eventId - Provider event id (Stripe `event.id`).
 * @param meta - Optional snapshot fields (provider, eventType) for debugging.
 * @returns `true` when first-seen (process now), `false` when already processed.
 */
export async function claimWebhookEvent(
  eventId: string,
  meta?: { provider?: 'stripe' | 'paypal'; eventType?: string }
): Promise<boolean> {
  const WebhookEvent = await getWebhookEventModel()
  try {
    await WebhookEvent.create({
      eventId,
      provider: meta?.provider ?? 'stripe',
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
 * Read the numeric `.code` off an unknown MongoDB error without `any`.
 *
 * @internal
 */
function readErrorCode(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const code = (err as { code?: unknown }).code
  return typeof code === 'number' ? code : undefined
}
