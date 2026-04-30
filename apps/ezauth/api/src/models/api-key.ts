import { connectToMongo } from '@ezstart/api-core'
import { Schema, Types, type Document, type Model } from 'mongoose'

// NOTE: this model intentionally does NOT use `testModeScopePlugin` even
// though it carries `isTestMode` — see the comment near the schema indexes
// for the chicken-and-egg rationale.

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
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: false,
      index: true,
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

// Compound index for user lookups
apiKeySchema.index({ userId: 1, status: 1 })
// Compound index for Application scope lookups (list active keys of an app)
apiKeySchema.index({ applicationId: 1, status: 1 })

// IMPORTANT: API keys are intentionally NOT auto-scoped by `isTestMode`.
// The auth middleware (`validateApiKey`) MUST be able to look up a key by its
// hash regardless of the current request's mode — the very purpose of the
// lookup is to discover the mode. Auto-scoping here would create a chicken-
// and-egg problem (no `req.derivedMode` until the key is found, but no key
// can be found without `req.derivedMode`). Mode scoping happens downstream
// on the data tables (Application, AuditLog, ...).
//
// We still keep the `isTestMode` field for forward-compat (analytics by mode,
// admin dashboards) but skip the plugin attachment.

/**
 * Factory function to get ApiKey model attached to shared connection.
 * MUST be called after connectToMongo() has been initialized.
 */
export async function getApiKeyModel(): Promise<Model<ApiKeyDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.ApiKey || mongoose.model<ApiKeyDocument>('ApiKey', apiKeySchema)
}
