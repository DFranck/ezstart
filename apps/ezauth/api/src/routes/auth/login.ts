import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { AuthService, AccountLockedError } from '../../services/auth.service.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { checkDemoQuotas } from '../../middleware/check-demo-quotas.js'
import { TotpService } from '../../services/totp.service.js'
import { verifyTurnstileToken } from '../../services/turnstile.service.js'
import { logger } from '@ezstart/logger/server'
import {
  loginRequestSchema,
  authCodeResponseSchema,
  errorResponseSchema,
} from '@ezstart/auth-sdk/server'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../../config/env.js'
import { JWT_ISSUER, JWT_VERIFIER_AUDIENCE } from '../../config/jwt.js'

export const loginRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(loginRegistry, router)

// Rate limiting for login endpoint (5 req/min per IP)
const loginRateLimiter = createStrictRateLimiter()

// Login user
const loginController = async (req: Request, res: Response) => {
  try {
    const parsed = loginRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid login request', parsed.error.issues)
    }

    // Optional Turnstile gate — when the SDK frontend has decided to surface
    // the captcha (after N consecutive fails) it sends `turnstileToken` in
    // the body. Verify it server-side. The verifier is a no-op when
    // `TURNSTILE_SECRET_KEY` is unset, so this is safe to mount today and
    // enable later by setting the env.
    const turnstileToken =
      typeof (req.body as { turnstileToken?: unknown })?.turnstileToken === 'string'
        ? (req.body as { turnstileToken: string }).turnstileToken
        : undefined
    if (turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(turnstileToken, req.ip)
      if (!turnstileResult.success) {
        return sendValidationError(
          res,
          'Captcha verification failed',
          turnstileResult.errorCodes ?? [],
          400
        )
      }
    }

    // First validate credentials (without generating auth code yet).
    // Forward request metadata so the lockout audit log captures ip + UA.
    const ua = req.headers['user-agent']
    const userId = await AuthService.validateCredentials(parsed.data, {
      ip: req.ip ?? null,
      userAgent: typeof ua === 'string' ? ua : null,
    })

    // Check if user has 2FA enabled
    const has2FA = await TotpService.isEnabled(userId)

    if (has2FA) {
      // Return a temporary token that must be exchanged with a 2FA code.
      // HAC-CRIT-2 — temp tokens are consumed by ezauth's /auth/2fa/validate
      // endpoint only, so we stamp + verify against `aud: 'ezauth'`.
      const tempToken = jwt.sign(
        {
          userId,
          app: parsed.data.app,
          redirect_uri: parsed.data.redirect_uri,
          type: '2fa_pending',
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
    const authCode = await AuthService.login(parsed.data)

    // Fire-and-forget audit log entry. Failure must NEVER block login.
    void AuditLogService.createFromRequest(req, {
      userId,
      action: 'login',
      appName: parsed.data.app,
    })

    sendSuccess(res, {
      code: authCode.code,
      expires_at: authCode.expires_at,
      message: 'Login successful',
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
    logger.error('Login error:', error)
    sendError(res, error instanceof Error ? error.message : 'Login failed', 401)
  }
}

// `checkDemoQuotas` is a strict no-op for non-`_docs-demo` traffic. For
// docs-demo requests it gates the daily audit-event quota (login + signup
// counted together).
docRouter.post('/login', loginRateLimiter, checkDemoQuotas, loginController, {
  summary: 'Login user',
  tags: ['Authentication'],
  bodySchema: loginRequestSchema,
  responseSchema: authCodeResponseSchema,
  extraResponses: {
    401: { description: 'Login failed', schema: errorResponseSchema },
    423: {
      description: 'Account temporarily locked due to too many failed attempts',
      schema: errorResponseSchema,
    },
    429: { description: 'Too many login attempts', schema: errorResponseSchema },
  },
})

export default router
