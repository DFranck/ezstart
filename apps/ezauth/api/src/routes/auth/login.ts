import { createRouterWithDoc, OpenAPIRegistry, Router, createStrictRateLimiter, sendError, sendValidationError } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import { logger } from '@ezstart/logger/server'
import {
  loginRequestSchema,
  authCodeResponseSchema,
  errorResponseSchema
} from '@ezstart/auth-sdk/server'

export const loginRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(loginRegistry, router)

// ✅ Rate limiting for login endpoint (5 req/min per IP)
const loginRateLimiter = createStrictRateLimiter()

// Login user
const loginController = async (req: any, res: any) => {
  try {
    const parsed = loginRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid login request', parsed.error.issues)
    }

    const authCode = await AuthService.login(parsed.data)

    res.json({
      success: true,
      code: authCode.code,
      expires_at: authCode.expires_at,
      message: 'Login successful'
    })
  } catch (error) {
    logger.error('Login error:', error)
    sendError(res, error instanceof Error ? error.message : 'Login failed', 401)
  }
}

docRouter.post('/login', loginRateLimiter, loginController, {
  summary: 'Login user',
  tags: ['Authentication'],
  bodySchema: loginRequestSchema,
  responseSchema: authCodeResponseSchema,
  extraResponses: {
    401: { description: 'Login failed', schema: errorResponseSchema },
    429: { description: 'Too many login attempts', schema: errorResponseSchema }
  }
})

export default router
