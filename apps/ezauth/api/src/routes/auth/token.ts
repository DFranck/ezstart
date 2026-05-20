import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  createStrictRateLimiter,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import { toSafeErrorMessage } from '../../utils/safe-error.js'
import {
  tokenRequestSchema,
  tokenResponseSchema,
  errorResponseSchema,
} from '@ezstart/auth-sdk/server'
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookieOptions,
  buildRefreshCookieOptions,
} from '../../config/cookie.js'

/** Strict rate limit: 10 requests per 5 minutes */
const tokenRateLimiter = createStrictRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many token exchange attempts, please try again later.',
})

export const tokenRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(tokenRegistry, router)

// Exchange code for token
const tokenController = async (req: Request, res: Response) => {
  try {
    const parsed = tokenRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid token request', parsed.error.issues)
    }

    const token = await AuthService.exchangeCodeForToken(parsed.data, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    // DUAL-MODE: Set httpOnly cookies (apps using cookie mode) + return tokens in body
    res.cookie(ACCESS_COOKIE_NAME, token.access_token, buildAuthCookieOptions(req))
    res.cookie(REFRESH_COOKIE_NAME, token.refreshToken, buildRefreshCookieOptions(req))

    sendSuccess(res, {
      access_token: token.access_token,
      token_type: token.token_type,
      expires_in: token.expires_in,
      user: token.user,
      refresh_token: token.refreshToken,
    })
  } catch (error) {
    // MED-3 — only the exchange service's intentional, client-safe messages
    // are echoed verbatim. Everything else returns a stable generic message
    // so unexpected internal detail never leaks. The thrown error is logged.
    logger.error('Token exchange error:', error)
    sendError(
      res,
      toSafeErrorMessage(error, { allow: SAFE_TOKEN_MESSAGES, fallback: 'Token exchange failed' }),
      400
    )
  }
}

/**
 * MED-3 — allowlist of intentional, client-safe token-exchange error
 * messages thrown by `exchangeCodeForToken`. Anything else collapses to a
 * generic `'Token exchange failed'`.
 */
const SAFE_TOKEN_MESSAGES = new Set<string>([
  'Invalid or expired authorization code',
  'User not found',
])

docRouter.post('/token', tokenRateLimiter, tokenController, {
  summary: 'Exchange authorization code for access token',
  tags: ['Authentication'],
  bodySchema: tokenRequestSchema,
  responseSchema: tokenResponseSchema,
  extraResponses: {
    400: { description: 'Token exchange failed', schema: errorResponseSchema },
  },
})

export default router
