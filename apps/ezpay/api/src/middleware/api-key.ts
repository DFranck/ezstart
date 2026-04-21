/**
 * EZPay API-key authentication middleware.
 *
 * Validates requests carrying an `X-API-Key` header or an
 * `Authorization: ApiKey <key>` header. The key is SHA-256 hashed and looked
 * up in the LOCAL ezpay `api_keys` collection — no cross-service call is
 * made on the hot path. Cross-service validation happens ONLY at key
 * creation time (`POST /api/keys`) via the ezauth-client service.
 *
 * Side effects on success:
 * - `req.apiKeyId`, `req.apiKeyUserId`, `req.apiKeyApplicationId`,
 *   `req.apiKeyAppSlug`, `req.apiKeyScope` are populated.
 * - `lastUsedAt` on the key is bumped fire-and-forget.
 * - A per-day bucket in `api_key_usage` is incremented fire-and-forget.
 *
 * @module apps/ezpay/api/src/middleware/api-key
 */

import type { Request, Response, NextFunction } from 'express'
import { sendError } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { getApiKeyModel } from '../models/api-key.js'
import { getApiKeyUsageModel } from '../models/api-key-usage.js'
import { hashApiKey, detectKeyFormat } from '../utils/api-key.js'

/** In-memory cache for monthly usage totals (TTL 5 min). */
interface CachedUsage {
  total: number
  expiry: number
}

const usageCache = new Map<string, CachedUsage>()
const CACHE_TTL_MS = 5 * 60 * 1000

/** Extract the raw API key from request headers. */
function extractApiKey(req: Request): string | undefined {
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

/** Current month prefix `yyyy-mm` for monthly usage bucketing. */
function getCurrentMonthPrefix(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Today's date `yyyy-mm-dd`. */
function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Calculate seconds until the start of next month (quota `retryAfter`). */
function getSecondsUntilNextMonth(): number {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000)
}

/**
 * Monthly usage lookup with in-memory cache (TTL 5 min).
 * Returns the aggregated request count for the current month.
 */
async function getMonthlyUsage(apiKeyId: string): Promise<number> {
  const monthPrefix = getCurrentMonthPrefix()
  const cacheKey = `${apiKeyId}:${monthPrefix}`

  const cached = usageCache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached.total
  }

  const ApiKeyUsage = await getApiKeyUsageModel()
  const result = await ApiKeyUsage.aggregate<{ total: number }>([
    {
      $match: {
        apiKeyId,
        date: { $regex: `^${monthPrefix}` },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$requestCount' },
      },
    },
  ])

  const total = result[0]?.total ?? 0

  usageCache.set(cacheKey, {
    total,
    expiry: Date.now() + CACHE_TTL_MS,
  })

  return total
}

/** Keep the cached monthly usage roughly in sync after each increment. */
function incrementCachedUsage(apiKeyId: string): void {
  const monthPrefix = getCurrentMonthPrefix()
  const cacheKey = `${apiKeyId}:${monthPrefix}`
  const cached = usageCache.get(cacheKey)
  if (cached) {
    cached.total += 1
  }
}

/**
 * Middleware validating an EZPay API key. Attaches the key metadata to the
 * request and enforces the monthly quota. Does NOT talk to ezauth on the
 * hot path.
 *
 * @example
 * router.get('/api/keys/protected', validateApiKey, controller)
 */
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const rawKey = extractApiKey(req)
    if (!rawKey) {
      return sendError(res, 'API key required', 401)
    }

    // Warn on legacy ezk_* keys still in the wild — keep the deadline
    // aligned with standard-saas-keys.md (2026-07-21).
    const format = detectKeyFormat(rawKey)
    if (format?.isLegacy) {
      logger.warn('Legacy ezk_* key detected, please rotate to ez_pk_/ez_sk_ by 2026-07-21', {
        keyPrefix: rawKey.substring(0, 15),
      })
    }

    const hashedKey = hashApiKey(rawKey)
    const ApiKey = await getApiKeyModel()

    const apiKey = await ApiKey.findOne({ key: hashedKey }).lean()
    if (!apiKey) {
      return sendError(res, 'Invalid API key', 401)
    }

    if (apiKey.status !== 'active') {
      return sendError(res, 'API key has been revoked', 401)
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return sendError(res, 'API key has expired', 401)
    }

    const keyId = apiKey._id.toString()
    const quota = apiKey.quotaMonthly

    if (quota !== null && quota !== undefined) {
      const used = await getMonthlyUsage(keyId)
      if (used >= quota) {
        return sendError(res, 'Monthly quota exceeded', 429, {
          code: 'QUOTA_EXCEEDED',
          details: { quota, used },
          retryAfter: getSecondsUntilNextMonth(),
        })
      }
    }

    req.apiKeyId = keyId
    req.apiKeyUserId = apiKey.userId
    req.apiKeyApplicationId = apiKey.applicationId
    req.apiKeyAppSlug = apiKey.appSlug
    req.apiKeyScope = apiKey.scope

    // Fire-and-forget: bump lastUsedAt on the key.
    ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).catch(
      (err: unknown) => {
        logger.warn('Failed to update API key lastUsedAt:', err)
      }
    )

    // Fire-and-forget: increment per-day usage bucket.
    const today = getTodayDate()
    const sanitizedPath = req.path.replace(/[.$]/g, '_')
    getApiKeyUsageModel()
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
    logger.error('API key middleware error:', error)
    return sendError(res, 'API key authentication failed', 500)
  }
}

/**
 * @internal Exposed for tests only — clears the in-memory usage cache so
 * test cases don't bleed cached quotas into each other.
 */
export function _resetUsageCacheForTests(): void {
  usageCache.clear()
}
