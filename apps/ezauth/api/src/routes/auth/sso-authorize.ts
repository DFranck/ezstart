/**
 * POST /api/auth/sso/authorize
 *
 * Issues a short-lived (60s), single-use SSO handoff code so that an
 * already-authenticated user can transparently obtain a session on another
 * ezstart.xyz app without re-entering credentials.
 *
 * Requires: valid Bearer JWT (verifyTokenMiddleware).
 */

import type { Request, Response } from 'express'
import { Router as ExpressRouter } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { z } from 'zod'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'
import { issueHandoffCode } from '../../services/sso.service.js'
import { env } from '../../config/env.js'
import { logger } from '@ezstart/logger/server'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'

export const ssoAuthorizeRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(ssoAuthorizeRegistry, router)

// TODO: prefer per-userId rate limiting once express-core exposes a userId keyer.
// For now, IP-based strict limiter (5 req/min) is sufficient given the 60s TTL.
const ssoAuthorizeRateLimiter = createStrictRateLimiter()

const ssoAuthorizeRequestSchema = z.object({
  app: z
    .string()
    .min(1, 'app is required')
    .describe('Target app identifier (ezauth, ezbill, etc.)'),
  redirectUri: z
    .string()
    .url('redirectUri must be a valid URL')
    .describe('URL on the target app to redirect to after SSO exchange'),
})

const ssoAuthorizeResponseSchema = z.object({
  code: z.string().describe('Single-use SSO handoff code'),
  expiresIn: z.number().describe('Code TTL in seconds'),
})

const ssoAuthorizeController = async (req: Request, res: Response) => {
  try {
    const parsed = ssoAuthorizeRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request', parsed.error.issues)
    }

    const userId = req.user?._id
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    // Optionally require verified email before issuing a cross-app SSO handoff.
    // Gated by REQUIRE_VERIFIED_EMAIL_FOR_SSO so existing unverified production
    // users are not locked out; enable once user migration is complete.
    if (env.REQUIRE_VERIFIED_EMAIL_FOR_SSO && req.user && req.user.isVerified === false) {
      return sendError(res, 'Email verification required before cross-app SSO', 403)
    }

    const { code, expiresIn } = await issueHandoffCode({
      userId,
      app: parsed.data.app,
      redirectUri: parsed.data.redirectUri,
      ip: req.ip,
      ua: req.headers['user-agent'],
    })

    return sendSuccess(res, { code, expiresIn })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SSO authorize failed'
    logger.warn({ err: message }, 'SSO authorize error')

    // Redirect-allowlist / validation errors are 400
    if (
      message.startsWith('Disallowed redirectUri') ||
      message.startsWith('Invalid redirectUri') ||
      message.startsWith('SSO is not configured')
    ) {
      return sendError(res, message, 400)
    }
    return sendError(res, message, 500)
  }
}

docRouter.post(
  '/sso/authorize',
  ssoAuthorizeRateLimiter,
  verifyCookieCsrf,
  verifyTokenMiddleware,
  ssoAuthorizeController,
  {
    summary: 'Issue a single-use SSO handoff code for cross-app navigation',
    tags: ['Authentication'],
    bodySchema: ssoAuthorizeRequestSchema,
    responseSchema: ssoAuthorizeResponseSchema,
    extraResponses: {
      400: { description: 'Invalid app or disallowed redirectUri', schema: errorResponseSchema },
      401: { description: 'Authentication required', schema: errorResponseSchema },
      403: { description: 'Email verification required', schema: errorResponseSchema },
      429: { description: 'Too many requests', schema: errorResponseSchema },
    },
  }
)

export default router
