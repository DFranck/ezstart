/**
 * GET /api/applications/resolve?key=ez_pk_live_xxx — public endpoint.
 *
 * Mirrors `/keys/config` but returns the Application identity scope rather
 * than the URL/plan bundle. Used by sibling services to derive an
 * `applicationId` from a publishable key handed to them by the client.
 *
 * Rate-limited per-key (same pattern as `/keys/config`).
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
import { logger } from '@ezstart/logger/server'

export const resolveApplicationRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(resolveApplicationRegistry, router)

const resolveResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    applicationId: z.string().nullable(),
    slug: z.string(),
    name: z.string().nullable(),
    type: z.enum(['publishable', 'secret']).optional(),
    env: z.enum(['live', 'test']).optional(),
    scope: z.enum(['admin', 'user', 'readonly', 'test', 'live']),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

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

const resolveApplicationController = async (req: Request, res: Response) => {
  try {
    const rawKey = req.query.key
    if (!rawKey || typeof rawKey !== 'string') {
      return sendError(res, 'Missing key query parameter', 400)
    }

    const format = detectKeyFormat(rawKey)
    if (format?.isLegacy) {
      logger.warn('Legacy ezk_* key detected, please rotate to ez_pk_/ez_sk_ by 2026-07-21', {
        keyPrefix: rawKey.substring(0, 15),
      })
    }

    const hashedKey = hashApiKey(rawKey)

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

    // Resolve type/env — prefer stored fields, fall back to stored prefix
    // for legacy docs.
    const storedFormat = apiKey.keyPrefix ? detectKeyFormat(apiKey.keyPrefix) : null
    const resolvedType = apiKey.type ?? storedFormat?.type
    const resolvedEnv = apiKey.env ?? storedFormat?.env

    let applicationId: string | null = null
    let slug: string = apiKey.appName || '*'
    let name: string | null = null

    if (apiKey.applicationId) {
      const Application = await getApplicationModel()
      const app = await Application.findById(apiKey.applicationId).lean()
      if (app) {
        applicationId = app._id.toString()
        slug = app.slug
        name = app.name
      }
    }

    return sendSuccess(res, {
      applicationId,
      slug,
      name,
      type: resolvedType,
      env: resolvedEnv,
      scope: apiKey.scope || 'user',
    })
  } catch (error: unknown) {
    logger.error('Resolve application error:', error)
    return sendError(res, 'Failed to resolve application', 500)
  }
}

docRouter.get('/applications/resolve', resolveApplicationController, {
  summary: 'Resolve an Application from a raw API key (public, rate-limited)',
  tags: ['Applications'],
  responseSchema: resolveResponseSchema,
  extraResponses: {
    400: { description: 'Missing key parameter', schema: errorResponseSchema },
    401: { description: 'Invalid or expired key', schema: errorResponseSchema },
    429: { description: 'Rate limited', schema: errorResponseSchema },
  },
})

export default router
