/**
 * API Key — wire contracts.
 *
 * Canonical wire shapes for the EZAuth-issued API keys (`ez_pk_*` / `ez_sk_*`).
 * Lives in `@ezstart/api-contracts` so any service that issues/verifies keys
 * (EZAuth, EZPay, future) and any client SDK reads from a single source of
 * truth.
 *
 * Storage shape (Mongoose) and crypto primitives (`generateRawApiKey`,
 * `hashApiKey`, `detectKeyFormat`) stay in `@ezstart/auth-sdk` since they
 * are framework / runtime specific. Only the **wire** shapes — what the
 * server returns to the client over HTTP — live here.
 *
 * @see standard-saas-keys.md §1-3 (key naming, type/env split)
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Discriminators — type / env / scope
// ---------------------------------------------------------------------------

/**
 * API key type — determines whether the key is safe to expose client-side.
 *
 * - `publishable` — safe in frontend / browser (prefix `ez_pk_*`)
 * - `secret` — server-only, never exposed (prefix `ez_sk_*`)
 *
 * The type is encoded in the key prefix; this enum mirrors it for typed
 * runtime parsing of API responses.
 */
export const ApiKeyTypeSchema = z.enum(['publishable', 'secret']).describe('API key type')

/** TypeScript union for {@link ApiKeyTypeSchema}. */
export type ApiKeyType = z.infer<typeof ApiKeyTypeSchema>

/**
 * API key environment — separates production keys from sandbox / test keys.
 *
 * Encoded in the key prefix (`ez_pk_live_*` vs `ez_pk_test_*`). Server-side
 * middleware uses this to scope DB queries to live vs test data.
 *
 * @see standard-saas-data.md §4 (test mode / live mode separation)
 */
export const ApiKeyEnvSchema = z.enum(['live', 'test']).describe('API key environment')

/** TypeScript union for {@link ApiKeyEnvSchema}. */
export type ApiKeyEnv = z.infer<typeof ApiKeyEnvSchema>

/**
 * API key permission scope — metadata only, NEVER embedded in the prefix.
 *
 * Modern values (preferred for new keys):
 * - `admin` — full read/write on the parent Application
 * - `user` — restricted to standard end-user operations
 * - `readonly` — read-only access (audit, analytics)
 *
 * Legacy values (kept for read-compat with pre-P2a keys stored in DB —
 * the old design aliased scope on top of env):
 * - `test` — legacy alias for `env: 'test'`
 * - `live` — legacy alias for `env: 'live'`
 *
 * New code should rely on the `env` field for live/test partitioning and
 * use `scope` purely for permission level (`admin` / `user` / `readonly`).
 * The legacy values remain in the enum because the wire still returns them
 * for documents created before the type/env split.
 *
 * Stripe-style: permissions are stored as metadata so prefixes stay
 * type+env only (no `ez_pk_admin_*` style).
 */
export const ApiKeyScopeSchema = z
  .enum(['admin', 'user', 'readonly', 'test', 'live'])
  .describe('API key permission scope')

/** TypeScript union for {@link ApiKeyScopeSchema}. */
export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>

// ---------------------------------------------------------------------------
// Wire shapes
// ---------------------------------------------------------------------------

/**
 * An API key as returned by the list endpoint.
 *
 * The full key is never sent here — only `keyPrefix` (the display-safe
 * prefix, e.g. `ez_pk_live_a1b2c3`) is exposed. The full secret is shown
 * exactly once at create / rotate time via {@link CreateApiKeyResponseSchema}.
 *
 * @example
 * ```ts
 * const item: ApiKeyItem = ApiKeyItemSchema.parse({
 *   id: 'key_abc',
 *   keyPrefix: 'ez_pk_live_a1b2c3',
 *   name: 'Production API',
 *   appName: 'myapp',
 *   applicationId: 'app_xyz',
 *   scope: 'user',
 *   permissions: [],
 *   status: 'active',
 *   lastUsedAt: null,
 *   expiresAt: null,
 *   createdAt: '2026-01-01T00:00:00.000Z',
 *   revokedAt: null,
 *   quotaMonthly: null,
 *   usageThisMonth: 0,
 *   type: 'publishable',
 *   env: 'live',
 * })
 * ```
 */
export const ApiKeyItemSchema = z
  .object({
    id: z.string(),
    keyPrefix: z.string().describe('Display-safe prefix (e.g. `ez_pk_live_a1b2c3`)'),
    name: z.string(),
    appName: z.string(),
    /**
     * Application this key is scoped to (P6+). The wire emits `null` (not
     * `undefined`) for pre-P6 keys not yet backfilled onto an Application
     * (see `migrate-keys-to-applications.ts`). Accepts `undefined` for
     * backwards compatibility with legacy fixtures.
     */
    applicationId: z.string().nullable().optional(),
    /**
     * Permission scope. Accepts both modern (`admin`/`user`/`readonly`) and
     * legacy (`test`/`live`) values for read-compat — see
     * {@link ApiKeyScopeSchema} for the migration rationale.
     */
    scope: ApiKeyScopeSchema,
    permissions: z.array(z.string()),
    status: z.enum(['active', 'revoked']),
    lastUsedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
    revokedAt: z.string().nullable(),
    quotaMonthly: z.number().nullable(),
    usageThisMonth: z.number(),
    /**
     * Key type — present (string) on modern keys, `null` on legacy `ezk_*`
     * keys that predate the type/env split. The wire emits a `null` sentinel
     * rather than omitting the field; `undefined` is accepted for legacy
     * fixture compatibility.
     */
    type: ApiKeyTypeSchema.nullable().optional(),
    /**
     * Key environment — present (string) on modern keys, `null` on legacy
     * `ezk_*` keys. The wire emits a `null` sentinel rather than omitting
     * the field; `undefined` is accepted for legacy fixture compatibility.
     */
    env: ApiKeyEnvSchema.nullable().optional(),
  })
  .describe('API key item returned by the list endpoint')

/** TypeScript type for {@link ApiKeyItemSchema}. */
export type ApiKeyItem = z.infer<typeof ApiKeyItemSchema>

/**
 * Usage stats for a single API key.
 *
 * @example
 * ```ts
 * const stats: ApiKeyUsageResponse = await apiCall(`/api/keys/${id}/usage`)
 * console.log(stats.currentMonth.requestCount)
 * ```
 */
export const ApiKeyUsageResponseSchema = z
  .object({
    currentMonth: z.object({
      requestCount: z.number(),
      topEndpoints: z.array(
        z.object({
          endpoint: z.string(),
          count: z.number(),
        })
      ),
    }),
    daily: z.array(
      z.object({
        date: z.string(),
        requestCount: z.number(),
      })
    ),
    quota: z.object({
      limit: z.number().nullable(),
      used: z.number(),
      remaining: z.number().nullable(),
    }),
  })
  .describe('Usage stats for a single API key')

/** TypeScript type for {@link ApiKeyUsageResponseSchema}. */
export type ApiKeyUsageResponse = z.infer<typeof ApiKeyUsageResponseSchema>

/**
 * Response from create / rotate key endpoints.
 *
 * Contains the FULL raw key (`key` field) — must be shown to the user
 * once and never persisted server-side beyond that single render.
 *
 * @example
 * ```ts
 * const res: CreateApiKeyResponse = await apiCall('/api/keys', {
 *   method: 'POST',
 *   body: { name: 'New key', type: 'publishable', env: 'live', expiresAt: null },
 * })
 * // res.key is the only place the raw secret is exposed — copy it now.
 * ```
 */
export const CreateApiKeyResponseSchema = z
  .object({
    id: z.string(),
    key: z.string().describe('Raw secret key, shown ONCE — never persisted client-side'),
    keyPrefix: z.string(),
    name: z.string(),
    /** Application this key was scoped to (P6+). */
    applicationId: z.string().optional(),
    /** Key type (optional, present on new keys created after P2a). */
    type: ApiKeyTypeSchema.optional(),
    /** Key environment (optional, present on new keys created after P2a). */
    env: ApiKeyEnvSchema.optional(),
    /** Permission scope (optional, present on new keys created after P2a). */
    scope: ApiKeyScopeSchema.optional(),
  })
  .describe('Response from create / rotate key endpoints')

/** TypeScript type for {@link CreateApiKeyResponseSchema}. */
export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>

/**
 * Body for the create-key mutation.
 *
 * Either `appName` (legacy) OR `applicationId` (P6+) must be provided.
 * New callers should pass `applicationId`.
 *
 * @example
 * ```ts
 * const body: CreateApiKeyRequest = {
 *   name: 'Production publishable key',
 *   applicationId: 'app_abc',
 *   type: 'publishable',
 *   env: 'live',
 *   scope: 'user',
 *   expiresAt: null,
 * }
 * ```
 */
export const CreateApiKeyRequestSchema = z
  .object({
    name: z.string(),
    /**
     * App scope (legacy — pre-P6). New callers should pass `applicationId`
     * instead; `appName` is kept for backwards compatibility and will be
     * removed in a future major.
     * @deprecated Use `applicationId`.
     */
    appName: z.string().optional(),
    /** Application this key will belong to (P6+). Preferred over `appName`. */
    applicationId: z.string().optional(),
    /** Key type: publishable (client-side safe) or secret (server-only). */
    type: ApiKeyTypeSchema.optional(),
    /** Environment: live (production) or test (sandbox). */
    env: ApiKeyEnvSchema.optional(),
    /** Permission scope for the new key. */
    scope: ApiKeyScopeSchema.optional(),
    expiresAt: z.string().nullable(),
  })
  .describe('Body for POST /api/keys')

/** TypeScript type for {@link CreateApiKeyRequestSchema}. */
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>
