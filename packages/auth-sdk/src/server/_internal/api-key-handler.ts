/**
 * Request handler builder for the API-key-only middleware factory.
 *
 * Extracted from `api-key-middleware.ts` (Wave D Lot 4). Header extraction +
 * legacy-prefix warn + hash lookup + status / expiry / quota checks + the
 * per-app `populateRequest` callback + fire-and-forget usage bookkeeping.
 * Behaviour is byte-identical to the inline closure — only relocated so the
 * factory file stays under the size budget. The monthly usage cache + TTL
 * are passed in by the factory so multiple factories never share state (and
 * tests can pass `cacheTtlMs: 0` / call `.reset()`).
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @internal
 * @module @ezstart/auth-sdk/server/_internal/api-key-handler
 */

import './server-only.js'

import type { NextFunction, Request, Response } from 'express'
import type {
  ApiKeyMiddlewareConfig,
  ApiKeyMiddlewareLogger,
  ApiKeyShape,
} from '../api-key-middleware.js'
import { sendErrorEnvelope } from './error-envelope.js'
import { getCurrentMonthPrefix, getSecondsUntilNextMonth, getTodayDate } from './usage-window.js'

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

/** Dependencies the API-key handler closes over — supplied once by the factory. */
export interface ApiKeyHandlerContext<TKey extends ApiKeyShape> {
  config: ApiKeyMiddlewareConfig<TKey>
  hash: (raw: string) => string
  detectFormat: (raw: string) => { isLegacy: boolean } | null
  cacheTtlMs: number
  /** Per-factory monthly quota cache — shared by reference with the factory. */
  usageCache: Map<string, { total: number; expiry: number }>
  log: ApiKeyMiddlewareLogger
}

/**
 * Build the `(req, res, next) => Promise<void>` handler bound to the supplied
 * context. Returned function signature + semantics match the previous inline
 * implementation exactly (every error path responds before resolving).
 */
export function createApiKeyHandler<TKey extends ApiKeyShape>(
  ctx: ApiKeyHandlerContext<TKey>
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const { config, hash, detectFormat, cacheTtlMs, usageCache, log } = ctx

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

  return async function validateApiKeyMiddleware(
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
}
