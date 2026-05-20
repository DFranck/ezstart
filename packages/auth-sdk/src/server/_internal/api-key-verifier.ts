/**
 * API-key verifier for the unified auth middleware (JWT-fallback path).
 *
 * Extracted from `auth-middleware.ts` (Wave D Lot 4). Header extraction +
 * hash lookup + status / expiry / quota checks + user attachment + legacy
 * `req.apiKey*` stamping + fire-and-forget usage bookkeeping, returning a
 * tri-state result the skeleton drives:
 *   - `null`                                → no key present (→ 401 unauth)
 *   - `{ ok: true, scope }`                 → authenticated; skeleton scope-checks
 *   - `{ ok: false, responded }`            → rejected (`responded` = body sent)
 *
 * Behaviour is byte-identical to the inline closures — only relocated. The
 * monthly usage cache + TTL are passed in by the factory so multiple
 * factories never share state (and tests can pass `cacheTtlMs: 0`).
 *
 * **Server-only.** Imported only by sibling `server/` modules.
 *
 * @internal
 * @module @ezstart/auth-sdk/server/_internal/api-key-verifier
 */

import './server-only.js'

import type { Request, Response } from 'express'
import type {
  AuthMiddlewareConfig,
  AuthMiddlewareLogger,
  AuthMiddlewareScope,
} from './auth-middleware-types.js'
import { sendErrorEnvelope } from './error-envelope.js'
import { normaliseScope } from './auth-scope.js'
import { getCurrentMonthPrefix, getSecondsUntilNextMonth, getTodayDate } from './usage-window.js'

/** Tri-state outcome of the API-key path. `null` = no key → 401 unauthorized. */
export type ApiKeyResult =
  | { ok: true; scope: AuthMiddlewareScope }
  | { ok: false; responded: boolean }
  | null

/** Dependencies the API-key verifier closes over — supplied once by the factory. */
export interface ApiKeyVerifierContext {
  config: Pick<AuthMiddlewareConfig, 'getApiKeyModel' | 'getApiKeyUsageModel'>
  hash: (raw: string) => string
  detectFormat: (raw: string) => { isLegacy: boolean } | null
  cacheTtlMs: number
  /** Per-factory monthly quota cache — shared by reference with the factory. */
  usageCache: Map<string, { total: number; expiry: number }>
  attachUserToRequest: (req: Request, userId: string) => Promise<boolean>
  log: AuthMiddlewareLogger
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

/**
 * Build the `verifyApiKey` closure bound to the supplied context. Returned
 * function signature + semantics match the previous inline implementation.
 */
export function createApiKeyVerifier(
  ctx: ApiKeyVerifierContext
): (req: Request, res: Response) => Promise<ApiKeyResult> {
  const { config, hash, detectFormat, cacheTtlMs, usageCache, attachUserToRequest, log } = ctx

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

  return async function verifyApiKey(req: Request, res: Response): Promise<ApiKeyResult> {
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
}
