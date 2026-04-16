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
import { AuthService } from '../../services/auth.service.js'
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

    // First validate credentials (without generating auth code yet)
    const userId = await AuthService.validateCredentials(parsed.data)

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

    sendSuccess(res, {
      code: authCode.code,
      expires_at: authCode.expires_at,
      message: 'Login successful',
    })
  } catch (error) {
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
    429: { description: 'Too many login attempts', schema: errorResponseSchema },
  },
})

export default router
