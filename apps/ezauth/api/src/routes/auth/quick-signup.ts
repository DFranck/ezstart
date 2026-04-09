import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createVeryStrictRateLimiter,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { AuthService } from '../../services/auth.service.js'
import { emailService } from '../../services/email.service.js'
import { welcomeSetPasswordTemplate } from '@ezstart/email-service'
import { getWebUrl } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger/server'

export const quickSignupRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(quickSignupRegistry, router)

// Rate limiting: 3 req/hour per IP (same as register)
const quickSignupRateLimiter = createVeryStrictRateLimiter()

const quickSignupSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username must be 50 characters or less')
    .describe('Unique username'),
  email: z.string().email('Invalid email format').describe('User email address'),
  app: z.string().min(1, 'App name is required').describe('App requesting signup'),
  promoCode: z.string().optional().describe('Promo code from referral/campaign'),
  emailSubject: z.string().max(200).optional().describe('Custom email subject override'),
  emailBody: z.string().max(2000).optional().describe('Custom message to include in the email'),
})

const quickSignupResponseSchema = z.object({
  user: z.object({}).passthrough().describe('User data'),
  accessToken: z.string().describe('JWT access token'),
  refreshToken: z.string().describe('Refresh token'),
})

const errorSchema = z.object({
  success: z.literal(false).describe('Whether the operation succeeded'),
  error: z.string().describe('Error message if operation failed'),
})

/** Map app slug to display name for emails */
function getAppDisplayName(app: string): string {
  const names: Record<string, string> = {
    ezstart: 'EZStart',
    ezauth: 'EZAuth',
    ezbill: 'EZBill',
    ezpay: 'EZPay',
    fengshui: 'FengShui',
    'asc-tcd': 'ASC-TCD',
    'green-pulse': 'GreenPulse',
    'gacha-analyzer': 'Gacha Analyzer',
  }
  return names[app] || app
}

const quickSignupController = async (req: Request, res: Response) => {
  try {
    const parsed = quickSignupSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid quick-signup request', parsed.error.issues)
    }

    const { username, email, app, promoCode, emailSubject, emailBody } = parsed.data
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

    // Generate a random password the user never sees
    const randomPassword = crypto.randomUUID()

    // Create user with hasSetOwnPassword: false
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

    // Generate access + refresh tokens (reuse loginWithToken flow internals)
    const payload = {
      email: normalizedEmail,
      password: randomPassword,
      app,
    }

    const authResult = await AuthService.loginWithToken(payload, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })

    // Send welcome email with set-password link
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

      const setPasswordUrl = `${getWebUrl('ezauth')}/reset-password?token=${token}`
      const appDisplayName = getAppDisplayName(app)

      await emailService.send({
        to: normalizedEmail,
        from: `${appDisplayName} <noreply@ezstart.xyz>`,
        subject: emailSubject || `Welcome to ${appDisplayName} — Set up your password`,
        html: welcomeSetPasswordTemplate(
          setPasswordUrl,
          appDisplayName,
          normalizedUsername,
          emailBody,
          promoCode
        ),
      })

      logger.info({ email: normalizedEmail, app }, 'Welcome email sent after quick-signup')
    } catch (emailError) {
      // Don't fail signup if email sending fails
      logger.error('Failed to send welcome email:', emailError)
    }

    sendSuccess(res.status(201), {
      user: authResult.user,
      accessToken: authResult.access_token,
      refreshToken: authResult.refreshToken,
    })
  } catch (error) {
    logger.error('Quick-signup error:', error)
    sendError(res, error instanceof Error ? error.message : 'Quick signup failed', 400)
  }
}

docRouter.post('/quick-signup', quickSignupRateLimiter, quickSignupController, {
  summary: 'Quick signup with username + email (no password required)',
  tags: ['Authentication'],
  bodySchema: quickSignupSchema,
  responseSchema: quickSignupResponseSchema,
  status: 201,
  extraResponses: {
    400: { description: 'Invalid request', schema: errorSchema },
    409: { description: 'User already exists', schema: errorSchema },
    429: { description: 'Too many signup attempts', schema: errorSchema },
  },
})

export default router
