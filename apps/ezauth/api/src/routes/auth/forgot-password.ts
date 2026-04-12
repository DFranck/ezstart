import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createVeryStrictRateLimiter,
  sendSuccess,
  sendValidationError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { emailService } from '../../services/email.service.js'
import { passwordResetTemplate } from '@ezstart/email-service'
import { getWebUrl } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger/server'
import { getAppDisplayName, buildAuthEmailParams } from '../../utils/app-display.js'

export const forgotPasswordRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(forgotPasswordRegistry, router)

/** Strict rate limit: 3 requests per 15 minutes */
const forgotPasswordRateLimiter = createVeryStrictRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many password reset attempts, please try again later.',
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').describe('User email address'),
  app: z.string().optional().describe('App requesting the password reset'),
  redirect_uri: z.string().url().optional().describe('Redirect URI to return to after reset'),
})

const forgotPasswordResponseSchema = z.object({
  message: z.string().describe('Response message'),
})

const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid email address', parsed.error.issues)
    }

    const { email, app, redirect_uri } = parsed.data
    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findOne({ email: email.toLowerCase() })

    if (user) {
      const AuthCodeModel = await getAuthCodeModel()
      const token = crypto.randomBytes(32).toString('hex')

      const authCode = new AuthCodeModel({
        code: token,
        userId: user._id!.toString(),
        type: 'password-reset',
        app: app || 'ezstart',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      })

      await authCode.save()

      const appDisplayName = getAppDisplayName(app)
      const params = buildAuthEmailParams(token, app, redirect_uri)
      const resetUrl = `${getWebUrl('ezauth')}/reset-password?${params}`

      await emailService.send({
        to: user.email,
        subject: `[${appDisplayName}] Reset your password`,
        html: passwordResetTemplate(resetUrl, appDisplayName),
      })

      logger.info({ email: user.email }, 'Password reset email sent')
    } else {
      logger.debug({ email }, 'Password reset requested for non-existent email')
    }

    // Always return 200 to not reveal if email exists
    sendSuccess(res, { message: 'If an account exists, a reset link has been sent' })
  } catch (error) {
    logger.error('Forgot password error:', error)
    // Still return success to not reveal information
    sendSuccess(res, { message: 'If an account exists, a reset link has been sent' })
  }
}

docRouter.post('/forgot-password', forgotPasswordRateLimiter, forgotPasswordController, {
  summary: 'Request password reset email',
  tags: ['Authentication'],
  bodySchema: forgotPasswordSchema,
  responseSchema: forgotPasswordResponseSchema,
  extraResponses: {
    429: {
      description: 'Too many attempts',
      schema: z.object({
        success: z.literal(false).describe('Whether the operation succeeded'),
        error: z.string().describe('Error message if operation failed'),
      }),
    },
  },
})

export default router
