import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  sendSuccess,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { emailService } from '../../services/email.service.js'
import { passwordResetTemplate } from '@ezstart/email-service'
import type { EmailContext } from '@ezstart/email-service'
import { forgotPasswordRequestSchema } from '@ezstart/auth-sdk/server'
import { getWebUrl } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger/server'
import { getAppDisplayName, buildAuthEmailParams } from '../../utils/app-display.js'

export const forgotPasswordRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(forgotPasswordRegistry, router)

// Rate limit — 2 req/min per IP (anti email-bombing).
// Each successful POST triggers a password-reset email send; we want the tightest
// safe budget. The handler always returns 200 so legitimate users typing the wrong
// email won't see the limiter, but a bot spamming addresses hits the wall fast.
const forgotPasswordRateLimiter = createStrictRateLimiter({
  windowMs: 60_000,
  max: 2,
  message: 'Too many password reset attempts, please try again later.',
})

const forgotPasswordResponseSchema = z.object({
  message: z.string().describe('Response message'),
})

const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid email address', parsed.error.issues)
    }

    const { email, app, redirect_uri, locale, emailOverride } = parsed.data
    const appKey = app || 'ezstart'
    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findOne({ email: email.toLowerCase() })

    if (user) {
      const AuthCodeModel = await getAuthCodeModel()
      const token = crypto.randomBytes(32).toString('hex')

      const authCode = new AuthCodeModel({
        code: token,
        userId: user._id!.toString(),
        type: 'password-reset',
        app: appKey,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      })

      await authCode.save()

      const appDisplayName = getAppDisplayName(app)
      const params = buildAuthEmailParams(token, app, redirect_uri)
      const resetUrl = `${getWebUrl('ezauth')}/reset-password?${params}`

      const ctx: EmailContext = {
        appName: appDisplayName,
        appKey,
        locale,
        overrides: emailOverride,
      }
      const rendered = passwordResetTemplate({ resetUrl }, ctx)

      await emailService.send({
        to: user.email,
        from: rendered.from ?? `${appDisplayName} <noreply@ezstart.xyz>`,
        ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
        subject: rendered.subject,
        html: rendered.html,
        ...(rendered.text ? { text: rendered.text } : {}),
      })

      logger.info({ email: user.email, locale, appKey }, 'Password reset email sent')
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
  bodySchema: forgotPasswordRequestSchema,
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
