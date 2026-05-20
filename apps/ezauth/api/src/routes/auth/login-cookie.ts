import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  createCsrfMiddleware,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { AuthService, AccountLockedError } from '../../services/auth.service.js'
import { TotpService } from '../../services/totp.service.js'
import { checkDemoQuotas } from '../../middleware/check-demo-quotas.js'
import { logger } from '@ezstart/logger/server'
import { toSafeErrorMessage } from '../../utils/safe-error.js'
import {
  loginRequestSchema,
  userResponseSchema,
  errorResponseSchema,
} from '@ezstart/auth-sdk/server'

/**
 * MED-1 — intentional, client-safe credential-check messages thrown by
 * {@link AuthService.validateCredentials} (via `loginWithToken`). Mirrors the
 * allowlist in `login.ts`. Anything else collapses to a generic 'Login failed'.
 */
const SAFE_LOGIN_COOKIE_MESSAGES = [
  'Invalid credentials',
  "You haven't set a password yet. Use Google sign-in or click Forgot Password.",
] as const
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../../config/env.js'
import { JWT_ISSUER, JWT_VERIFIER_AUDIENCE } from '../../config/jwt.js'
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookieOptions,
  buildRefreshCookieOptions,
} from '../../config/cookie.js'

export const loginCookieRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(loginCookieRegistry, router)

// Rate limiting for login-cookie endpoint (5 req/min per IP)
const loginCookieRateLimiter = createStrictRateLimiter()
const csrf = createCsrfMiddleware()

// Login with httpOnly cookie (DUAL-MODE)
const loginCookieController = async (req: Request, res: Response) => {
  try {
    const parsed = loginRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid login request', parsed.error.issues)
    }

    // Validate credentials first.
    // Forward request metadata so the lockout audit log captures ip + UA.
    const ua = req.headers['user-agent']
    const userId = await AuthService.validateCredentials(parsed.data, {
      ip: req.ip ?? null,
      userAgent: typeof ua === 'string' ? ua : null,
    })

    // Check if user has 2FA enabled
    const has2FA = await TotpService.isEnabled(userId)

    if (has2FA) {
      // HAC-CRIT-2 — temp tokens are consumed by ezauth's /auth/2fa/validate
      // endpoint only, so we stamp + verify against `aud: 'ezauth'`.
      const tempToken = jwt.sign(
        {
          userId,
          app: parsed.data.app,
          redirect_uri: parsed.data.redirect_uri,
          type: '2fa_pending',
          mode: 'cookie',
        },
        JWT_SECRET,
        {
          expiresIn: '5m',
          algorithm: 'HS256',
          issuer: JWT_ISSUER,
          audience: JWT_VERIFIER_AUDIENCE,
        }
      )

      return sendSuccess(res, {
        requires2FA: true,
        tempToken,
        message: 'Two-factor authentication required',
      })
    }

    // No 2FA — proceed with normal login
    const authResult = await AuthService.loginWithToken(parsed.data, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    // Set httpOnly cookies — access (15m, path=/) + refresh (30d, path=/api/auth/refresh)
    res.cookie(ACCESS_COOKIE_NAME, authResult.access_token, buildAuthCookieOptions(req))
    res.cookie(REFRESH_COOKIE_NAME, authResult.refreshToken, buildRefreshCookieOptions(req))

    // Return user info + refresh token (refresh token duplicated in body for
    // backwards-compat with the localStorage mode; httpOnly consumers ignore it)
    sendSuccess(res, {
      user: authResult.user,
      refreshToken: authResult.refreshToken,
    })
  } catch (error) {
    if (error instanceof AccountLockedError) {
      // 423 Locked — convey the deadline + retry-after so the client can
      // render an accurate countdown (cf. config/lockout.ts).
      res.setHeader('Retry-After', String(error.retryAfterSeconds))
      return sendError(res, error.message, 423, {
        code: error.code,
        details: {
          lockedUntil: error.lockedUntil.toISOString(),
          retryAfterSeconds: error.retryAfterSeconds,
        },
      })
    }
    logger.error('Login cookie error:', error)
    sendError(
      res,
      toSafeErrorMessage(error, { allow: SAFE_LOGIN_COOKIE_MESSAGES, fallback: 'Login failed' }),
      401
    )
  }
}

// Generate CSRF token (client calls GET before POST)
const csrfTokenHandler = (_req: Request, res: Response): void => {
  sendSuccess(res, { message: 'CSRF token generated' })
}

docRouter.get('/login-cookie/csrf', csrf.generateToken, csrfTokenHandler, {
  summary: 'Generate CSRF token for login-cookie',
  tags: ['Authentication'],
})

// `checkDemoQuotas` is a strict no-op for non-`_docs-demo` traffic — it
// short-circuits via `req.body.app !== '_docs-demo'` before any Mongo
// lookup. For docs-demo requests it gates the daily audit-event quota.
docRouter.post(
  '/login-cookie',
  loginCookieRateLimiter,
  csrf.verifyToken,
  checkDemoQuotas,
  loginCookieController,
  {
    summary: 'Login with httpOnly cookie (dual-mode)',
    tags: ['Authentication'],
    bodySchema: loginRequestSchema,
    responseSchema: userResponseSchema,
    extraResponses: {
      401: { description: 'Login failed', schema: errorResponseSchema },
      429: { description: 'Too many login attempts', schema: errorResponseSchema },
    },
  }
)

export default router
