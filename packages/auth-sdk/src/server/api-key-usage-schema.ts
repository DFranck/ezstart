/**
 * `createApiKeyUsageSchema` — reusable Mongoose schema factory for ApiKeyUsage docs.
 *
 * One document per `{apiKeyId, date}` daily bucket. Fire-and-forget incremented
 * by the api-key middleware on each authenticated request. TTL index prunes
 * buckets older than 90 days so the collection stays bounded.
 *
 * Originally duplicated near-verbatim across `apps/ezauth/api/src/models/api-key-usage.ts`
 * (~63 LOC) and `apps/ezpay/api/src/models/api-key-usage.ts` (~78 LOC). The
 * ezpay variant added a descending `{ apiKeyId, date: -1 }` index for monthly
 * aggregations — that index is included by default in this factory because it
 * is strictly an improvement (read-only addition, no data shape change).
 *
 * **Server-only.** Do NOT import from client code — Mongoose is a server-only
 * dependency. We intentionally do NOT add `import 'server-only'` here because
 * Express APIs (the primary consumer) run under vitest's node env where the
 * `server-only` shim throws regardless of context. The `mongoose` peer dep
 * already prevents accidental client bundling.
 *
 * @example
 * ```ts
 * import { createApiKeyUsageSchema } from '@ezstart/auth-sdk/server'
 * import { connectToMongo } from '@ezstart/api-core'
 *
 * const schema = createApiKeyUsageSchema()
 *
 * export async function getApiKeyUsageModel() {
 *   const mongoose = await connectToMongo('ezauth')
 *   return mongoose.models.ApiKeyUsage || mongoose.model('ApiKeyUsage', schema)
 * }
 * ```
 *
 * @module @ezstart/auth-sdk/server/api-key-usage-schema
 */

import { Schema } from 'mongoose'

/**
 * Build a Mongoose schema for an ApiKeyUsage daily bucket document.
 *
 * Fields: `apiKeyId`, `userId`, `date` (yyyy-mm-dd string), `requestCount`
 * (default 0), `endpoints` (Map<string, number> default empty), `createdAt`
 * (auto, no `updatedAt`).
 *
 * Indexes:
 * - `{ apiKeyId: 1, date: 1 }` unique — prevents duplicate daily buckets and
 *   serves as the primary lookup for upserts.
 * - `{ apiKeyId: 1, date: -1 }` — fast descending range scans for
 *   monthly/daily aggregations.
 * - `{ userId: 1, date: 1 }` — per-user usage summary.
 * - `{ createdAt: 1 }` TTL 90 days — auto-prune old buckets.
 */
export function createApiKeyUsageSchema(): Schema {
  const schema = new Schema(
    {
      apiKeyId: {
        type: String,
        required: true,
      },
      userId: {
        type: String,
        required: true,
      },
      date: {
        type: String,
        required: true,
      },
      requestCount: {
        type: Number,
        default: 0,
      },
      endpoints: {
        type: Map,
        of: Number,
        default: () => new Map(),
      },
    },
    {
      timestamps: { createdAt: true, updatedAt: false },
      collection: 'api_key_usage',
      bufferCommands: false,
    }
  )

  // One row per (key, date) — the middleware upserts against this index.
  schema.index({ apiKeyId: 1, date: 1 }, { unique: true })

  // Descending date index for monthly/daily aggregations (ezpay improvement,
  // promoted to default — strictly additive, no shape change).
  schema.index({ apiKeyId: 1, date: -1 })

  // Per-user index for aggregated usage summaries.
  schema.index({ userId: 1, date: 1 })

  // TTL: drop buckets older than 90 days.
  schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

  return schema
}
