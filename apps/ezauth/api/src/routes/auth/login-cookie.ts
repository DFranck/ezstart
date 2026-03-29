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
import { AuthService } from '../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import {
  loginRequestSchema,
  userResponseSchema,
  errorResponseSchema,
} from '@ezstart/auth-sdk/server'

export const loginCookieRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(loginCookieRegistry, router)

// Rate limiting for login-cookie endpoint (5 req/min per IP)
const loginCookieRateLimiter = createStrictRateLimiter()

// Login with httpOnly cookie (DUAL-MODE)
const loginCookieController = async (req: any, res: any) => {
  try {
    const parsed = loginRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid login request', parsed.error.issues)
    }

    // Get token directly (skip auth code)
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

docRouter.post('/login-cookie', loginCookieRateLimiter, loginCookieController, {
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
