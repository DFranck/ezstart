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
     * Each token is an optional CSS color string. Consumers inject these as
     * `--primary: <value>` overrides to white-label the auth pages.
     */
    theme: applicationThemeSchema.optional(),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

// Simple in-memory rate limiter per key hash
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 30 // 30 requests per minute per key

function isRateLimited(keyHash: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(keyHash)

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(keyHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > RATE_LIMIT_MAX
}

/**
 * Cached config response payload (identical to the `data` field returned on
 * a 200). Theme is preserved so SSR middleware + client hooks get the
 * white-label tokens without an extra DB roundtrip on every request.
 */
interface CachedKeyConfig {
  appName: string
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

    // Rate limit
    if (isRateLimited(hashedKey)) {
      return sendError(res, 'Rate limited', 429)
    }

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
    // enabled. Theme is OPTIONAL — absence means the app inherits the
    // default CSS preset keyed on `data-app="<slug>"`.
    let theme: CachedKeyConfig['theme']
    if (apiKey.applicationId) {
      const Application = await getApplicationModel()
      const appDoc = await Application.findById(apiKey.applicationId).lean()
      if (appDoc && appDoc.themeEnabled && appDoc.theme) {
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

    const payload: CachedKeyConfig = {
      appName: apiKey.appName || '*',
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

docRouter.get('/keys/config', configController, {
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
