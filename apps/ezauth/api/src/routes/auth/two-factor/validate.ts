import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { TotpService } from '../../../services/totp.service.js'
import { AuthService } from '../../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../../../config/env.js'

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

// POST /auth/2fa/validate — accepts tempToken + TOTP code, returns real auth code
const validateController = async (req: Request, res: Response) => {
  try {
    const parsed = validateSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, 'Invalid request', 400)
    }

    const { tempToken, code } = parsed.data

    // Verify the temp token
    let payload: { userId: string; app: string; redirect_uri?: string; type: string }
    try {
      payload = jwt.verify(tempToken, JWT_SECRET, { algorithms: ['HS256'] }) as typeof payload
    } catch {
      return sendError(res, 'Invalid or expired temporary token', 401)
    }

    if (payload.type !== '2fa_pending') {
      return sendError(res, 'Invalid token type', 401)
    }

    // Validate the TOTP code
    const isValid = await TotpService.validateLogin(payload.userId, code)
    if (!isValid) {
      return sendError(res, 'Invalid 2FA code', 401)
    }

    // Generate the real auth code (same as normal login)
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
    logger.error('2FA validate error:', error)
    sendError(res, error instanceof Error ? error.message : '2FA validation failed', 401)
  }
}

docRouter.post('/2fa/validate', validateRateLimiter, validateController, {
  summary: 'Validate 2FA code during login',
  tags: ['Two-Factor Authentication'],
  bodySchema: validateSchema,
})

export default router
