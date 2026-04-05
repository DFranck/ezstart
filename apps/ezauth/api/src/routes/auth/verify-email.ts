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

export const verifyEmailRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(verifyEmailRegistry, router)

const verifyEmailRateLimiter = createStrictRateLimiter()

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Email verification token'),
})

const verifyEmailResponseSchema = z.object({
  message: z.string().describe('Response message'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Whether the operation succeeded'),
  error: z.string().describe('Error message if operation failed'),
})

const verifyEmailController = async (req: Request, res: Response) => {
  try {
    const parsed = verifyEmailSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request', parsed.error.issues)
    }

    const { token } = parsed.data
    const AuthCodeModel = await getAuthCodeModel()

    // Find valid email verification token
    const authCode = await AuthCodeModel.findOne({
      code: token,
      type: 'email-verification',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    if (!authCode) {
      return sendError(res, 'Invalid or expired verification token', 400)
    }

    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(authCode.userId)

    if (!user) {
      return sendError(res, 'Invalid or expired verification token', 400)
    }

    if (user.isVerified) {
      // Mark token as used even if already verified
      authCode.isUsed = true
      await authCode.save()
      return sendSuccess(res, { message: 'Email already verified' })
    }

    // Mark user as verified
    user.isVerified = true
    await user.save()

    // Mark token as used
    authCode.isUsed = true
    await authCode.save()

    logger.info({ userId: user._id!.toString() }, 'Email verified successfully')

    sendSuccess(res, { message: 'Email verified successfully' })
  } catch (error) {
    logger.error('Verify email error:', error)
    sendError(res, 'Failed to verify email', 500)
  }
}

docRouter.post('/verify-email', verifyEmailRateLimiter, verifyEmailController, {
  summary: 'Verify email address with token',
  tags: ['Authentication'],
  bodySchema: verifyEmailSchema,
  responseSchema: verifyEmailResponseSchema,
  extraResponses: {
    400: { description: 'Invalid or expired token', schema: errorSchema },
    429: { description: 'Too many attempts', schema: errorSchema },
    500: { description: 'Server error', schema: errorSchema },
  },
})

export default router
