import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookieOptions,
  buildRefreshCookieOptions,
} from '../../config/cookie.js'
import { verifyCookieCsrf } from '../../middleware/csrf.js'

export const refreshRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(refreshRegistry, router)

// Rate limiting for refresh endpoint (5 req/min per IP)
const refreshRateLimiter = createStrictRateLimiter()

const refreshRequestSchema = z.object({
  refreshToken: z
    .string()
    .min(1)
    .optional()
    .describe('Refresh token (omit if supplied via ezauth_refresh cookie)'),
})

const refreshResponseSchema = z.object({
  accessToken: z.string().describe('New short-lived access token'),
  refreshToken: z.string().describe('New refresh token (rotated)'),
  expiresIn: z.number().describe('Access token TTL in seconds'),
  user: z.object({}).passthrough().describe('User info'),
})

/** Generic error returned for all refresh failures — never leak specifics. */
const GENERIC_REFRESH_ERROR = 'Invalid or expired refresh token'

const refreshController = async (req: Request, res: Response) => {
  try {
    // Prefer httpOnly cookie over body — cookie-mode clients never put the
    // refresh token in JS memory. Body is a fallback for localStorage mode.
    const cookieToken: string | undefined = req.cookies?.[REFRESH_COOKIE_NAME]
    const parsed = refreshRequestSchema.safeParse(req.body ?? {})
    const bodyToken = parsed.success ? parsed.data.refreshToken : undefined
    const refreshToken = cookieToken || bodyToken

    if (!refreshToken) {
      return sendError(res, GENERIC_REFRESH_ERROR, 401)
    }

    const result = await AuthService.refreshAccessToken(refreshToken, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    // Rotate both cookies in parallel with the body response (dual-mode).
    res.cookie(ACCESS_COOKIE_NAME, result.access_token, buildAuthCookieOptions(req))
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, buildRefreshCookieOptions(req))

    sendSuccess(res, {
      accessToken: result.access_token,
      refreshToken: result.refreshToken,
      expiresIn: result.expires_in,
      user: result.user,
    })
  } catch (error) {
    // Log full detail server-side, but ALWAYS return the generic message.
    logger.warn({ err: error }, 'Refresh token rejected')
    sendError(res, GENERIC_REFRESH_ERROR, 401)
  }
}

docRouter.post('/refresh', refreshRateLimiter, verifyCookieCsrf, refreshController, {
  summary: 'Refresh access token using a refresh token (with rotation)',
  tags: ['Authentication'],
  bodySchema: refreshRequestSchema,
  responseSchema: refreshResponseSchema,
  extraResponses: {
    401: { description: 'Invalid or expired refresh token', schema: errorResponseSchema },
    429: { description: 'Too many requests', schema: errorResponseSchema },
  },
})

export default router
