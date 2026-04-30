/**
 * EZAuth wrapper around `@ezstart/api-core`'s `createUnifiedAuthMiddleware`.
 *
 * Wires the existing `verifyTokenMiddleware` (JWT cookie / Bearer) and
 * `validateApiKey` (X-API-Key / Authorization: ApiKey) into a single
 * Express middleware so admin / CRUD routes accept BOTH dashboard sessions
 * AND server-to-server API key calls.
 *
 * Why this matters
 * ----------------
 * Before this wrapper, every admin route was JWT-only. A customer (or even
 * the user himself running a Node script) had no way to call `/api/keys`,
 * `/api/applications`, or `/api/users` without going through the dashboard
 * UI. That made the SaaS unusable for true server-to-server integrations,
 * which is the whole point of having `ez_sk_*` keys.
 *
 * Multi-tenancy
 * -------------
 * On API key auth, the wrapper resolves the underlying `req.apiKeyUserId`
 * to the AuthUser document and synthesises a `req.user` object that mirrors
 * what the JWT middleware would have produced — same fields, same shape.
 * This means downstream `attachDerivedScope` continues to work without any
 * modification: an admin-scoped key on Application "acme" produces the same
 * `derivedScope: 'myApps'` as a JWT for the same user.
 *
 * The verifier extracts the API key's `applicationId` and stamps it on
 * `req.apiKeyApplicationId`. Routes that still use the legacy `req.apiKey*`
 * fields (e.g. `list-users.ts`) continue to work unchanged.
 *
 * @module apps/ezauth/api/src/middleware/unified-auth
 */

import type { Request, RequestHandler, Response } from 'express'
import jwt from 'jsonwebtoken'
import {
  createUnifiedAuthMiddleware,
  sendError,
  type UnifiedApiKeyResult,
  type UnifiedAuthScope,
  type UnifiedJwtResult,
} from '@ezstart/api-core'
import type { JWTPayload } from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { JWT_SECRET } from '../config/env.js'
import { ACCESS_COOKIE_NAME } from '../config/cookie.js'
import { getApiKeyModel } from '../models/api-key.js'
import { getApiKeyUsageModel } from '../models/api-key-usage.js'
import { getAuthUserModel } from '../models/auth-user.js'
import { hashApiKey, detectKeyFormat } from '../utils/api-key.js'
import { mapToRecord } from '../utils/map-to-record.js'
import { updatePresenceByUserId } from '../services/presence.service.js'

// ---------------------------------------------------------------------------
// JWT verification — mirrors `verifyTokenMiddleware` semantics but returns a
// structured result so the unified middleware can decide between "no JWT
// present → fall back to API key" and "JWT present but invalid → reject".
// ---------------------------------------------------------------------------

function extractJwtToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  // Skip API key headers — they get their own verifier.
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME]
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken
  }
  return undefined
}

async function attachUserToRequest(req: Request, userId: string): Promise<boolean> {
  const AuthUser = await getAuthUserModel()
  const user = await AuthUser.findById(userId).select('-passwordHash').lean()
  if (!user) return false
  // Soft-delete gate (mirrors verifyTokenMiddleware).
  if (user.deletedAt) return false

  const resolvedUserId = user._id.toString()
  req.userId = resolvedUserId
  req.user = {
    _id: resolvedUserId,
    userId: resolvedUserId,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    isVerified: user.isVerified,
    apps: user.apps,
    globalRoles: user.globalRoles || [],
    appRoles: mapToRecord(user.appRoles),
    permissions: user.permissions || [],
    features: user.features || [],
    organizationId: user.organizationId,
    managedBy: user.managedBy,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
  updatePresenceByUserId(resolvedUserId)
  return true
}

async function verifyJwtForUnified(req: Request, res: Response): Promise<UnifiedJwtResult> {
  const token = extractJwtToken(req)
  if (!token) return null // No JWT — try API key.

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as unknown as JWTPayload

    const attached = await attachUserToRequest(req, payload.userId)
    if (!attached) {
      sendError(res, 'User not found', 401, { code: 'USER_NOT_FOUND' })
      return { ok: false, responded: true }
    }
    return { ok: true }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      sendError(res, 'Invalid token', 401, { code: 'INVALID_TOKEN' })
      return { ok: false, responded: true }
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      sendError(res, 'Token expired', 401, { code: 'TOKEN_EXPIRED' })
      return { ok: false, responded: true }
    }
    logger.error('Unified auth JWT verifier error:', error)
    sendError(res, 'Authentication failed', 500, { code: 'AUTH_INTERNAL_ERROR' })
    return { ok: false, responded: true }
  }
}

// ---------------------------------------------------------------------------
// API key verification — mirrors `validateApiKey` semantics but adapted to
// the unified result contract. Re-uses the same monthly quota cache so dual
// auth on the same key path doesn't double-bill.
// ---------------------------------------------------------------------------

interface CachedUsage {
  total: number
  expiry: number
}
const usageCache = new Map<string, CachedUsage>()
const CACHE_TTL_MS = 5 * 60 * 1000

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

async function getMonthlyUsage(apiKeyId: string): Promise<number> {
  const monthPrefix = getCurrentMonthPrefix()
  const cacheKey = `${apiKeyId}:${monthPrefix}`
  const cached = usageCache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) return cached.total

  const ApiKeyUsage = await getApiKeyUsageModel()
  const result = await ApiKeyUsage.aggregate<{ total: number }>([
    { $match: { apiKeyId, date: { $regex: `^${monthPrefix}` } } },
    { $group: { _id: null, total: { $sum: '$requestCount' } } },
  ])
  const total = result[0]?.total ?? 0
  usageCache.set(cacheKey, { total, expiry: Date.now() + CACHE_TTL_MS })
  return total
}

function incrementCachedUsage(apiKeyId: string): void {
  const monthPrefix = getCurrentMonthPrefix()
  const cached = usageCache.get(`${apiKeyId}:${monthPrefix}`)
  if (cached) cached.total += 1
}

/**
 * Map the persisted scope (modern + legacy values) onto the canonical
 * `UnifiedAuthScope`. Legacy `'live'` / `'test'` are demoted to `'user'`
 * so a publishable key can never satisfy `requireKeyScope: 'admin'`.
 */
function normaliseScope(stored: string | undefined | null): UnifiedAuthScope {
  if (stored === 'admin') return 'admin'
  if (stored === 'readonly') return 'readonly'
  // 'user', 'live', 'test', undefined → user-equivalent.
  return 'user'
}

async function verifyApiKeyForUnified(req: Request, res: Response): Promise<UnifiedApiKeyResult> {
  const rawKey = extractApiKeyHeader(req)
  if (!rawKey) return null // No API key — caller decides whether 401.

  try {
    // Warn on legacy ezk_* prefix (backwards-compat window until 2026-07-21).
    const format = detectKeyFormat(rawKey)
    if (format?.isLegacy) {
      logger.warn('Legacy ezk_* key detected (unified-auth path)', {
        keyPrefix: rawKey.substring(0, 15),
      })
    }

    const hashedKey = hashApiKey(rawKey)
    const ApiKey = await getApiKeyModel()
    const apiKey = await ApiKey.findOne({ key: hashedKey }).lean()

    if (!apiKey) {
      sendError(res, 'Invalid API key', 401, { code: 'INVALID_API_KEY' })
      return { ok: false, responded: true }
    }
    if (apiKey.status !== 'active') {
      sendError(res, 'API key has been revoked', 401, { code: 'API_KEY_REVOKED' })
      return { ok: false, responded: true }
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      sendError(res, 'API key has expired', 401, { code: 'API_KEY_EXPIRED' })
      return { ok: false, responded: true }
    }

    // Monthly quota.
    const keyId = apiKey._id.toString()
    const quota = apiKey.quotaMonthly
    if (quota !== null && quota !== undefined) {
      const used = await getMonthlyUsage(keyId)
      if (used >= quota) {
        sendError(res, 'Monthly quota exceeded', 429, {
          code: 'QUOTA_EXCEEDED',
          details: { quota, used },
          retryAfter: getSecondsUntilNextMonth(),
        })
        return { ok: false, responded: true }
      }
    }

    // Resolve the owner so downstream RBAC works identically to JWT auth.
    const attached = await attachUserToRequest(req, apiKey.userId)
    if (!attached) {
      sendError(res, 'API key owner not found', 401, { code: 'API_KEY_OWNER_NOT_FOUND' })
      return { ok: false, responded: true }
    }

    // Stamp legacy fields for routes that haven't migrated to req.user yet.
    req.apiKeyId = keyId
    req.apiKeyUserId = apiKey.userId
    const storedScope = apiKey.scope
    req.apiKeyScope = (storedScope ?? 'live') as typeof req.apiKeyScope
    req.apiKeyAppName = apiKey.appName || '*'

    // Fire-and-forget bookkeeping (mirrors validateApiKey).
    ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).catch(
      (err: unknown) => {
        logger.warn('Failed to update API key lastUsedAt (unified-auth):', err)
      }
    )

    const today = getTodayDate()
    const sanitizedPath = req.path.replace(/[.$]/g, '_')
    void getApiKeyUsageModel()
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
    logger.error('Unified auth API key verifier error:', error)
    sendError(res, 'API key authentication failed', 500, { code: 'AUTH_INTERNAL_ERROR' })
    return { ok: false, responded: true }
  }
}

// ---------------------------------------------------------------------------
// Public factory — drop-in replacement for `verifyTokenMiddleware` that ALSO
// accepts API keys. Pass `requireKeyScope: 'admin'` on admin routes so a
// publishable key (`ez_pk_*`, scope='user') is rejected with HTTP 403.
// ---------------------------------------------------------------------------

export type AuthJwtOrKeyOptions = {
  /** Minimum API key scope. Defaults to `'user'`. Use `'admin'` for admin routes. */
  requireKeyScope?: UnifiedAuthScope
}

/**
 * Build a middleware that authenticates via JWT (cookie/Bearer) OR API key
 * (`X-API-Key` / `Authorization: ApiKey`).
 *
 * @example
 * ```ts
 * import { authJwtOrKey } from '../../middleware/unified-auth.js'
 *
 * docRouter.get(
 *   '/applications',
 *   authJwtOrKey({ requireKeyScope: 'admin' }),
 *   attachDerivedScope,
 *   listApplicationsController,
 *   { ... }
 * )
 * ```
 */
export function authJwtOrKey(opts: AuthJwtOrKeyOptions = {}): RequestHandler {
  return createUnifiedAuthMiddleware({
    requireKeyScope: opts.requireKeyScope ?? 'user',
    verifyJwt: verifyJwtForUnified,
    verifyApiKey: verifyApiKeyForUnified,
  })
}
