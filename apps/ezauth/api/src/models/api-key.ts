import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

export type ApiKeyScope = 'test' | 'live' | 'admin'

export interface ApiKeyDocument extends Document {
  key: string
  keyPrefix: string
  name: string
  userId: string
  appName: string
  scope: ApiKeyScope
  permissions: string[]
  status: 'active' | 'revoked'
  lastUsedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  revokedAt: Date | null
  quotaMonthly: number | null
}

const apiKeySchema = new Schema<ApiKeyDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    appName: {
      type: String,
      default: '*',
    },
    scope: {
      type: String,
      enum: ['test', 'live', 'admin'],
      default: 'live',
    },
    permissions: {
      type: [String],
      default: ['*'],
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    quotaMonthly: {
      type: Number,
      default: 1000,
    },
  },
  {
    timestamps: true,
    collection: 'api_keys',
    bufferCommands: false,
  }
)

// Compound index for user lookups
apiKeySchema.index({ userId: 1, status: 1 })

/**
 * Factory function to get ApiKey model attached to shared connection.
 * MUST be called after connectToMongo() has been initialized.
 */
export async function getApiKeyModel(): Promise<Model<ApiKeyDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.ApiKey || mongoose.model<ApiKeyDocument>('ApiKey', apiKeySchema)
}
