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
import { AuthService } from '../../services/auth.service.js'
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
const registerController = async (req: any, res: any) => {
  try {
    const parsed = registerRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid registration request', parsed.error.issues)
    }

    const authCode = await AuthService.register(parsed.data)

    res.status(201)
    sendSuccess(res, {
      code: authCode.code,
      expires_at: authCode.expires_at,
      message: 'User registered successfully',
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
