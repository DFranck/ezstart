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
import { z } from 'zod'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { logger } from '@ezstart/logger/server'

export const validateResetTokenRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(validateResetTokenRegistry, router)

const validateResetTokenRateLimiter = createStrictRateLimiter()

const validateResetTokenSchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Password reset token to validate'),
})

const validateResetTokenResponseSchema = z.object({
  valid: z.literal(true).describe('Whether the token is valid'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Whether the operation succeeded'),
  error: z.string().describe('Error message if operation failed'),
  code: z.string().optional().describe('Machine-readable error code'),
})

const validateResetTokenController = async (req: Request, res: Response) => {
  try {
    const parsed = validateResetTokenSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request', parsed.error.issues)
    }

    const { token } = parsed.data
    const AuthCodeModel = await getAuthCodeModel()

    // Pre-validation only: does NOT consume the token (isUsed stays false)
    const authCode = await AuthCodeModel.findOne({
      code: token,
      type: 'password-reset',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    if (!authCode) {
      return sendError(res, 'Invalid or expired reset token', 400, {
        code: 'INVALID_OR_EXPIRED_TOKEN',
      })
    }

    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(authCode.userId)

    if (!user) {
      return sendError(res, 'Invalid or expired reset token', 400, {
        code: 'INVALID_OR_EXPIRED_TOKEN',
      })
    }

    sendSuccess(res, { valid: true as const })
  } catch (error) {
    logger.error('Validate reset token error:', error)
    sendError(res, 'Failed to validate reset token', 500)
  }
}

docRouter.post(
  '/validate-reset-token',
  validateResetTokenRateLimiter,
  validateResetTokenController,
  {
    summary: 'Validate password reset token',
    tags: ['Authentication'],
    bodySchema: validateResetTokenSchema,
    responseSchema: validateResetTokenResponseSchema,
    extraResponses: {
      400: { description: 'Invalid or expired token', schema: errorSchema },
      429: { description: 'Too many attempts', schema: errorSchema },
      500: { description: 'Server error', schema: errorSchema },
    },
  }
)

export default router
