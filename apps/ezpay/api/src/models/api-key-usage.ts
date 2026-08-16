/**
 * EZPay ApiKeyUsage model — daily buckets for per-key request counters.
 *
 * Mirror of ezauth's ApiKeyUsage but scoped to the `ezpay` database. One
 * document per `{apiKeyId, date}` tuple. Incremented fire-and-forget by the
 * api-key middleware. TTL index prunes buckets older than 90 days so the
 * collection stays bounded.
 *
 * The actual schema shape is built via `createApiKeyUsageSchema` from
 * `@ezstart/auth-sdk/server` — this module only declares the typed Document
 * interface and the per-app `getApiKeyUsageModel()` factory wired to the
 * `connectToMongo('ezpay')` singleton.
 *
 * @module apps/ezpay/api/src/models/api-key-usage
 */

import { connectToMongo } from '@ezstart/api-core'
import { createApiKeyUsageSchema } from '@ezstart/auth-sdk/server'
import type { Document, Model } from 'mongoose'

export interface ApiKeyUsageDocument extends Document {
  apiKeyId: string
  userId: string
  /** `yyyy-mm-dd` bucket key. */
  date: string
  requestCount: number
  endpoints: Map<string, number>
  createdAt: Date
}

const apiKeyUsageSchema = createApiKeyUsageSchema()

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
