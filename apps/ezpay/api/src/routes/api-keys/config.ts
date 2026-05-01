/**
 * GET /api/keys/config?key=... — public endpoint returning the minimal
 * config a pay-sdk consumer needs to wire itself up from a publishable key.
 *
 * Mirrors the shape of ezauth's `/keys/config`. Rate-limited per key hash
 * (30 requests/minute) to mitigate enumeration. No user auth — the key IS
 * the auth.
 *
 * @module apps/ezpay/api/src/routes/api-keys/config
 */

import type { Request, Response } from 'express'
import { Router as ExpressRouter } from 'express'
import {
  createKeyHashRateLimiter,
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { z } from 'zod'
import { getApiUrl, getWebUrl, getCurrentEnvironment } from '@ezstart/config'
import { logger } from '@ezstart/logger/server'

import { getApiKeyModel } from '../../models/api-key.js'
import { hashApiKey, detectKeyFormat } from '../../utils/api-key.js'

export const configApiKeyRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(configApiKeyRegistry, router)

const configResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    applicationId: z.string(),
    appSlug: z.string(),
    apiUrl: z.string(),
    webUrl: z.string(),
    type: z.enum(['publishable', 'secret']),
    env: z.enum(['live', 'test']),
    scope: z.enum(['admin', 'user', 'readonly']),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

// Per-key in-memory rate limiter (30 req / 60 s) — shared factory from
// `@ezstart/api-core`, mirrors ezauth's `/keys/config`. The 30-req/min cap
// is documented in `_RATE_LIMIT_MAX` for the existing test suite.
const RATE_LIMIT_MAX = 30
const rateLimiter = createKeyHashRateLimiter({
  max: RATE_LIMIT_MAX,
  extractKey: req => {
    const raw = req.query.key
    return typeof raw === 'string' && raw.length > 0 ? hashApiKey(raw) : null
  },
})

/**
 * Test-only helper — clears the in-memory rate-limit window so suites that
 * exercise the 429 path don't bleed counters into each other. Forwards to
 * the `.reset()` method exposed by `createKeyHashRateLimiter`.
 *
 * @internal
 */
export function _resetRateLimitForTests(): void {
  rateLimiter.reset()
}

/** @internal — exposed for tests that assert the 429 threshold. */
export const _RATE_LIMIT_MAX = RATE_LIMIT_MAX

const configController = async (req: Request, res: Response) => {
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

    const env = getCurrentEnvironment()
    const apiUrl = getApiUrl('ezpay', env)
    const webUrl = getWebUrl('ezpay', env)

    return sendSuccess(res, {
      applicationId: apiKey.applicationId,
      appSlug: apiKey.appSlug,
      apiUrl,
      webUrl,
      type: apiKey.type,
      env: apiKey.env,
      scope: apiKey.scope,
    })
  } catch (error: unknown) {
    logger.error('EZPay key config endpoint error:', error)
    return sendError(res, 'Failed to fetch key config', 500)
  }
}

docRouter.get('/keys/config', rateLimiter, configController, {
  summary: 'Get EZPay app configuration for a publishable key',
  tags: ['API Keys'],
  responseSchema: configResponseSchema,
  extraResponses: {
    400: { description: 'Missing key parameter', schema: errorResponseSchema },
    401: { description: 'Invalid or expired key', schema: errorResponseSchema },
    429: { description: 'Rate limited', schema: errorResponseSchema },
  },
})

export default router
