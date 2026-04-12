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
} from '@ezstart/express-core'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { consumeHandoffCode } from '../../services/sso.service.js'
import { AuthService } from '../../services/auth.service.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { logger } from '@ezstart/logger/server'
import { mapToRecord } from '../../utils/map-to-record.js'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')
const ACCESS_TOKEN_EXPIRES_IN = (process.env.ACCESS_TOKEN_EXPIRES_IN || '15m') as `${number}m`

export const ssoExchangeRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(ssoExchangeRegistry, router)

// Rate limit to mitigate code-guessing (even though codes are 256-bit random)
const ssoExchangeRateLimiter = createStrictRateLimiter()

const ssoExchangeRequestSchema = z.object({
  code: z.string().min(32, 'code is required'),
  app: z.string().min(1, 'app is required'),
})

const ssoExchangeResponseSchema = z.object({
  user: z.object({}).passthrough().describe('Authenticated user'),
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

    // Grant app access if missing (mirrors login behaviour)
    if (!user.apps.includes(consumed.app)) {
      user.apps.push(consumed.app)
      await user.save()
    }

    // Build JWT payload identical to login path
    const payload = {
      userId: user._id!.toString(),
      email: user.email,
      username: user.username,
      apps: user.apps,
      globalRoles: user.globalRoles || [],
      appRoles: mapToRecord(user.appRoles),
      permissions: user.permissions || [],
      features: user.features || [],
    }
    const accessToken = jwt.sign(payload, JWT_SECRET!, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    })

    // Issue refresh token (stored hashed server-side)
    const refreshToken = await AuthService.generateRefreshToken(
      user._id!.toString(),
      req.headers['user-agent'],
      req.ip
    )

    // Cookie options mirror login-cookie.ts EXACTLY — same name, same shape.
    // Scoped to the shared parent domain in prod so all *.ezstart.xyz apps
    // see the session; undefined in dev (host-only cookie).
    res.cookie('ezauth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes (matches access token TTL)
      path: '/',
      domain:
        process.env.NODE_ENV === 'production'
          ? process.env.COOKIE_DOMAIN || '.ezstart.xyz'
          : undefined,
    })

    // Refresh token returned in body (matches login-cookie.ts pattern);
    // client persists it in localStorage via the auth store.
    return sendSuccess(res, {
      user: user.toAuthUser(),
      refreshToken,
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
    429: { description: 'Too many requests', schema: errorResponseSchema },
  },
})

export default router
