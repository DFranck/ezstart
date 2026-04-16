import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createVeryStrictRateLimiter,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { emailService } from '../../services/email.service.js'
import { welcomeSetPasswordTemplate } from '@ezstart/email-service'
import type { EmailContext } from '@ezstart/email-service'
import { quickSignupRequestSchema } from '@ezstart/auth-sdk/server'
import { getWebUrl } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger/server'
import { getAppDisplayName, buildAuthEmailParams } from '../../utils/app-display.js'
import { issueSession } from '../../services/auth.service.js'

export const quickSignupRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(quickSignupRegistry, router)

// Rate limiting: 3 req/hour per IP (same as register)
const quickSignupRateLimiter = createVeryStrictRateLimiter()

const quickSignupResponseSchema = z.object({
  user: z.object({}).passthrough().describe('Authenticated user'),
  accessToken: z.string().describe('JWT access token for the new session'),
  refreshToken: z.string().describe('Refresh token to persist client-side (localStorage mode)'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Whether the operation succeeded'),
  error: z.string().describe('Error message if operation failed'),
})

const quickSignupController = async (req: Request, res: Response) => {
  try {
    const parsed = quickSignupRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid quick-signup request', parsed.error.issues)
    }

    const { username, email, app, promoCode, locale, emailOverride } = parsed.data
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedEmail = email.trim().toLowerCase()

    const AuthUserModel = await getAuthUserModel()

    // Check uniqueness (username + email)
    const existingUser = await AuthUserModel.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    })

    if (existingUser) {
      return sendError(res, 'User already exists with this email or username', 409)
    }

    // Generate a random password the user never sees — must be replaced via
    // the emailed set-password link before the account is usable.
    const randomPassword = crypto.randomUUID()

    // Create user with hasSetOwnPassword: false and isVerified: false.
    const user = new AuthUserModel({
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash: randomPassword, // Will be hashed by pre-save hook
      apps: [app],
      isVerified: false,
      hasSetOwnPassword: false,
      ...(promoCode ? { promoCode } : {}),
    })

    await user.save()

    // Send welcome email with set-password link (doubles as email verification).
    try {
      const AuthCodeModel = await getAuthCodeModel()
      const token = crypto.randomBytes(32).toString('hex')

      const setPasswordCode = new AuthCodeModel({
        code: token,
        userId: user._id!.toString(),
        type: 'password-reset',
        app,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      })

      await setPasswordCode.save()

      const setPasswordUrl = `${getWebUrl('ezauth')}/reset-password?${buildAuthEmailParams(token, app)}`
      const appDisplayName = getAppDisplayName(app)

      const ctx: EmailContext = {
        appName: appDisplayName,
        appKey: app,
        locale,
        overrides: emailOverride,
      }
      const rendered = welcomeSetPasswordTemplate(
        {
          setPasswordUrl,
          username: normalizedUsername,
          ...(promoCode ? { promoCode } : {}),
        },
        ctx
      )

      await emailService.send({
        to: normalizedEmail,
        from: rendered.from ?? `${appDisplayName} <noreply@ezstart.xyz>`,
        ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
        subject: rendered.subject,
        html: rendered.html,
        ...(rendered.text ? { text: rendered.text } : {}),
      })

      logger.info({ email: normalizedEmail, app, locale }, 'Welcome email sent after quick-signup')
    } catch (emailError) {
      // Don't fail signup if email sending fails — the user can request another email.
      logger.error('Failed to send welcome email:', emailError)
    }

    // Auto-login the user: the welcome email still doubles as email verification
    // (they must click the link to mark isVerified=true and set a real password),
    // but consumers like green-pulse/earthday need an immediate session to read
    // the applied promo. OAuth account-takeover via unverified email is blocked
    // separately in oauth.service.ts.
    const session = await issueSession(user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    sendSuccess(res.status(201), {
      user: session.user,
      accessToken: session.access_token,
      refreshToken: session.refreshToken,
    })
  } catch (error) {
    logger.error('Quick-signup error:', error)
    sendError(res, error instanceof Error ? error.message : 'Quick signup failed', 400)
  }
}

docRouter.post('/quick-signup', quickSignupRateLimiter, quickSignupController, {
  summary: 'Quick signup with username + email (no password required)',
  tags: ['Authentication'],
  bodySchema: quickSignupRequestSchema,
  responseSchema: quickSignupResponseSchema,
  status: 201,
  extraResponses: {
    400: { description: 'Invalid request', schema: errorSchema },
    409: { description: 'User already exists', schema: errorSchema },
    429: { description: 'Too many signup attempts', schema: errorSchema },
  },
})

export default router
