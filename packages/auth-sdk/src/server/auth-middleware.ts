/**
 * Drop-in unified auth middleware factory for any @ezstart-style API.
 *
 * Wires JWT (cookie / Bearer) **and** API key (`X-API-Key` /
 * `Authorization: ApiKey ...`) verification behind a single Express middleware
 * so admin / CRUD routes can accept BOTH dashboard sessions AND
 * server-to-server API key calls without 300+ lines of glue per service.
 *
 * Usage (5 lines per API):
 *
 * ```ts
 * import { createAuthMiddleware } from '@ezstart/auth-sdk/server'
 *
 * const authJwtOrKey = createAuthMiddleware({
 *   appName: 'ezauth',
 *   jwtSecret: JWT_SECRET,
 *   cookieName: ACCESS_COOKIE_NAME,
 *   getApiKeyModel,
 *   getApiKeyUsageModel,
 *   getAuthUserModel,
 *   onUserAttached: updatePresenceByUserId,
 * })
 *
 * router.get('/applications', authJwtOrKey({ requireKeyScope: 'admin' }), controller)
 * ```
 *
 * Architecture
 * ------------
 * - **Agnostic** — no import from `@ezstart/api-core`, `@ezstart/logger` or
 *   any specific Mongoose model type. Models are passed via factory functions
 *   typed against minimal structural interfaces (see below). The SDK ships
 *   the same skeleton pattern as `createUnifiedAuthMiddleware` from
 *   `@ezstart/api-core` (intentional duplication — the two layers serve
 *   different audiences: api-core is a generic skeleton for any verifier
 *   pair, auth-sdk is the opinionated factory for ezauth-shaped services).
 * - **Reusable across services** — ezauth, ezpay, and any future API can
 *   wire the same factory with its own models + secret. Zero per-API glue.
 * - **Backward-compatible** — `req.user`, `req.userId`, `req.apiKeyId`,
 *   `req.apiKeyUserId`, `req.apiKeyScope`, `req.apiKeyAppName` are all
 *   stamped exactly like the previous per-app implementations so downstream
 *   middleware (e.g. `attachDerivedScope`) keeps working unchanged.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies.
 *
 * @module @ezstart/auth-sdk/server/auth-middleware
 */

import './_internal/server-only.js'

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import jwt from 'jsonwebtoken'
import {
  hashApiKey as defaultHashApiKey,
  detectKeyFormat as defaultDetectKeyFormat,
} from '../core/api-keys-crypto.js'
import type { JWTPayload } from '../core/types.js'

// ---------------------------------------------------------------------------
// Public types — re-exported from the barrel
// ---------------------------------------------------------------------------

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

const noopLogger: AuthMiddlewareLogger = {
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

// ---------------------------------------------------------------------------
// Internal — envelope (mirrors `@ezstart/api-core` `sendError` shape)
// ---------------------------------------------------------------------------

interface ErrorOptions {
  code?: string
  details?: unknown
  retryAfter?: number
}

function sendErrorEnvelope(
  res: Response,
  message: string,
  status: number,
  opts: ErrorOptions = {}
): void {
  const error: { message: string; code?: string; details?: unknown; retryAfter?: number } = {
    message,
  }
  if (opts.code !== undefined) error.code = opts.code
  if (opts.details !== undefined) error.details = opts.details
  if (opts.retryAfter !== undefined) error.retryAfter = opts.retryAfter
  if (!res.headersSent) {
    res.status(status).json({ success: false, error })
  }
}

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

function mapToRecord(
  map: Map<string, string[]> | Record<string, string[]> | undefined
): Record<string, string[]> {
  if (!map) return {}
  if (map instanceof Map) {
    return Object.fromEntries(map)
  }
  return map as Record<string, string[]>
}

function getCurrentMonthPrefix(): string {
  return new Date().toISOString().slice(0, 7)
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getSecondsUntilNextMonth(): number {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000)
}

/**
 * Map the persisted scope (modern + legacy values) onto the canonical
 * `AuthMiddlewareScope`. Legacy `'live'` / `'test'` are demoted to `'user'`
 * so a publishable key can never satisfy `requireKeyScope: 'admin'`.
 */
function normaliseScope(stored: string | undefined | null): AuthMiddlewareScope {
  if (stored === 'admin') return 'admin'
  if (stored === 'readonly') return 'readonly'
  // 'user', 'live', 'test', undefined → user-equivalent.
  return 'user'
}

const SCOPE_RANK: Record<AuthMiddlewareScope, number> = {
  readonly: 0,
  user: 1,
  admin: 2,
}

function meetsScope(actual: AuthMiddlewareScope, required: AuthMiddlewareScope): boolean {
  return SCOPE_RANK[actual] >= SCOPE_RANK[required]
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build a drop-in unified auth middleware factory bound to a specific API's
 * config (JWT secret, cookie name, models, presence hook, ...).
 *
 * The returned function takes per-route options (`requireKeyScope`) and
 * yields an Express `RequestHandler` ready to register on any route.
 *
 * @example
 * ```ts
 * import { createAuthMiddleware } from '@ezstart/auth-sdk/server'
 * import { logger } from '@ezstart/logger/server'
 * import { JWT_SECRET } from '../config/env.js'
 * import { ACCESS_COOKIE_NAME } from '../config/cookie.js'
 * import { getApiKeyModel } from '../models/api-key.js'
 * import { getApiKeyUsageModel } from '../models/api-key-usage.js'
 * import { getAuthUserModel } from '../models/auth-user.js'
 * import { updatePresenceByUserId } from '../services/presence.service.js'
 *
 * export const authJwtOrKey = createAuthMiddleware({
 *   appName: 'ezauth',
 *   jwtSecret: JWT_SECRET,
 *   cookieName: ACCESS_COOKIE_NAME,
 *   getApiKeyModel,
 *   getApiKeyUsageModel,
 *   getAuthUserModel,
 *   onUserAttached: updatePresenceByUserId,
 *   logger,
 * })
 * ```
 */
export function createAuthMiddleware(
  config: AuthMiddlewareConfig
): (opts?: AuthMiddlewareOptions) => AuthMiddleware {
  const cookieName = config.cookieName ?? 'ez_access'
  const hash = config.hashApiKey ?? defaultHashApiKey
  const detectFormat = config.detectKeyFormat ?? defaultDetectKeyFormat
  const log = config.logger ?? noopLogger
  const cacheTtlMs = config.usageCacheTtlMs ?? 5 * 60 * 1000

  // HAC-CRIT-2 — normalise the iss/aud options into the tuple shape
  // `jsonwebtoken` expects. Bare `string[]` is rejected at the type level
  // because the lib insists on `[string, ...string[]]`. Empty arrays
  // degrade to "no enforcement" (undefined) to keep the back-compat path.
  const verifyAudience: jwt.VerifyOptions['audience'] | undefined =
    config.audience === undefined
      ? undefined
      : Array.isArray(config.audience)
        ? config.audience.length === 0
          ? undefined
          : ([config.audience[0], ...config.audience.slice(1)] as [string, ...string[]])
        : config.audience

  const verifyIssuer: jwt.VerifyOptions['issuer'] | undefined =
    config.issuer === undefined
      ? undefined
      : Array.isArray(config.issuer)
        ? config.issuer.length === 0
          ? undefined
          : ([config.issuer[0], ...config.issuer.slice(1)] as [string, ...string[]])
        : config.issuer

  // Per-factory monthly quota cache. Each instance has its own cache so
  // multiple factories (rare) don't share state. Tests can pass
  // `usageCacheTtlMs: 0` to disable caching entirely.
  const usageCache = new Map<string, { total: number; expiry: number }>()

  // -------------------------------------------------------------------------
  // JWT verifier
  // -------------------------------------------------------------------------

  function extractJwtToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }
    const cookieToken = (req as unknown as { cookies?: Record<string, string> }).cookies?.[
      cookieName
    ]
    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      return cookieToken
    }
    return undefined
  }

  async function attachUserToRequest(req: Request, userId: string): Promise<boolean> {
    const AuthUser = await config.getAuthUserModel()
    const user = await AuthUser.findById(userId).select('-passwordHash').lean()
    if (!user) return false
    if (user.deletedAt) return false

    const resolvedUserId = typeof user._id === 'string' ? user._id : user._id.toString()
    ;(req as Request & { userId?: string }).userId = resolvedUserId
    ;(req as Request & { user?: unknown }).user = {
      _id: resolvedUserId,
      userId: resolvedUserId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isVerified: user.isVerified,
      apps: user.apps,
      globalRoles: user.globalRoles ?? [],
      appRoles: mapToRecord(user.appRoles),
      permissions: user.permissions ?? [],
      features: user.features ?? [],
      organizationId: user.organizationId,
      managedBy: user.managedBy,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
    if (config.onUserAttached) {
      try {
        config.onUserAttached(resolvedUserId)
      } catch {
        // presence hook is best-effort, never fail the request
      }
    }
    return true
  }

  type JwtResult = { ok: true } | { ok: false; responded: boolean } | null

  async function verifyJwt(req: Request, res: Response): Promise<JwtResult> {
    const token = extractJwtToken(req)
    if (!token) return null

    try {
      // HAC-CRIT-2 — enforce iss/aud when configured so a cross-API token
      // (or one forged outside the legitimate sign path) is rejected by
      // `jwt.verify` itself with `JsonWebTokenError`. Both options omitted
      // when undefined to keep back-compat behaviour for consumers that
      // haven't migrated.
      const payload = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'],
        ...(verifyIssuer !== undefined ? { issuer: verifyIssuer } : {}),
        ...(verifyAudience !== undefined ? { audience: verifyAudience } : {}),
      }) as unknown as JWTPayload

      const attached = await attachUserToRequest(req, payload.userId)
      if (!attached) {
        sendErrorEnvelope(res, 'User not found', 401, { code: 'USER_NOT_FOUND' })
        return { ok: false, responded: true }
      }
      return { ok: true }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        sendErrorEnvelope(res, 'Invalid token', 401, { code: 'INVALID_TOKEN' })
        return { ok: false, responded: true }
      }
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        sendErrorEnvelope(res, 'Token expired', 401, { code: 'TOKEN_EXPIRED' })
        return { ok: false, responded: true }
      }
      log.error('[auth-sdk] unified-auth JWT verifier error', error)
      sendErrorEnvelope(res, 'Authentication failed', 500, { code: 'AUTH_INTERNAL_ERROR' })
      return { ok: false, responded: true }
    }
  }

  // -------------------------------------------------------------------------
  // API key verifier
  // -------------------------------------------------------------------------

  function extractApiKeyHeader(req: Request): string | undefined {
    const xApiKey = req.headers['x-api-key']
    if (typeof xApiKey === 'string' && xApiKey.length > 0) {
      return xApiKey
    }
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7)
    }
    return undefined
  }

  async function getMonthlyUsage(apiKeyId: string): Promise<number> {
    const monthPrefix = getCurrentMonthPrefix()
    const cacheKey = `${apiKeyId}:${monthPrefix}`
    if (cacheTtlMs > 0) {
      const cached = usageCache.get(cacheKey)
      if (cached && cached.expiry > Date.now()) return cached.total
    }
    const ApiKeyUsage = await config.getApiKeyUsageModel()
    const result = await ApiKeyUsage.aggregate<{ total: number }>([
      { $match: { apiKeyId, date: { $regex: `^${monthPrefix}` } } },
      { $group: { _id: null, total: { $sum: '$requestCount' } } },
    ])
    const total = result[0]?.total ?? 0
    if (cacheTtlMs > 0) {
      usageCache.set(cacheKey, { total, expiry: Date.now() + cacheTtlMs })
    }
    return total
  }

  function incrementCachedUsage(apiKeyId: string): void {
    if (cacheTtlMs <= 0) return
    const monthPrefix = getCurrentMonthPrefix()
    const cached = usageCache.get(`${apiKeyId}:${monthPrefix}`)
    if (cached) cached.total += 1
  }

  type ApiKeyResult =
    | { ok: true; scope: AuthMiddlewareScope }
    | { ok: false; responded: boolean }
    | null

  async function verifyApiKey(req: Request, res: Response): Promise<ApiKeyResult> {
    const rawKey = extractApiKeyHeader(req)
    if (!rawKey) return null

    try {
      const format = detectFormat(rawKey)
      if (format?.isLegacy) {
        log.warn('[auth-sdk] legacy ezk_* key detected (unified-auth path)', {
          keyPrefix: rawKey.substring(0, 15),
        })
      }

      const hashedKey = hash(rawKey)
      const ApiKey = await config.getApiKeyModel()
      const apiKey = await ApiKey.findOne({ key: hashedKey }).lean()

      if (!apiKey) {
        sendErrorEnvelope(res, 'Invalid API key', 401, { code: 'INVALID_API_KEY' })
        return { ok: false, responded: true }
      }
      if (apiKey.status !== 'active') {
        sendErrorEnvelope(res, 'API key has been revoked', 401, { code: 'API_KEY_REVOKED' })
        return { ok: false, responded: true }
      }
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        sendErrorEnvelope(res, 'API key has expired', 401, { code: 'API_KEY_EXPIRED' })
        return { ok: false, responded: true }
      }

      const keyId = apiKey._id.toString()
      const quota = apiKey.quotaMonthly
      if (quota !== null && quota !== undefined) {
        const used = await getMonthlyUsage(keyId)
        if (used >= quota) {
          sendErrorEnvelope(res, 'Monthly quota exceeded', 429, {
            code: 'QUOTA_EXCEEDED',
            details: { quota, used },
            retryAfter: getSecondsUntilNextMonth(),
          })
          return { ok: false, responded: true }
        }
      }

      const attached = await attachUserToRequest(req, apiKey.userId)
      if (!attached) {
        sendErrorEnvelope(res, 'API key owner not found', 401, {
          code: 'API_KEY_OWNER_NOT_FOUND',
        })
        return { ok: false, responded: true }
      }

      // Stamp legacy fields for routes that haven't migrated to req.user yet.
      const reqAny = req as Request & {
        apiKeyId?: string
        apiKeyUserId?: string
        apiKeyScope?: string
        apiKeyAppName?: string
      }
      reqAny.apiKeyId = keyId
      reqAny.apiKeyUserId = apiKey.userId
      const storedScope = apiKey.scope
      reqAny.apiKeyScope = storedScope ?? 'live'
      reqAny.apiKeyAppName = apiKey.appName ?? '*'

      // Fire-and-forget bookkeeping.
      ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).catch(
        (err: unknown) => {
          log.warn('[auth-sdk] failed to update API key lastUsedAt', err)
        }
      )

      const today = getTodayDate()
      const sanitizedPath = req.path.replace(/[.$]/g, '_')
      void config
        .getApiKeyUsageModel()
        .then(ApiKeyUsage =>
          ApiKeyUsage.updateOne(
            { apiKeyId: keyId, date: today },
            {
              $inc: { requestCount: 1, [`endpoints.${sanitizedPath}`]: 1 },
              $setOnInsert: { userId: apiKey.userId },
            },
            { upsert: true }
          )
        )
        .then(() => {
          incrementCachedUsage(keyId)
        })
        .catch(() => {
          // Tracking is best-effort.
        })

      return { ok: true, scope: normaliseScope(storedScope) }
    } catch (error: unknown) {
      log.error('[auth-sdk] unified-auth API key verifier error', error)
      sendErrorEnvelope(res, 'API key authentication failed', 500, {
        code: 'AUTH_INTERNAL_ERROR',
      })
      return { ok: false, responded: true }
    }
  }

  // -------------------------------------------------------------------------
  // Skeleton — JWT first, API key fallback, scope policy. Mirrors the api-core
  // unified-auth runtime intentionally (same DX, same semantics) but inlined
  // here so the SDK does not depend on `@ezstart/api-core`.
  // -------------------------------------------------------------------------

  return function buildMiddleware(opts: AuthMiddlewareOptions = {}): AuthMiddleware {
    const requiredScope = opts.requireKeyScope ?? 'user'

    return (req: Request, res: Response, next: NextFunction): void => {
      void runUnified(req, res, next, requiredScope)
    }

    async function runUnified(
      req: Request,
      res: Response,
      next: NextFunction,
      requiredScope: AuthMiddlewareScope
    ): Promise<void> {
      // ---- 1. JWT first (dashboard sessions) ----
      let jwtResult: JwtResult = null
      try {
        jwtResult = await verifyJwt(req, res)
      } catch {
        sendErrorEnvelope(res, 'Authentication failed', 500, {
          code: 'AUTH_INTERNAL_ERROR',
        })
        return
      }

      if (jwtResult?.ok === true) {
        next()
        return
      }
      if (jwtResult?.ok === false) {
        if (!jwtResult.responded) {
          sendErrorEnvelope(res, 'Invalid or expired token', 401, {
            code: 'INVALID_TOKEN',
          })
        }
        return
      }

      // ---- 2. API key fallback ----
      let keyResult: ApiKeyResult = null
      try {
        keyResult = await verifyApiKey(req, res)
      } catch {
        sendErrorEnvelope(res, 'Authentication failed', 500, {
          code: 'AUTH_INTERNAL_ERROR',
        })
        return
      }

      if (keyResult?.ok === true) {
        if (!meetsScope(keyResult.scope, requiredScope)) {
          sendErrorEnvelope(res, `Insufficient API key scope (required: ${requiredScope})`, 403, {
            code: 'INSUFFICIENT_SCOPE',
          })
          return
        }
        next()
        return
      }
      if (keyResult?.ok === false) {
        if (!keyResult.responded) {
          sendErrorEnvelope(res, 'Invalid API key', 401, { code: 'INVALID_API_KEY' })
        }
        return
      }

      // No JWT, no API key.
      sendErrorEnvelope(res, 'Authentication required', 401, { code: 'UNAUTHORIZED' })
    }
  }
}
