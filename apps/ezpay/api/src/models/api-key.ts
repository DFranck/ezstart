/**
 * EZPay ApiKey model — mirror of ezauth but scoped to EZPay DB.
 *
 * Each ezpay API key is tied to an Application (source-of-truth lives in EZAuth DB).
 * `applicationId` references `applications._id` in the ezauth database as a UUID
 * string — no cross-DB join is performed; validation happens at key creation
 * time via the ezauth-client S2S service. `appSlug` is a denormalised cache of
 * `application.slug` for logs, audits, and fast filtering without a lookup.
 *
 * The actual schema shape is built via `createApiKeySchema` from
 * `@ezstart/auth-sdk/server` — this module only declares the typed Document
 * interface and the per-app `getApiKeyModel()` factory wired to the
 * `connectToMongo('ezpay')` singleton.
 *
 * @module apps/ezpay/api/src/models/api-key
 */

import { connectToMongo } from '@ezstart/api-core'
import { createApiKeySchema } from '@ezstart/auth-sdk/server'
import type { Document, Model } from 'mongoose'

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

// Build the schema via the @ezstart/auth-sdk/server factory. Ezpay enforces
// the strict modern scope set, requires `applicationId` (cross-DB string ref),
// requires `type` + `env`, and adds the `appSlug` denormalised cache. It does
// NOT carry the `appName` field (replaced by `appSlug`).
const apiKeySchema = createApiKeySchema({
  scopeEnum: ['admin', 'user', 'readonly'],
  applicationIdType: 'string',
  requireApplicationId: true,
  requireType: true,
  requireEnv: true,
  includeAppName: false,
  extraFields: {
    appSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
})

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
