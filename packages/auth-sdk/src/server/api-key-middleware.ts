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

import type { NextFunction, Request, Response } from 'express'
import {
  hashApiKey as defaultHashApiKey,
  detectKeyFormat as defaultDetectKeyFormat,
} from '../core/api-keys-crypto.js'
import { createApiKeyHandler } from './_internal/api-key-handler.js'

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
// Internal helpers extracted to `./_internal/` (Wave D Lot 4):
//   - error-envelope.ts   → sendErrorEnvelope + ErrorOptions (shared)
//   - usage-window.ts     → month/day/seconds helpers (shared)
//   - api-key-handler.ts  → createApiKeyHandler(ctx) — the request handler
// All behaviour unchanged.
// ---------------------------------------------------------------------------

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
  // `cacheTtlMs: 0` to disable caching entirely. The handler closes over
  // this exact Map instance (see `./_internal/api-key-handler.ts`), so the
  // `.reset()` augmentation below clears the same state the handler reads.
  const usageCache = new Map<string, { total: number; expiry: number }>()

  const handler = createApiKeyHandler<TKey>({
    config,
    hash,
    detectFormat,
    cacheTtlMs,
    usageCache,
    log,
  })

  const middleware = handler as ApiKeyMiddleware

  middleware.reset = function reset(): void {
    usageCache.clear()
  }

  return middleware
}
