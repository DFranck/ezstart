/**
 * GET /api/keys/config — Public endpoint to fetch app configuration from a publishable key.
 *
 * This is the Clerk-like auto-config endpoint. The SDK calls this on mount
 * with the publishable key to resolve appName, plan, features, apiUrl, webUrl.
 *
 * No user auth needed — the key IS the auth.
 * Rate limited per key to prevent abuse.
 */

import type { Request, Response } from 'express'
import {
  createKeyHashRateLimiter,
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApplicationModel } from '../../models/application.js'
import { hashApiKey, detectKeyFormat } from '../../utils/api-key.js'
import { applicationThemeSchema } from '../../utils/theme.js'
import { getApiUrl, getWebUrl, getCurrentEnvironment } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger/server'

export const configApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(configApiKeyRegistry, router)

const configResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    appName: z.string(),
    /**
     * Human-readable display name of the owning Application (from
     * `Application.name` in the DB, e.g. `'GreenPulse.AI'`). Used by the
     * EZAuth auth pages to render a proper brand name on the "Sign in to
     * access <AppDisplayName>" line without relying on any hardcoded lookup
     * table. Absent when the key is not bound to a specific Application
     * (e.g. platform-wide admin keys). Callers MUST fall back to a sensible
     * default (prettified slug) when this field is missing.
     */
    appDisplayName: z.string().optional(),
    apiUrl: z.string(),
    webUrl: z.string(),
    features: z.array(z.string()),
    plan: z.string(),
    quotaMonthly: z.number(),
    type: z.enum(['publishable', 'secret']).optional(),
    env: z.enum(['live', 'test']).optional(),
    // Scope enum includes legacy 'test'/'live' for backwards compat with pre-P2a keys in DB.
    // New keys only use 'admin'|'user'|'readonly'. Removal deadline: 2026-07-21.
    scope: z.enum(['admin', 'user', 'readonly', 'test', 'live']),
    /**
     * White-label theme tokens for the owning Application. Only present when
     * the Application has `themeEnabled=true` AND at least one token set.
     * Only `primary` is actively used by the EZAuth auth pages — the other
     * tokens (background, foreground, accent) are kept in the schema for
     * backwards compatibility with older clients but are NOT rendered as
     * CSS overrides. Light/dark mode is handled by ezauth's own
     * `next-themes` stack, so only `--primary` is injected.
     */
    theme: applicationThemeSchema.optional(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

// Per-key in-memory rate limiter (30 req / 60 s per hashed publishable key) —
// shared factory from `@ezstart/api-core`. The middleware is mounted via the
// imperative `rateLimiter(req, res, next)` call below so the existing
// docRouter signature stays unchanged.
const rateLimiter = createKeyHashRateLimiter({
  extractKey: req => {
    const raw = req.query.key
    return typeof raw === 'string' && raw.length > 0 ? hashApiKey(raw) : null
  },
})

/**
 * Cached config response payload (identical to the `data` field returned on
 * a 200). Theme is preserved so SSR middleware + client hooks get the
 * white-label tokens without an extra DB roundtrip on every request.
 */
interface CachedKeyConfig {
  appName: string
  /**
   * Human-readable Application name resolved from `Application.name`.
   * Optional — absent for keys without a bound Application. Consumers MUST
   * fall back to a prettified slug when missing.
   */
  appDisplayName?: string
  apiUrl: string
  webUrl: string
  features: string[]
  plan: string
  quotaMonthly: number
  type?: 'publishable' | 'secret'
  env?: 'live' | 'test'
  scope: 'admin' | 'user' | 'readonly' | 'test' | 'live'
  theme?: {
    primary?: string
    background?: string
    foreground?: string
    accent?: string
    logo?: string
  }
}

// Short-TTL positive cache. Populated on cache miss, cleared via a size cap.
// 30 s is tight enough to keep dashboard toggles (themeEnabled flip) visible
// to SSR within a handful of requests, and long enough to cover the bursty
// pattern of middleware → page → asset fetches made by Next.js.
const CACHE_TTL_MS = 30_000
const CACHE_MAX_ENTRIES = 500
interface CacheEntry {
  value: CachedKeyConfig
  expiresAt: number
}
const configCache = new Map<string, CacheEntry>()

function readCache(keyHash: string): CachedKeyConfig | undefined {
  const entry = configCache.get(keyHash)
  if (!entry) return undefined
  if (entry.expiresAt < Date.now()) {
    configCache.delete(keyHash)
    return undefined
  }
  return entry.value
}

function writeCache(keyHash: string, value: CachedKeyConfig): void {
  if (configCache.size >= CACHE_MAX_ENTRIES) {
    // Drop the oldest entry — Map preserves insertion order.
    const oldest = configCache.keys().next().value
    if (oldest) configCache.delete(oldest)
  }
  configCache.set(keyHash, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Test-only helper — exported so integration tests can purge the LRU after
 * mutating an Application's theme. Never called in production code paths.
 * @internal
 */
export function __resetKeyConfigCache(): void {
  configCache.clear()
}

const configController = async (req: Request, res: Response) => {
  try {
    const rawKey = req.query.key
    if (!rawKey || typeof rawKey !== 'string') {
      return sendError(res, 'Missing key query parameter', 400)
    }

    // Detect key format — warn on legacy ezk_* usage.
    const format = detectKeyFormat(rawKey)
    if (format?.isLegacy) {
      logger.warn('Legacy ezk_* key detected, please rotate to ez_pk_/ez_sk_ by 2026-07-21', {
        keyPrefix: rawKey.substring(0, 15),
      })
    }

    const hashedKey = hashApiKey(rawKey)

    // Short-TTL positive cache — avoids hitting Mongo on every middleware
    // call while SSR renders the auth pages.
    const cached = readCache(hashedKey)
    if (cached) {
      return sendSuccess(res, cached)
    }

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

    // Resolve URLs based on current environment
    const env = getCurrentEnvironment()
    const apiUrl = getApiUrl('ezauth', env)
    const webUrl = getWebUrl('ezauth', env)

    // TODO: When billing is implemented, resolve plan/features from user's subscription
    const plan = 'free'
    const features = apiKey.permissions ?? ['*']

    // Resolve type/env: prefer stored fields, fall back to detecting from the stored prefix
    // (handles legacy docs persisted before the prefix refactor).
    const storedFormat = apiKey.keyPrefix ? detectKeyFormat(apiKey.keyPrefix) : null
    const resolvedType = apiKey.type ?? storedFormat?.type
    const resolvedEnv = apiKey.env ?? storedFormat?.env

    // Resolve the owning Application's theme tokens when white-labeling is
    // enabled, and the human-readable display name in the same DB round trip.
    // Theme is OPTIONAL — absence means no white-label override is injected
    // and the default EZAuth theme applies. `appDisplayName` is OPTIONAL too —
    // platform-wide keys have no bound Application.
    let theme: CachedKeyConfig['theme']
    let appDisplayName: string | undefined
    if (apiKey.applicationId) {
      const Application = await getApplicationModel()
      const appDoc = await Application.findById(apiKey.applicationId).lean()
      if (appDoc) {
        if (appDoc.name) {
          appDisplayName = appDoc.name
        }
        if (appDoc.themeEnabled && appDoc.theme) {
          const hasAnyToken =
            !!appDoc.theme.primary ||
            !!appDoc.theme.background ||
            !!appDoc.theme.foreground ||
            !!appDoc.theme.accent ||
            !!appDoc.theme.logo
          if (hasAnyToken) {
            theme = {
              primary: appDoc.theme.primary,
              background: appDoc.theme.background,
              foreground: appDoc.theme.foreground,
              accent: appDoc.theme.accent,
              logo: appDoc.theme.logo,
            }
          }
        }
      }
    }

    const payload: CachedKeyConfig = {
      appName: apiKey.appName || '*',
      ...(appDisplayName ? { appDisplayName } : {}),
      apiUrl,
      webUrl,
      features,
      plan,
      quotaMonthly: apiKey.quotaMonthly ?? -1,
      type: resolvedType,
      env: resolvedEnv,
      scope: apiKey.scope || 'user',
      ...(theme ? { theme } : {}),
    }
    writeCache(hashedKey, payload)
    return sendSuccess(res, payload)
  } catch (error: unknown) {
    logger.error('Key config endpoint error:', error)
    return sendError(res, 'Failed to fetch key config', 500)
  }
}

docRouter.get('/keys/config', rateLimiter, configController, {
  summary: 'Get app configuration for a publishable key',
  tags: ['API Keys'],
  responseSchema: configResponseSchema,
  extraResponses: {
    400: { description: 'Missing key parameter', schema: errorResponseSchema },
    401: { description: 'Invalid or expired key', schema: errorResponseSchema },
    429: { description: 'Rate limited', schema: errorResponseSchema },
  },
})

export default router
