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
import { hashApiKey } from '../../utils/api-key.js'
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
    scope: z.enum(['test', 'live', 'admin']),
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

const configController = async (req: Request, res: Response) => {
  try {
    const rawKey = req.query.key
    if (!rawKey || typeof rawKey !== 'string') {
      return sendError(res, 'Missing key query parameter', 400)
    }

    const hashedKey = hashApiKey(rawKey)

    // Rate limit
    if (isRateLimited(hashedKey)) {
      return sendError(res, 'Rate limited', 429)
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

    return sendSuccess(res, {
      appName: apiKey.appName || '*',
      apiUrl,
      webUrl,
      features,
      plan,
      quotaMonthly: apiKey.quotaMonthly ?? -1,
      scope: apiKey.scope || 'live',
    })
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
