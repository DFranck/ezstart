import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createVeryStrictRateLimiter,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { verifyTokenMiddleware } from '../../middleware/auth.js'
import { emailService } from '../../services/email.service.js'
import { emailVerificationTemplate } from '@ezstart/email-service'
import { getWebUrl } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger/server'
import { getAppDisplayName, buildAuthEmailParams } from '../../utils/app-display.js'

export const sendVerificationRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(sendVerificationRegistry, router)

/** Strict rate limit: 3 requests per 15 minutes */
const sendVerificationRateLimiter = createVeryStrictRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many verification email requests, please try again later.',
})

const sendVerificationRequestSchema = z.object({
  app: z.string().optional().describe('App requesting the verification email'),
  redirect_uri: z
    .string()
    .url()
    .optional()
    .describe('Redirect URI to return to after verification'),
})

const sendVerificationResponseSchema = z.object({
  message: z.string().describe('Response message'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Whether the operation succeeded'),
  error: z.string().describe('Error message if operation failed'),
})

const sendVerificationController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(userId)

    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    if (user.isVerified) {
      return sendSuccess(res, { message: 'Email already verified' })
    }

    const parsedBody = sendVerificationRequestSchema.safeParse(req.body ?? {})
    const app = parsedBody.success ? parsedBody.data.app : undefined
    const redirect_uri = parsedBody.success ? parsedBody.data.redirect_uri : undefined

    const AuthCodeModel = await getAuthCodeModel()
    const token = crypto.randomBytes(32).toString('hex')

    const verificationCode = new AuthCodeModel({
      code: token,
      userId: user._id!.toString(),
      type: 'email-verification',
      app: app || 'ezstart',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })

    await verificationCode.save()

    const appDisplayName = getAppDisplayName(app)
    const params = buildAuthEmailParams(token, app, redirect_uri)
    const verifyUrl = `${getWebUrl('ezauth')}/verify-email?${params}`

    await emailService.send({
      to: user.email,
      subject: `[${appDisplayName}] Verify your email address`,
      html: emailVerificationTemplate(verifyUrl, appDisplayName),
    })

    logger.info({ email: user.email }, 'Verification email resent')

    sendSuccess(res, { message: 'Verification email sent' })
  } catch (error) {
    logger.error('Send verification error:', error)
    sendError(res, 'Failed to send verification email', 500)
  }
}

docRouter.post(
  '/send-verification',
  sendVerificationRateLimiter,
  verifyTokenMiddleware,
  sendVerificationController,
  {
    summary: 'Resend email verification link',
    tags: ['Authentication'],
    bodySchema: sendVerificationRequestSchema,
    responseSchema: sendVerificationResponseSchema,
    extraResponses: {
      401: { description: 'Authentication required', schema: errorSchema },
      404: { description: 'User not found', schema: errorSchema },
      429: { description: 'Too many attempts', schema: errorSchema },
      500: { description: 'Server error', schema: errorSchema },
    },
  }
)

export default router
