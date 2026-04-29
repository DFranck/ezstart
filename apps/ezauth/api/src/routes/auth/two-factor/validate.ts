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
import { TotpService, TwoFactorLockedError } from '../../../services/totp.service.js'
import { AuthService, issueSession } from '../../../services/auth.service.js'
import { AuditLogService } from '../../../services/audit-log.service.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../../../config/env.js'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookieOptions,
  buildRefreshCookieOptions,
} from '../../../config/cookie.js'

export const twoFactorValidateRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(twoFactorValidateRegistry, router)

const validateRateLimiter = createStrictRateLimiter()

const validateSchema = z.object({
  tempToken: z
    .string()
    .min(1, 'Temporary token is required')
    .describe('Temporary token from login requiring 2FA'),
  code: z.string().min(6, 'Code must be at least 6 characters').describe('TOTP verification code'),
})

interface TwoFactorPendingPayload {
  userId: string
  app: string
  redirect_uri?: string
  type: string
  mode?: string
}

// POST /auth/2fa/validate — accepts tempToken + TOTP code (or backup code)
// Returns either an auth code (default mode) OR sets httpOnly cookies
// (`mode: 'cookie'` — flow originated from /login-cookie).
const validateController = async (req: Request, res: Response) => {
  try {
    const parsed = validateSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 'Invalid request', 400)
    }

    const { tempToken, code } = parsed.data

    // Verify the temp token
    let payload: TwoFactorPendingPayload
    try {
      payload = jwt.verify(tempToken, JWT_SECRET, {
        algorithms: ['HS256'],
      }) as TwoFactorPendingPayload
    } catch {
      return sendError(res, 'Invalid or expired temporary token', 401)
    }

    if (payload.type !== '2fa_pending') {
      return sendError(res, 'Invalid token type', 401)
    }

    // Validate the TOTP / backup code. Forward request metadata so the
    // 2FA lockout audit log captures ip + UA when the lock fires.
    const ua = req.headers['user-agent']
    const result = await TotpService.validateLogin(payload.userId, code, {
      ip: req.ip ?? null,
      userAgent: typeof ua === 'string' ? ua : null,
    })
    if (!result.valid) {
      // Audit log the failure (fire-and-forget). Useful for forensics +
      // future per-user 2FA brute-force lockout.
      void AuditLogService.createFromRequest(req, {
        userId: payload.userId,
        action: '2fa_login_failed',
        appName: payload.app,
      })
      return sendError(res, 'Invalid 2FA code', 401)
    }

    // Audit log success — distinguish TOTP from backup code consumption
    // so admins can see when users fall back to recovery codes.
    void AuditLogService.createFromRequest(req, {
      userId: payload.userId,
      action: '2fa_login_success',
      appName: payload.app,
      metadata: { method: result.method },
    })
    if (result.method === 'backup') {
      void AuditLogService.createFromRequest(req, {
        userId: payload.userId,
        action: 'backup_code_used',
        appName: payload.app,
      })
    }

    // Cookie-mode flow — finalize the session inline (set httpOnly
    // cookies) instead of returning an auth code. The cookie login
    // route does not exchange auth codes, so we must produce the same
    // response shape it would have on a no-2FA login.
    if (payload.mode === 'cookie') {
      const AuthUserModel = await getAuthUserModel()
      const user = await AuthUserModel.findById(payload.userId)
      if (!user) {
        return sendError(res, 'User not found', 404)
      }

      // Grant access to the requesting app (parity with non-2FA cookie login)
      if (!user.apps.includes(payload.app)) {
        user.apps.push(payload.app)
        await user.save()
      }

      const session = await issueSession(user, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      })

      res.cookie(ACCESS_COOKIE_NAME, session.access_token, buildAuthCookieOptions())
      res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, buildRefreshCookieOptions())

      return sendSuccess(res, {
        user: session.user,
        refreshToken: session.refreshToken,
        message: 'Login successful',
      })
    }

    // Auth-code mode — return the same shape /login does
    const authCode = await AuthService.generateAuthCodePublic(
      payload.userId,
      payload.app,
      payload.redirect_uri
    )

    sendSuccess(res, {
      code: authCode.code,
      expires_at: authCode.expires_at,
      message: 'Login successful',
    })
  } catch (error) {
    if (error instanceof TwoFactorLockedError) {
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
    logger.error('2FA validate error:', error)
    sendError(res, error instanceof Error ? error.message : '2FA validation failed', 401)
  }
}

docRouter.post('/2fa/validate', validateRateLimiter, validateController, {
  summary: 'Validate 2FA code during login',
  tags: ['Two-Factor Authentication'],
  bodySchema: validateSchema,
  extraResponses: {
    401: { description: '2FA validation failed', schema: errorResponseSchema },
    423: {
      description: '2FA temporarily locked due to too many failed attempts',
      schema: errorResponseSchema,
    },
    429: { description: 'Too many 2FA attempts', schema: errorResponseSchema },
  },
})

export default router
