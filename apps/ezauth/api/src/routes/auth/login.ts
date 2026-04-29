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
import { TotpService } from '../../services/totp.service.js'
import { logger } from '@ezstart/logger/server'
import {
  loginRequestSchema,
  authCodeResponseSchema,
  errorResponseSchema,
} from '@ezstart/auth-sdk/server'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../../config/env.js'

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
      // Return a temporary token that must be exchanged with a 2FA code
      const tempToken = jwt.sign(
        {
          userId,
          app: parsed.data.app,
          redirect_uri: parsed.data.redirect_uri,
          type: '2fa_pending',
        },
        JWT_SECRET,
        { expiresIn: '5m', algorithm: 'HS256' }
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

docRouter.post('/login', loginRateLimiter, loginController, {
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
