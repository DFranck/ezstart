/**
 * `createApiKeySchema` — reusable Mongoose schema factory for ApiKey docs.
 *
 * Originally duplicated 90% verbatim across `apps/ezauth/api/src/models/api-key.ts`
 * (~190 LOC) and `apps/ezpay/api/src/models/api-key.ts` (~180 LOC). This factory
 * encodes the canonical shape once and exposes the per-service divergences as
 * options so each app keeps its own `getModel()` factory wired to its own
 * `connectToMongo(<dbName>)` (see `mongodb.md` — one DB per process API).
 *
 * Divergence points (handled via `CreateApiKeySchemaOptions`):
 *
 * 1. **Scope enum** — ezauth keeps the legacy `'test' | 'live'` values for
 *    read-compat with old `ezk_*` documents, while ezpay enforces strict
 *    `'admin' | 'user' | 'readonly'` values for new keys only.
 * 2. **`applicationId` requirement** — ezpay REQUIRES `applicationId`
 *    (cross-DB string ref to the ezauth Application). Ezauth keeps it
 *    optional for backwards compatibility with pre-Application keys.
 * 3. **`applicationId` storage type** — ezauth stores it as a Mongoose
 *    `ObjectId` (with `ref: 'Application'`), ezpay stores it as a plain
 *    `String` (no populate, no cross-DB join).
 * 4. **Extra fields** — ezpay adds `appSlug` (denormalised cache of
 *    `Application.slug`) which is not present on ezauth keys.
 *
 * The factory does NOT attach `testModeScopePlugin` — see comment in the
 * generated schema for the chicken-and-egg rationale (the auth middleware
 * looks up keys to discover the request mode, so scoping queries by mode
 * before the lookup is impossible).
 *
 * **Server-only.** Do NOT import from client code — Mongoose is a server-only
 * dependency. We rely on the project's own `_internal/server-only.js` guard
 * (a Node-safe runtime check on `process.versions.node`) rather than the
 * `server-only` npm package, which throws at module load outside Next.js'
 * `react-server` condition and would crash raw-Node API services at boot.
 * The `mongoose` peer dep additionally prevents accidental client bundling.
 *
 * @example ezauth (legacy enum + optional applicationId as ObjectId)
 * ```ts
 * import { createApiKeySchema } from '@ezstart/auth-sdk/server'
 * import { connectToMongo, testModeScopePlugin } from '@ezstart/api-core'
 *
 * const schema = createApiKeySchema({
 *   scopeEnum: ['admin', 'user', 'readonly', 'test', 'live'],
 *   applicationIdType: 'objectId',
 *   appNameDefault: '*',
 * })
 *
 * export async function getApiKeyModel() {
 *   const mongoose = await connectToMongo('ezauth')
 *   return mongoose.models.ApiKey || mongoose.model('ApiKey', schema)
 * }
 * ```
 *
 * @example ezpay (strict enum + required applicationId as string + appSlug)
 * ```ts
 * const schema = createApiKeySchema({
 *   scopeEnum: ['admin', 'user', 'readonly'],
 *   applicationIdType: 'string',
 *   requireApplicationId: true,
 *   requireType: true,
 *   requireEnv: true,
 *   includeAppName: false,
 *   extraFields: {
 *     appSlug: { type: String, required: true, trim: true, lowercase: true },
 *   },
 * })
 * ```
 *
 * @module @ezstart/auth-sdk/server/api-key-schema
 */

import './_internal/server-only.js'

import { Schema, type SchemaDefinition } from 'mongoose'

/**
 * Options for the `createApiKeySchema` factory.
 */
export interface CreateApiKeySchemaOptions {
  /**
   * Allowed `scope` enum values. Defaults to the strict modern set
   * `['admin', 'user', 'readonly']`. Pass `['admin', 'user', 'readonly', 'test', 'live']`
   * to keep read-compat with legacy `ezk_*` docs (ezauth pattern).
   */
  scopeEnum?: readonly string[]

  /**
   * Storage type for the `applicationId` field.
   * - `'objectId'` — Mongoose `ObjectId` with `ref: 'Application'` (ezauth pattern,
   *   same DB).
   * - `'string'` — plain string (ezpay pattern, cross-DB ref, no populate).
   *
   * Defaults to `'objectId'`.
   */
  applicationIdType?: 'objectId' | 'string'

  /**
   * If `true`, `applicationId` is `required: true`. Defaults to `false`
   * (ezauth pattern — keys created before the Application migration may not
   * carry an `applicationId`).
   */
  requireApplicationId?: boolean

  /**
   * If `true`, `type` (`'publishable' | 'secret'`) is `required: true`.
   * Defaults to `false` (ezauth pattern — legacy `ezk_*` keys do not carry
   * a `type` field).
   */
  requireType?: boolean

  /**
   * If `true`, `env` (`'live' | 'test'`) is `required: true`. Defaults to
   * `false` (ezauth pattern — legacy `ezk_*` keys do not carry an `env`).
   */
  requireEnv?: boolean

  /**
   * If `true`, includes the `appName` field (denormalised slug — ezauth
   * pattern). Defaults to `true`. Pass `false` to omit (ezpay pattern, which
   * uses `appSlug` instead via `extraFields`).
   */
  includeAppName?: boolean

  /**
   * Default value for `appName` when `includeAppName: true`. Defaults to
   * `'*'` (ezauth pattern — wildcard app scope for legacy keys).
   */
  appNameDefault?: string

  /**
   * Extra schema fields specific to the consumer (e.g. ezpay's `appSlug`).
   * Merged into the schema definition before construction.
   */
  extraFields?: SchemaDefinition
}

/**
 * Default scope enum (modern strict set).
 */
const DEFAULT_SCOPE_ENUM = ['admin', 'user', 'readonly'] as const

/**
 * Build a Mongoose schema for an ApiKey document.
 *
 * The schema includes the canonical fields shared by ezauth and ezpay:
 * `key`, `keyPrefix`, `name`, `userId`, `applicationId`, `type`, `env`,
 * `scope`, `permissions`, `status`, `lastUsedAt`, `expiresAt`, `revokedAt`,
 * `quotaMonthly`, `createdBy`, `isTestMode`. It also wires the standard
 * indexes (`userId+status`, `applicationId+status`) and uses
 * `bufferCommands: false` per `mongodb.md`.
 *
 * Returns a fresh `Schema` instance — the caller attaches it to a model via
 * `mongoose.model('ApiKey', schema)` after `connectToMongo()` is initialised.
 */
export function createApiKeySchema(opts: CreateApiKeySchemaOptions = {}): Schema {
  const {
    scopeEnum = DEFAULT_SCOPE_ENUM,
    applicationIdType = 'objectId',
    requireApplicationId = false,
    requireType = false,
    requireEnv = false,
    includeAppName = true,
    appNameDefault = '*',
    extraFields,
  } = opts

  const definition: SchemaDefinition = {
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
    applicationId:
      applicationIdType === 'objectId'
        ? {
            type: Schema.Types.ObjectId,
            ref: 'Application',
            required: requireApplicationId,
            index: true,
          }
        : {
            type: String,
            required: requireApplicationId,
            index: true,
          },
    type: {
      type: String,
      enum: ['publishable', 'secret'],
      required: requireType,
    },
    env: {
      type: String,
      enum: ['live', 'test'],
      required: requireEnv,
    },
    scope: {
      type: String,
      enum: [...scopeEnum],
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
  }

  if (includeAppName) {
    definition.appName = {
      type: String,
      default: appNameDefault,
    }
  }

  if (extraFields) {
    Object.assign(definition, extraFields)
  }

  const schema = new Schema(definition, {
    timestamps: true,
    collection: 'api_keys',
    bufferCommands: false,
  })

  // Compound index for user-scoped lookups (list active keys per user).
  schema.index({ userId: 1, status: 1 })
  // Compound index for Application-scoped lookups (list active keys per tenant).
  schema.index({ applicationId: 1, status: 1 })

  // IMPORTANT: API keys are intentionally NOT auto-scoped by `isTestMode`.
  // The auth middleware (`validateApiKey`) MUST be able to look up a key by
  // its hash regardless of the current request's mode — the very purpose of
  // the lookup is to discover the mode. Auto-scoping here would create a
  // chicken-and-egg problem (no `req.derivedMode` until the key is found,
  // but no key can be found without `req.derivedMode`). Mode scoping happens
  // downstream on the data tables (Application, AuditLog, ...).
  //
  // We still keep the `isTestMode` field for forward-compat (analytics by
  // mode, admin dashboards) but skip the plugin attachment.

  return schema
}
