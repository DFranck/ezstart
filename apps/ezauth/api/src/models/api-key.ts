import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

/**
 * Key type — derived from modern prefix (`ez_pk_*` vs `ez_sk_*`).
 * Optional on document for backwards compatibility with legacy `ezk_*` keys.
 */
export type ApiKeyType = 'publishable' | 'secret'

/**
 * Key environment — derived from modern prefix (`*_live_*` vs `*_test_*`).
 * Optional on document for backwards compatibility.
 */
export type ApiKeyEnv = 'live' | 'test'

/**
 * Permission scope — metadata only, NOT in the key prefix.
 *
 * Modern values: `admin`, `user`, `readonly`.
 * Legacy values kept in enum for read-compat with existing `ezk_*` docs:
 * `test`, `live` (were used as scope==env in the old design).
 */
export type ApiKeyScope = 'admin' | 'user' | 'readonly' | 'test' | 'live'

export interface ApiKeyDocument extends Document {
  key: string
  keyPrefix: string
  name: string
  userId: string
  appName: string
  /** Key type — set on modern keys, absent on legacy docs. */
  type?: ApiKeyType
  /** Key environment — set on modern keys, absent on legacy docs. */
  env?: ApiKeyEnv
  scope: ApiKeyScope
  permissions: string[]
  status: 'active' | 'revoked'
  lastUsedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  revokedAt: Date | null
  quotaMonthly: number | null
  /**
   * Provenance marker — either a userId string or a system tag
   * (e.g. `'system-seed'` for the bootstrap self-key).
   * Optional for backwards compatibility with pre-provenance docs.
   */
  createdBy?: string
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
    type: {
      type: String,
      enum: ['publishable', 'secret'],
      required: false,
    },
    env: {
      type: String,
      enum: ['live', 'test'],
      required: false,
    },
    scope: {
      // Modern values first; legacy 'test' / 'live' retained for read-compat with existing docs.
      type: String,
      enum: ['admin', 'user', 'readonly', 'test', 'live'],
      default: 'user',
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
    createdBy: {
      type: String,
      required: false,
      index: true,
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
