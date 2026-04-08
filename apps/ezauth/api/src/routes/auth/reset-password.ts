import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { logger } from '@ezstart/logger/server'

export const resetPasswordRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(resetPasswordRegistry, router)

const resetPasswordRateLimiter = createStrictRateLimiter()

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Password reset token'),
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .describe('New password (min 6 characters)'),
})

const resetPasswordResponseSchema = z.object({
  message: z.string().describe('Response message'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Whether the operation succeeded'),
  error: z.string().describe('Error message if operation failed'),
})

const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request', parsed.error.issues)
    }

    const { token, newPassword } = parsed.data
    const AuthCodeModel = await getAuthCodeModel()

    // Find valid password reset token
    const authCode = await AuthCodeModel.findOne({
      code: token,
      type: 'password-reset',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    if (!authCode) {
      return sendError(res, 'Invalid or expired reset token', 400)
    }

    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(authCode.userId)

    if (!user) {
      return sendError(res, 'Invalid or expired reset token', 400)
    }

    // Update password (pre-save hook will hash it)
    user.passwordHash = newPassword
    user.hasSetOwnPassword = true
    await user.save()

    // Mark token as used
    authCode.isUsed = true
    await authCode.save()

    logger.info({ userId: user._id!.toString() }, 'Password reset successfully')

    sendSuccess(res, { message: 'Password reset successfully' })
  } catch (error) {
    logger.error('Reset password error:', error)
    sendError(res, 'Failed to reset password', 500)
  }
}

docRouter.post('/reset-password', resetPasswordRateLimiter, resetPasswordController, {
  summary: 'Reset password with token',
  tags: ['Authentication'],
  bodySchema: resetPasswordSchema,
  responseSchema: resetPasswordResponseSchema,
  extraResponses: {
    400: { description: 'Invalid or expired token', schema: errorSchema },
    429: { description: 'Too many attempts', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
