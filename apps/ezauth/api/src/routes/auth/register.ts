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
import crypto from 'crypto'
import { AuthService } from '../../services/auth.service.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { emailService } from '../../services/email.service.js'
import { emailVerificationTemplate } from '@ezstart/email-service'
import { getWebUrl } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger/server'
import {
  registerRequestSchema,
  authCodeResponseSchema,
  errorResponseSchema,
} from '@ezstart/auth-sdk/server'

export const registerRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(registerRegistry, router)

// ✅ Rate limiting for register endpoint (3 req/hour per IP)
const registerRateLimiter = createVeryStrictRateLimiter()

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

        const verifyUrl = `${getWebUrl('ezauth')}/verify-email?token=${token}`

        await emailService.send({
          to: user.email,
          subject: 'Verify your email address',
          html: emailVerificationTemplate(verifyUrl, 'EZAuth'),
        })

        logger.info({ email: user.email }, 'Verification email sent after registration')
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

docRouter.post('/register', registerRateLimiter, registerController, {
  summary: 'Register new user',
  tags: ['Authentication'],
  bodySchema: registerRequestSchema,
  responseSchema: authCodeResponseSchema,
  status: 201,
  extraResponses: {
    400: { description: 'Registration failed', schema: errorResponseSchema },
    429: { description: 'Too many registration attempts', schema: errorResponseSchema },
  },
})

export default router
