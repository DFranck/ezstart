/**
 * Drop-in API-key authentication middleware factory for any @ezstart-style
 * API.
 *
 * Wires `X-API-Key` / `Authorization: ApiKey ...` lookup behind a single
 * Express middleware so admin / CRUD routes can accept server-to-server API
 * key calls without re-implementing 200+ lines of glue per service.
 *
 * Unlike {@link createAuthMiddleware}, this factory **only** validates an API
 * key — no JWT path, no fallback. Use it on routes that are key-only by
 * design (Stripe-pattern public APIs, server-to-server webhooks, etc.). For
 * routes that should accept both dashboard sessions and key calls, prefer
 * `createAuthMiddleware`.
 *
 * Usage (5 lines per API):
 *
 * ```ts
 * import { createApiKeyMiddleware } from '@ezstart/auth-sdk/server'
 *
 * export const validateApiKey = createApiKeyMiddleware({
 *   getKeyModel: getApiKeyModel,
 *   getUsageModel: getApiKeyUsageModel,
 *   populateRequest: (req, key) => {
 *     req.apiKeyId = key._id.toString()
 *     req.apiKeyUserId = key.userId
 *     req.apiKeyApplicationId = key.applicationId
 *     req.apiKeyAppSlug = key.appSlug
 *     req.apiKeyScope = key.scope
 *   },
 *   logger,
 * })
 *
 * router.get('/api/donations', validateApiKey, controller)
 * ```
 *
 * Architecture
 * ------------
 * - **Agnostic** — no import from `@ezstart/api-core`, `@ezstart/logger`, or
 *   `mongoose`. Models are passed via factory functions typed against
 *   minimal structural interfaces. Each consumer app shapes its own
 *   `populateRequest` callback so app-specific fields (`applicationId`,
 *   `appSlug`, `appName`, ...) land where downstream middleware expects them.
 * - **Reusable across services** — ezauth, ezpay, and any future API can
 *   wire the same factory with its own models + populator. Zero per-API
 *   duplication of cache logic, header parsing, quota enforcement, or
 *   fire-and-forget tracking.
 * - **Cache-isolated** — each call to {@link createApiKeyMiddleware} owns
 *   its own monthly usage cache. Tests can pass `cacheTtlMs: 0` to bypass
 *   caching entirely, or call `.reset()` on the returned middleware to
 *   clear state between cases.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies.
 *
 * @module @ezstart/auth-sdk/server/api-key-middleware
 */

import './_internal/server-only.js'

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import {
  hashApiKey as defaultHashApiKey,
  detectKeyFormat as defaultDetectKeyFormat,
} from '../core/api-keys-crypto.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Minimum logger surface — opt-in. Defaults to a silent no-op so the SDK
 * does not pull `@ezstart/logger` (or any logger) at runtime.
 */
export interface ApiKeyMiddlewareLogger {
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

const noopLogger: ApiKeyMiddlewareLogger = {
  warn: () => {},
  error: () => {},
}

/**
 * Minimal structural shape every persisted API key document MUST satisfy
 * for the middleware to validate it. Apps may add arbitrary extra fields
 * (`applicationId`, `appSlug`, `appName`, `permissions`, ...) — those
 * appear via the index signature and are accessible from the consumer's
 * `populateRequest` callback.
 */
export interface ApiKeyShape {
  _id: { toString(): string } | string
  userId: string
  status: string
  scope?: string | null
  expiresAt?: Date | string | null
  quotaMonthly?: number | null
  /** App-specific fields (`applicationId`, `appSlug`, `appName`, ...). */
  [key: string]: unknown
}

/**
 * Minimal Mongoose-shaped model surface. The middleware only calls
 * `findOne(...).lean()`, `updateOne(...)`, and `aggregate(...)` so we
 * type those three methods loosely to avoid pulling `mongoose` as a peer
 * dep.
 */
export interface ApiKeyModelLike<TKey extends ApiKeyShape> {
  findOne(filter: Record<string, unknown>): { lean(): Promise<TKey | null> }
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<unknown>
}

/**
 * Minimal Mongoose-shaped model surface for the usage collection. The
 * middleware only calls `aggregate(...)` and `updateOne(...)`.
 */
export interface ApiKeyUsageModelLike {
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<unknown>
  aggregate<TResult>(pipeline: unknown[]): Promise<TResult[]>
}

/**
 * Configuration accepted by {@link createApiKeyMiddleware}.
 *
 * Required fields: the two model getters + the per-app `populateRequest`
 * callback that maps the loaded key doc onto `req.*` fields. Everything
 * else has a sensible default so a fresh API can be wired in literally
 * five lines.
 */
export interface ApiKeyMiddlewareConfig<TKey extends ApiKeyShape = ApiKeyShape> {
  /** Factory returning the ApiKey Mongoose model (must be ready). */
  getKeyModel: () => Promise<ApiKeyModelLike<TKey>>
  /** Factory returning the ApiKeyUsage Mongoose model (must be ready). */
  getUsageModel: () => Promise<ApiKeyUsageModelLike>
  /**
   * Map the loaded key doc onto `req.*` fields. App-specific (each
   * consumer chooses which fields to expose to downstream middleware).
   *
   * Called AFTER all key validation passes (status, expiry, quota) and
   * BEFORE `next()`. Throwing here aborts the request via the `try/catch`
   * in the middleware body, so keep it pure / synchronous.
   */
  populateRequest: (req: Request, key: TKey) => void
  /**
   * Hash the raw API key string. Defaults to the SHA-256 implementation
   * shipped by `@ezstart/auth-sdk/core` so test data and prod data match
   * across services without configuration.
   */
  hashApiKey?: (raw: string) => string
  /**
   * Detect whether the raw key uses the legacy `ezk_*` prefix (warned in
   * logs but accepted until the deprecation deadline). Defaults to the
   * SDK core helper.
   */
  detectKeyFormat?: (raw: string) => { isLegacy: boolean } | null
  /** Optional structured logger. Defaults to a silent no-op. */
  logger?: ApiKeyMiddlewareLogger
  /**
   * Override the monthly usage cache TTL (milliseconds). Defaults to
   * 5 minutes. Tests can drop this to zero to bypass caching entirely.
   */
  cacheTtlMs?: number
}

/**
 * Express middleware returned by {@link createApiKeyMiddleware}. Augmented
 * with a `.reset()` helper that clears the in-memory monthly usage cache —
 * intended for tests that share a factory instance across cases.
 *
 * The signature returns `Promise<void>` so tests can `await middleware(req,
 * res, next)` directly without spurious next-tick races. Express ignores
 * the returned Promise (it's a vanilla `(req, res, next)` handler at
 * runtime), which is fine — every error path responds via `res.status().json()`
 * before resolving so unhandled-rejection guarantees still hold.
 */
export interface ApiKeyMiddleware {
  (req: Request, res: Response, next: NextFunction): Promise<void>
  /** @internal Test-only — clear the in-memory monthly usage cache. */
  reset(): void
}

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
// Pure helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build a drop-in API-key middleware bound to a specific API's config
 * (models, populator, logger, ...). The returned function is an Express
 * `RequestHandler` ready to register on any route. It also exposes a
 * `.reset()` helper that clears the in-memory monthly usage cache for
 * tests.
 *
 * @example
 * ```ts
 * import { createApiKeyMiddleware } from '@ezstart/auth-sdk/server'
 * import { logger } from '@ezstart/logger/server'
 * import { getApiKeyModel } from '../models/api-key.js'
 * import { getApiKeyUsageModel } from '../models/api-key-usage.js'
 *
 * export const validateApiKey = createApiKeyMiddleware({
 *   getKeyModel: getApiKeyModel,
 *   getUsageModel: getApiKeyUsageModel,
 *   populateRequest: (req, key) => {
 *     req.apiKeyId = key._id.toString()
 *     req.apiKeyUserId = key.userId
 *     req.apiKeyScope = (key.scope as string) ?? 'live'
 *     req.apiKeyAppName = (key.appName as string) ?? '*'
 *   },
 *   logger,
 * })
 *
 * router.get('/api/keys/protected', validateApiKey, controller)
 * ```
 */
export function createApiKeyMiddleware<TKey extends ApiKeyShape = ApiKeyShape>(
  config: ApiKeyMiddlewareConfig<TKey>
): ApiKeyMiddleware {
  const hash = config.hashApiKey ?? defaultHashApiKey
  const detectFormat = config.detectKeyFormat ?? defaultDetectKeyFormat
  const log = config.logger ?? noopLogger
  const cacheTtlMs = config.cacheTtlMs ?? 5 * 60 * 1000

  // Per-factory monthly quota cache. Each instance has its own cache so
  // multiple factories (rare) don't share state. Tests can pass
  // `cacheTtlMs: 0` to disable caching entirely.
  const usageCache = new Map<string, { total: number; expiry: number }>()

  async function getMonthlyUsage(apiKeyId: string): Promise<number> {
    const monthPrefix = getCurrentMonthPrefix()
    const cacheKey = `${apiKeyId}:${monthPrefix}`
    if (cacheTtlMs > 0) {
      const cached = usageCache.get(cacheKey)
      if (cached && cached.expiry > Date.now()) return cached.total
    }
    const ApiKeyUsage = await config.getUsageModel()
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

  const handler = async function validateApiKeyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawKey = extractApiKeyHeader(req)
      if (!rawKey) {
        sendErrorEnvelope(res, 'API key required', 401)
        return
      }

      // Warn on legacy ezk_* keys still in the wild — keep the deadline
      // aligned with standard-saas-keys.md (2026-07-21).
      const format = detectFormat(rawKey)
      if (format?.isLegacy) {
        log.warn('Legacy ezk_* key detected, please rotate to ez_pk_/ez_sk_ by 2026-07-21', {
          keyPrefix: rawKey.substring(0, 15),
        })
      }

      const hashedKey = hash(rawKey)
      const ApiKey = await config.getKeyModel()
      const apiKey = await ApiKey.findOne({ key: hashedKey }).lean()

      if (!apiKey) {
        sendErrorEnvelope(res, 'Invalid API key', 401)
        return
      }
      if (apiKey.status !== 'active') {
        sendErrorEnvelope(res, 'API key has been revoked', 401)
        return
      }
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        sendErrorEnvelope(res, 'API key has expired', 401)
        return
      }

      const keyId = typeof apiKey._id === 'string' ? apiKey._id : apiKey._id.toString()
      const quota = apiKey.quotaMonthly
      if (quota !== null && quota !== undefined) {
        const used = await getMonthlyUsage(keyId)
        if (used >= quota) {
          sendErrorEnvelope(res, 'Monthly quota exceeded', 429, {
            code: 'QUOTA_EXCEEDED',
            details: { quota, used },
            retryAfter: getSecondsUntilNextMonth(),
          })
          return
        }
      }

      // Hand off to the per-app populator BEFORE firing bookkeeping so
      // any synchronous validation it performs can short-circuit cleanly
      // (the try/catch around the body will surface a 500 if it throws).
      config.populateRequest(req, apiKey)

      // Fire-and-forget: bump lastUsedAt on the key.
      ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).catch(
        (err: unknown) => {
          log.warn('Failed to update API key lastUsedAt:', err)
        }
      )

      // Fire-and-forget: increment per-day usage bucket.
      const today = getTodayDate()
      const sanitizedPath = req.path.replace(/[.$]/g, '_')
      void config
        .getUsageModel()
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
          // Silent fail — usage tracking is best-effort.
        })

      next()
    } catch (error: unknown) {
      log.error('API key middleware error:', error)
      sendErrorEnvelope(res, 'API key authentication failed', 500)
    }
  }

  const middleware = handler as ApiKeyMiddleware

  middleware.reset = function reset(): void {
    usageCache.clear()
  }

  return middleware
}
