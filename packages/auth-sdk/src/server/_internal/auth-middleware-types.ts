/**
 * Public type surface for {@link createAuthMiddleware} + the shared
 * `noopLogger` default.
 *
 * Extracted from `auth-middleware.ts` (Wave D Lot 4) so the factory file stays
 * under the size budget. Every type here is re-exported from
 * `auth-middleware.ts` (and thence the `@ezstart/auth-sdk/server` barrel), so
 * the public import path is byte-for-byte unchanged. The `_internal/` verifier
 * modules import these types directly from this sibling to avoid a type-only
 * import cycle through `auth-middleware.ts`.
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @module @ezstart/auth-sdk/server/_internal/auth-middleware-types
 */

import './server-only.js'

import type { RequestHandler } from 'express'

/**
 * Scope levels accepted on the API key path. Mirrors the modern values from
 * the `ApiKey.scope` field. Legacy values `'live'` / `'test'` are demoted to
 * `'user'` for ranking purposes so a publishable key never satisfies
 * `'admin'`.
 */
export type AuthMiddlewareScope = 'admin' | 'user' | 'readonly'

/**
 * Minimum logger surface — opt-in. Defaults to a silent no-op so the SDK
 * does not pull `@ezstart/logger` (or any logger) at runtime.
 */
export interface AuthMiddlewareLogger {
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

/** Silent no-op logger — the default when the consumer wires none. */
export const noopLogger: AuthMiddlewareLogger = {
  warn: () => {},
  error: () => {},
}

/**
 * Minimal structural shape for the AuthUser document required by the JWT
 * + API-key verifiers. Any Mongoose lean document that satisfies this shape
 * works — the SDK never imports a concrete model.
 */
export interface AuthUserDoc {
  _id: { toString(): string } | string
  email: string
  username: string
  firstName?: string
  lastName?: string
  avatar?: string
  isVerified?: boolean
  apps?: string[]
  globalRoles?: string[]
  appRoles?: Map<string, string[]> | Record<string, string[]>
  permissions?: string[]
  features?: string[]
  organizationId?: string
  managedBy?: string
  /** Soft-delete marker — when set, the user is treated as missing. */
  deletedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Minimal structural shape for the ApiKey document required by the API-key
 * verifier.
 */
export interface ApiKeyDoc {
  _id: { toString(): string }
  key: string
  userId: string
  status: string
  scope?: string | null
  appName?: string | null
  /** `publishable` | `secret` — set on modern keys, absent on legacy `ezk_*`. */
  type?: string | null
  expiresAt?: Date | string | null
  quotaMonthly?: number | null
}

/**
 * Minimal Mongoose-shaped Model surface. The SDK only calls a tiny subset
 * (`findOne(...).lean()`, `findById(...).select(...).lean()`, `updateOne`,
 * `aggregate`) so we type those four methods loosely to avoid pulling
 * `mongoose` as a peer dep.
 */
export interface AuthMiddlewareModel<TDoc> {
  findOne(filter: Record<string, unknown>): { lean(): Promise<TDoc | null> }
  findById(id: string): {
    select(projection: string): { lean(): Promise<TDoc | null> }
  }
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<unknown>
  aggregate<TResult>(pipeline: unknown[]): Promise<TResult[]>
}

/**
 * Configuration accepted by {@link createAuthMiddleware}.
 *
 * Required fields establish identity (appName) + crypto material (jwtSecret)
 * + the three Mongoose model getters. Everything else has a sensible default
 * so a fresh API can be wired in literally five lines.
 */
export interface AuthMiddlewareConfig {
  /** App slug — currently unused at runtime, reserved for diagnostics + future tenant scoping. */
  appName: string
  /** HMAC secret used to verify the access JWT (HS256). */
  jwtSecret: string
  /** Cookie name carrying the access JWT. Defaults to `'ez_access'`. */
  cookieName?: string
  /**
   * Expected JWT audience (RFC 7519 §4.1.3) for this consumer API. The
   * middleware rejects any token whose `aud` claim does NOT contain this
   * value with HTTP 401 + `code: 'INVALID_TOKEN'`.
   *
   * Set this to the slug of the consumer app (e.g. `'ezpay'`, `'ezbill'`,
   * `'green-pulse'`) to prevent **cross-API token reuse**: when `JWT_SECRET`
   * is shared across all @ezstart APIs (current production deployment), an
   * ezauth-issued token without `aud` enforcement would be bit-for-bit
   * valid at every other API too. Stamping `aud` on the sign side and
   * enforcing it here is the second factor that blocks privilege
   * escalation when one API's secret leaks.
   *
   * `jsonwebtoken` accepts either a string or an array on verify; passing
   * a string is the typical (and strictest) usage — the token MUST list
   * that exact string in its `aud` array.
   *
   * Defaults to `undefined` (no enforcement) for backwards compatibility
   * with services that haven't migrated yet. **Strongly recommended** for
   * any service that trusts a shared `JWT_SECRET`.
   *
   * @example { audience: 'ezpay' }
   */
  audience?: string | string[]
  /**
   * Expected JWT issuer (RFC 7519 §4.1.1). Defaults to `undefined` (no
   * enforcement). Set to `'ezauth'` to require that the token was minted
   * by the @ezstart identity provider — pairs naturally with `audience`
   * above to form the full HAC-CRIT-2 defence.
   *
   * @example { issuer: 'ezauth' }
   */
  issuer?: string | string[]
  /** Factory returning the ApiKey Mongoose model (must be ready). */
  getApiKeyModel: () => Promise<AuthMiddlewareModel<ApiKeyDoc>>
  /** Factory returning the ApiKeyUsage Mongoose model (must be ready). */
  getApiKeyUsageModel: () => Promise<AuthMiddlewareModel<unknown>>
  /** Factory returning the AuthUser Mongoose model (must be ready). */
  getAuthUserModel: () => Promise<AuthMiddlewareModel<AuthUserDoc>>
  /**
   * Hash the raw API key string. Defaults to the SHA-256 implementation
   * shipped by `@ezstart/auth-sdk/core` so test data and prod data match
   * across services without configuration.
   */
  hashApiKey?: (raw: string) => string
  /**
   * Detect whether the raw key uses the legacy `ezk_*` prefix (warned in
   * logs but accepted until the deprecation deadline). Defaults to the SDK
   * core helper.
   */
  detectKeyFormat?: (raw: string) => { isLegacy: boolean } | null
  /**
   * Fired (best-effort) every time the middleware attaches a user to the
   * request — JWT path **and** API-key path. Typical use: throttled presence
   * tracking. Errors are swallowed.
   */
  onUserAttached?: (userId: string) => void
  /** Optional structured logger. Defaults to a silent no-op. */
  logger?: AuthMiddlewareLogger
  /**
   * Override the monthly usage cache TTL (milliseconds). Defaults to 5 minutes.
   * Tests can drop this to zero to bypass caching entirely.
   */
  usageCacheTtlMs?: number
}

/**
 * Per-route options passed to the middleware returned by the factory.
 */
export interface AuthMiddlewareOptions {
  /**
   * Minimum API key scope. Defaults to `'user'`. Use `'admin'` for admin
   * routes. JWT users are NOT scope-checked here — chain a downstream
   * `requireRole` / `requireAdmin` middleware when needed.
   */
  requireKeyScope?: AuthMiddlewareScope
}

/**
 * The middleware returned by the factory after the `(opts)` call. Same shape
 * as Express `RequestHandler` but typed explicitly so consumers can store it.
 */
export type AuthMiddleware = RequestHandler
