/**
 * EZPay ApiKeyUsage model — daily buckets for per-key request counters.
 *
 * Mirror of ezauth's ApiKeyUsage but scoped to the `ezpay` database. One
 * document per `{apiKeyId, date}` tuple. Incremented fire-and-forget by the
 * api-key middleware. TTL index prunes buckets older than 90 days so the
 * collection stays bounded.
 *
 * @module apps/ezpay/api/src/models/api-key-usage
 */

import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

export interface ApiKeyUsageDocument extends Document {
  apiKeyId: string
  userId: string
  /** `yyyy-mm-dd` bucket key. */
  date: string
  requestCount: number
  endpoints: Map<string, number>
  createdAt: Date
}

const apiKeyUsageSchema = new Schema<ApiKeyUsageDocument>(
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
apiKeyUsageSchema.index({ apiKeyId: 1, date: 1 }, { unique: true })

// Descending date index for monthly/daily aggregations.
apiKeyUsageSchema.index({ apiKeyId: 1, date: -1 })

// Per-user index for aggregated usage summaries.
apiKeyUsageSchema.index({ userId: 1, date: 1 })

// TTL: drop buckets older than 90 days.
apiKeyUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

/**
 * Factory function to get the EZPay ApiKeyUsage model attached to the shared
 * `ezpay` mongo connection.
 */
export async function getApiKeyUsageModel(): Promise<Model<ApiKeyUsageDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return (
    mongoose.models.ApiKeyUsage ||
    mongoose.model<ApiKeyUsageDocument>('ApiKeyUsage', apiKeyUsageSchema)
  )
}
