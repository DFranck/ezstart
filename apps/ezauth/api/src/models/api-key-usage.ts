import { connectToMongo } from '@ezstart/api-core'
import { createApiKeyUsageSchema } from '@ezstart/auth-sdk/server'
import type { Document, Model } from 'mongoose'

export interface ApiKeyUsageDocument extends Document {
  apiKeyId: string
  userId: string
  date: string
  requestCount: number
  endpoints: Map<string, number>
  createdAt: Date
}

const apiKeyUsageSchema = createApiKeyUsageSchema()

/**
 * Factory function to get ApiKeyUsage model attached to shared connection.
 * MUST be called after connectToMongo() has been initialized.
 */
export async function getApiKeyUsageModel(): Promise<Model<ApiKeyUsageDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return (
    mongoose.models.ApiKeyUsage ||
    mongoose.model<ApiKeyUsageDocument>('ApiKeyUsage', apiKeyUsageSchema)
  )
}
