/**
 * POST /api/auth/sso/exchange
 *
 * Exchanges a single-use SSO handoff code (issued by /sso/authorize) for
 * a fresh access cookie on the shared .ezstart.xyz domain, plus a refresh
 * token in the response body (mirrors /login-cookie).
 *
 * No auth middleware — the handoff code itself IS the credential.
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
import { consumeHandoffCode } from '../../services/sso.service.js'
import { issueSession } from '../../services/auth.service.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { env } from '../../config/env.js'
import { logger } from '@ezstart/logger/server'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookieOptions,
  buildRefreshCookieOptions,
} from '../../config/cookie.js'

export const ssoExchangeRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(ssoExchangeRegistry, router)

// Rate limit to mitigate code-guessing (even though codes are 256-bit random)
const ssoExchangeRateLimiter = createStrictRateLimiter()

const ssoExchangeRequestSchema = z.object({
  code: z
    .string()
    .min(32, 'code is required')
    .describe('Single-use SSO handoff code from /sso-authorize'),
  app: z
    .string()
    .min(1, 'app is required')
    .describe('Target app identifier (ezauth, ezbill, etc.)'),
})

const ssoExchangeResponseSchema = z.object({
  user: z.object({}).passthrough().describe('Authenticated user'),
  accessToken: z.string().describe('JWT access token (used in localStorage mode, e.g. localhost)'),
  refreshToken: z.string().describe('Refresh token to persist client-side (localStorage)'),
  redirect: z.string().describe('Relative path on the target app to redirect to'),
})

/**
 * Compute the in-app relative redirect (pathname + search) from the
 * handoff's stored redirectUri. Origin validation already happened at
 * authorize time; here we just strip it.
 */
function toRelativeRedirect(redirectUri: string | undefined): string {
  if (!redirectUri) return '/'
  try {
    const parsed = new URL(redirectUri)
    return `${parsed.pathname}${parsed.search}` || '/'
  } catch {
    return '/'
  }
}

const ssoExchangeController = async (req: Request, res: Response) => {
  try {
    const parsed = ssoExchangeRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request', parsed.error.issues)
    }

    // Atomically consume the handoff code — throws on invalid/expired/used/app-mismatch
    const consumed = await consumeHandoffCode({
      code: parsed.data.code,
      app: parsed.data.app,
    })

    // Load the user
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(consumed.userId)
    if (!user) {
      logger.warn({ userId: consumed.userId }, 'SSO handoff failed: user not found')
      return sendError(res, 'User not found', 400)
    }

    // Optionally require verified email before granting cross-app access via SSO.
    // Gated by REQUIRE_VERIFIED_EMAIL_FOR_SSO (default off) to avoid locking out
    // existing unverified production users; flip on after user migration.
    if (env.REQUIRE_VERIFIED_EMAIL_FOR_SSO && !user.isVerified) {
      logger.warn({ userId: user._id!.toString() }, 'SSO exchange refused: email not verified')
      return sendError(res, 'Email verification required before cross-app SSO', 403)
    }

    // Grant app access if missing (mirrors login behaviour)
    if (!user.apps.includes(consumed.app)) {
      user.apps.push(consumed.app)
      await user.save()
    }

    // Reuse the shared session issuer (JWT + refresh token)
    const session = await issueSession(user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    // Cookie options mirror login-cookie.ts EXACTLY — centralized in config/cookie.ts.
    res.cookie(ACCESS_COOKIE_NAME, session.access_token, buildAuthCookieOptions())
    res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, buildRefreshCookieOptions())

    // Tokens returned in body for localStorage-mode consumers (e.g. localhost
    // where httpOnly cookies can't cross ports); httpOnly consumers ignore them.
    return sendSuccess(res, {
      user: user.toAuthUser(),
      accessToken: session.access_token,
      refreshToken: session.refreshToken,
      redirect: toRelativeRedirect(consumed.redirectUri),
    })
  } catch (error) {
    // Log full error server-side for debugging, but return a sanitized message
    // to avoid leaking internals (e.g. "User not found", mongoose validation details).
    logger.error({ err: error }, 'SSO exchange failed')
    return sendError(res, 'Invalid or expired authorization code', 400)
  }
}

docRouter.post('/sso/exchange', ssoExchangeRateLimiter, ssoExchangeController, {
  summary: 'Exchange an SSO handoff code for an ezauth_token cookie + refresh token',
  tags: ['Authentication'],
  bodySchema: ssoExchangeRequestSchema,
  responseSchema: ssoExchangeResponseSchema,
  extraResponses: {
    400: {
      description: 'Invalid/expired/used code or app mismatch',
      schema: errorResponseSchema,
    },
    403: { description: 'Email verification required', schema: errorResponseSchema },
    429: { description: 'Too many requests', schema: errorResponseSchema },
  },
})

export default router
