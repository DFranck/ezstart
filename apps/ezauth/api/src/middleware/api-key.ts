/**
 * Middleware to authenticate requests using API keys.
 * Checks `X-API-Key` header or `Authorization: ApiKey <key>`.
 * Includes quota enforcement and fire-and-forget usage tracking.
 */

import type { Request, Response, NextFunction } from 'express'
import { sendError } from '@ezstart/api-core'
import { getApiKeyModel } from '../models/api-key.js'
import { getApiKeyUsageModel } from '../models/api-key-usage.js'
import { hashApiKey } from '../utils/api-key.js'
import { logger } from '@ezstart/logger/server'

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

/** Get the current month prefix for date bucketing (e.g. '2026-04'). */
function getCurrentMonthPrefix(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Get today's date string (e.g. '2026-04-16'). */
function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Get monthly usage for a key, with in-memory caching (TTL 5 min).
 * Returns the total request count for the current month.
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

/**
 * Increment the cached monthly usage after a successful request.
 * Keeps the cache roughly in sync without waiting for DB.
 */
function incrementCachedUsage(apiKeyId: string): void {
  const monthPrefix = getCurrentMonthPrefix()
  const cacheKey = `${apiKeyId}:${monthPrefix}`
  const cached = usageCache.get(cacheKey)
  if (cached) {
    cached.total += 1
  }
}

/**
 * Middleware that validates an API key and attaches the key info to the request.
 * Sets `req.apiKeyId` and `req.apiKeyUserId` on success.
 *
 * Also enforces monthly quota and tracks usage (fire-and-forget).
 */
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const rawKey = extractApiKey(req)
    if (!rawKey) {
      return sendError(res, 'API key required', 401)
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

    // Quota enforcement
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

    // Attach API key info to request
    req.apiKeyId = keyId
    req.apiKeyUserId = apiKey.userId
    req.apiKeyScope = apiKey.scope || 'app'
    req.apiKeyAppName = apiKey.appName || '*'

    // Fire-and-forget: update lastUsedAt
    ApiKey.updateOne(
      { _id: apiKey._id },
      { $set: { lastUsedAt: new Date() } }
    ).catch((err: unknown) => {
      logger.warn('Failed to update API key lastUsedAt:', err)
    })

    // Fire-and-forget: usage tracking
    const today = getTodayDate()
    const sanitizedPath = req.path.replace(/[.$]/g, '_')
    getApiKeyUsageModel()
      .then((ApiKeyUsage) =>
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
        // Silent fail — tracking is best-effort
      })

    next()
  } catch (error: unknown) {
    logger.error('API key middleware error:', error)
    return sendError(res, 'API key authentication failed', 500)
  }
}

/** Calculate seconds until the start of next month. */
function getSecondsUntilNextMonth(): number {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000)
}
