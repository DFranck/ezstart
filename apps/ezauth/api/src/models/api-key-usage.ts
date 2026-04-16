import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

export interface ApiKeyUsageDocument extends Document {
  apiKeyId: string
  userId: string
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

// Compound unique index for daily buckets
apiKeyUsageSchema.index({ apiKeyId: 1, date: 1 }, { unique: true })

// Index for querying by user (usage summary)
apiKeyUsageSchema.index({ userId: 1, date: 1 })

// TTL index: auto-delete records after 90 days
apiKeyUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

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
