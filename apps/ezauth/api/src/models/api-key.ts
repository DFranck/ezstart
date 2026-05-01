import { connectToMongo } from '@ezstart/api-core'
import { createApiKeySchema } from '@ezstart/auth-sdk/server'
import type { Document, Model, Types } from 'mongoose'

// NOTE: this model intentionally does NOT use `testModeScopePlugin` even
// though it carries `isTestMode` — the schema factory documents the
// chicken-and-egg rationale (the auth middleware looks up keys to discover
// the request mode, so scoping queries by mode before the lookup is
// impossible).

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
  /**
   * Multi-tenant Application reference (P6+). When present, `appName` is a
   * denormalised cache of `application.slug` for backwards-compatible SDK
   * responses. Optional on legacy docs created before the P6 migration —
   * the migration script `migrate-keys-to-applications.ts` backfills it.
   */
  applicationId?: Types.ObjectId
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
  /**
   * Stripe-pattern test/live partition. Mirrors the value of `env` —
   * `env: 'test'` ↔ `isTestMode: true`, `env: 'live'` ↔ `isTestMode: false`.
   *
   * Kept as a denormalised flag so `testModeScopePlugin` can scope queries
   * by a single boolean without having to express `{ env: 'test' }` (which
   * would be ambiguous on legacy `ezk_*` keys that don't carry an `env`).
   *
   * Writes MUST set this in lockstep with `env` — see
   * `apps/ezauth/api/src/routes/keys/create.ts`.
   */
  isTestMode: boolean
}

// Build the schema via the @ezstart/auth-sdk/server factory. Ezauth keeps the
// legacy scope values for read-compat and stores `applicationId` as an
// ObjectId (same DB as `Application`).
const apiKeySchema = createApiKeySchema({
  scopeEnum: ['admin', 'user', 'readonly', 'test', 'live'],
  applicationIdType: 'objectId',
  requireApplicationId: false,
  requireType: false,
  requireEnv: false,
  includeAppName: true,
  appNameDefault: '*',
})

/**
 * Factory function to get ApiKey model attached to shared connection.
 * MUST be called after connectToMongo() has been initialized.
 */
export async function getApiKeyModel(): Promise<Model<ApiKeyDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.ApiKey || mongoose.model<ApiKeyDocument>('ApiKey', apiKeySchema)
}
