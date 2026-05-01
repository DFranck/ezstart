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
import crypto from 'crypto'
import { AuthService } from '../../services/auth.service.js'
import { requireTurnstile } from '../../middleware/turnstile-required.js'
import { checkDemoQuotas } from '../../middleware/check-demo-quotas.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { emailService } from '../../services/email.service.js'
import { emailVerificationTemplate } from '@ezstart/email-service'
import type { EmailContext } from '@ezstart/email-service'
import { getWebUrl } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger/server'
import { getAppDisplayName, buildAuthEmailParams } from '../../utils/app-display.js'
import { resolveUserLocale } from '../../utils/locale.js'
import {
  registerRequestSchema,
  authCodeResponseSchema,
  errorResponseSchema,
} from '@ezstart/auth-sdk/server'

export const registerRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(registerRegistry, router)

// Rate limiting for register endpoint — 3 req/min per IP (anti-spam account creation).
// Stricter than login (5/min) because each successful POST triggers an email send +
// DB insert; abuse vector for both spam and resource exhaustion.
const registerRateLimiter = createStrictRateLimiter({
  windowMs: 60_000,
  max: 3,
  message: 'Too many registration attempts, please try again later.',
})

// Register new user
const registerController = async (req: Request, res: Response) => {
  try {
    const parsed = registerRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid registration request', parsed.error.issues)
    }

    const authCode = await AuthService.register(parsed.data)

    // Send verification email
    try {
      const AuthUserModel = await getAuthUserModel()
      const user = await AuthUserModel.findOne({ email: parsed.data.email })

      if (user) {
        const AuthCodeModel = await getAuthCodeModel()
        const token = crypto.randomBytes(32).toString('hex')

        const verificationCode = new AuthCodeModel({
          code: token,
          userId: user._id!.toString(),
          type: 'email-verification',
          app: parsed.data.app,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        })

        await verificationCode.save()

        const appDisplayName = getAppDisplayName(parsed.data.app)
        const params = buildAuthEmailParams(token, parsed.data.app, parsed.data.redirect_uri)
        const verifyUrl = `${getWebUrl('ezauth')}/verify-email?${params}`

        // Body-locale wins (form-provided); otherwise infer from
        // Accept-Language so the verification email matches the browser the
        // user just registered from.
        const locale = resolveUserLocale(req, parsed.data.locale)
        const ctx: EmailContext = {
          appName: appDisplayName,
          appKey: parsed.data.app,
          locale,
          overrides: parsed.data.emailOverride,
        }
        const rendered = emailVerificationTemplate({ verifyUrl }, ctx)

        await emailService.send({
          to: user.email,
          from: rendered.from ?? `${appDisplayName} <noreply@ezstart.xyz>`,
          ...(rendered.replyTo ? { replyTo: rendered.replyTo } : {}),
          subject: rendered.subject,
          html: rendered.html,
          ...(rendered.text ? { text: rendered.text } : {}),
        })

        logger.info(
          { email: user.email, locale, appKey: parsed.data.app },
          'Verification email sent after registration'
        )
      }
    } catch (emailError) {
      // Don't fail registration if email sending fails
      logger.error('Failed to send verification email:', emailError)
    }

    sendSuccess(res.status(201), {
      code: authCode.code,
      expires_at: authCode.expires_at,
      message: 'User registered successfully. Please check your email to verify your account.',
    })
  } catch (error) {
    logger.error('Register error:', error)
    sendError(res, error instanceof Error ? error.message : 'Registration failed', 400)
  }
}

// `checkDemoQuotas` is mounted between the rate limiter and the turnstile
// captcha so demo-targeted requests trip the sandbox quota gate FIRST.
// Non-demo (`req.body.app !== '_docs-demo'`) traffic short-circuits the
// middleware (no Mongo lookup) and falls through to the regular flow.
docRouter.post(
  '/register',
  registerRateLimiter,
  checkDemoQuotas,
  requireTurnstile(),
  registerController,
  {
    summary: 'Register new user',
    tags: ['Authentication'],
    bodySchema: registerRequestSchema,
    responseSchema: authCodeResponseSchema,
    status: 201,
    extraResponses: {
      400: { description: 'Registration failed', schema: errorResponseSchema },
      429: { description: 'Too many registration attempts', schema: errorResponseSchema },
    },
  }
)

export default router
