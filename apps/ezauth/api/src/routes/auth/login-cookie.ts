import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  createStrictRateLimiter,
  createCsrfMiddleware,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { TotpService } from '../../services/totp.service.js'
import { logger } from '@ezstart/logger/server'
import {
  loginRequestSchema,
  userResponseSchema,
  errorResponseSchema,
} from '@ezstart/auth-sdk/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export const loginCookieRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(loginCookieRegistry, router)

// Rate limiting for login-cookie endpoint (5 req/min per IP)
const loginCookieRateLimiter = createStrictRateLimiter()
const csrf = createCsrfMiddleware()

// Login with httpOnly cookie (DUAL-MODE)
const loginCookieController = async (req: Request, res: Response) => {
  try {
    const parsed = loginRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid login request', parsed.error.issues)
    }

    // Validate credentials first
    const userId = await AuthService.validateCredentials(parsed.data)

    // Check if user has 2FA enabled
    const has2FA = await TotpService.isEnabled(userId)

    if (has2FA) {
      const tempToken = jwt.sign(
        {
          userId,
          app: parsed.data.app,
          redirect_uri: parsed.data.redirect_uri,
          type: '2fa_pending',
          mode: 'cookie',
        },
        JWT_SECRET,
        { expiresIn: '5m' }
      )

      return sendSuccess(res, {
        requires2FA: true,
        tempToken,
        message: 'Two-factor authentication required',
      })
    }

    // No 2FA — proceed with normal login
    const authResult = await AuthService.loginWithToken(parsed.data)

    // Set httpOnly cookie
    res.cookie('ezauth_token', authResult.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined,
    })

    // Return user info (frontend will store in localStorage for client-side access)
    sendSuccess(res, { user: authResult.user })
  } catch (error) {
    logger.error('Login cookie error:', error)
    sendError(res, error instanceof Error ? error.message : 'Login failed', 401)
  }
}

// Generate CSRF token (client calls GET before POST)
docRouter.get(
  '/login-cookie/csrf',
  csrf.generateToken,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- createRouterWithDoc handler type mismatch
  ((_req: Request, res: Response) => {
    sendSuccess(res, { message: 'CSRF token generated' })
  }) as any,
  {
    summary: 'Generate CSRF token for login-cookie',
    tags: ['Authentication'],
  }
)

docRouter.post('/login-cookie', loginCookieRateLimiter, csrf.verifyToken, loginCookieController, {
  summary: 'Login with httpOnly cookie (dual-mode)',
  tags: ['Authentication'],
  bodySchema: loginRequestSchema,
  responseSchema: userResponseSchema,
  extraResponses: {
    401: { description: 'Login failed', schema: errorResponseSchema },
    429: { description: 'Too many login attempts', schema: errorResponseSchema },
  },
})

export default router
