/**
 * EZPay ApiKey model — mirror of ezauth but scoped to EZPay DB.
 *
 * Each ezpay API key is tied to an Application (source-of-truth lives in EZAuth DB).
 * `applicationId` references `applications._id` in the ezauth database as a UUID
 * string — no cross-DB join is performed; validation happens at key creation
 * time via the ezauth-client S2S service. `appSlug` is a denormalised cache of
 * `application.slug` for logs, audits, and fast filtering without a lookup.
 *
 * @module apps/ezpay/api/src/models/api-key
 */

import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

/**
 * Key type — derived from modern prefix (`ez_pk_*` vs `ez_sk_*`).
 */
export type ApiKeyType = 'publishable' | 'secret'

/**
 * Key environment — derived from modern prefix (`*_live_*` vs `*_test_*`).
 */
export type ApiKeyEnv = 'live' | 'test'

/**
 * Permission scope — metadata only, NOT in the key prefix.
 * Modern values: `admin`, `user`, `readonly`.
 */
export type ApiKeyScope = 'admin' | 'user' | 'readonly'

export interface ApiKeyDocument extends Document {
  key: string
  keyPrefix: string
  name: string
  /** Stringified `auth_users._id` — cached from ezauth JWT at key creation. */
  userId: string
  /**
   * Required ref to `applications._id` in the ezauth DB. Stored as a string
   * (UUID/ObjectId hex) — cross-DB, no populate.
   */
  applicationId: string
  /** Denormalised `application.slug` cache — kept in sync on rotate. */
  appSlug: string
  type: ApiKeyType
  env: ApiKeyEnv
  scope: ApiKeyScope
  permissions: string[]
  status: 'active' | 'revoked'
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  quotaMonthly: number | null
  /**
   * Provenance marker — either a userId string or a system tag
   * (e.g. `'system-seed'` for Phase G bootstrap).
   */
  createdBy?: string
  /**
   * Stripe-pattern test/live partition. Mirror of `env` —
   * `env: 'test'` ↔ `isTestMode: true`, `env: 'live'` ↔ `isTestMode: false`.
   *
   * Kept as a denormalised flag for analytics / cross-model joins. The auth
   * middleware itself does NOT scope key lookups by `isTestMode` (chicken-
   * and-egg: the lookup is what discovers the mode).
   */
  isTestMode: boolean
  createdAt: Date
  updatedAt: Date
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
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    appSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ['publishable', 'secret'],
      required: true,
    },
    env: {
      type: String,
      enum: ['live', 'test'],
      required: true,
    },
    scope: {
      type: String,
      enum: ['admin', 'user', 'readonly'],
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
    isTestMode: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'api_keys',
    bufferCommands: false,
  }
)

// Compound index for user-scoped lookups (list active keys per user).
apiKeySchema.index({ userId: 1, status: 1 })
// Compound index for Application-scoped lookups (list active keys per tenant).
apiKeySchema.index({ applicationId: 1, status: 1 })

/**
 * Factory function to get the EZPay ApiKey model attached to the shared
 * `ezpay` mongo connection. MUST be called after `connectToMongo('ezpay')`
 * has been initialised.
 *
 * @example
 * const ApiKey = await getApiKeyModel()
 * const key = await ApiKey.findOne({ key: hashedKey })
 */
export async function getApiKeyModel(): Promise<Model<ApiKeyDocument>> {
  const mongoose = await connectToMongo('ezpay')
  return mongoose.models.ApiKey || mongoose.model<ApiKeyDocument>('ApiKey', apiKeySchema)
}
