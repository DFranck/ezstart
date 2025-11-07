import { createRouterWithDoc, OpenAPIRegistry, Router, createVeryStrictRateLimiter } from '@ezstart/express-core'
import { Router as ExpressRouter } from 'express'
import { AuthService } from '../../services/auth.service.js'
import {
  RegisterRequest,
  registerRequestSchema,
  authCodeResponseSchema,
  errorResponseSchema
} from '@ezstart/auth-sdk/server'

export const registerRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(registerRegistry, router)

// ✅ Rate limiting for register endpoint (3 req/hour per IP)
const registerRateLimiter = createVeryStrictRateLimiter()

// Register new user
const registerController = async (req: any, res: any) => {
  try {
    const data = req.body as RegisterRequest
    const authCode = await AuthService.register(data)

    res.status(201).json({
      success: true,
      code: authCode.code,
      expires_at: authCode.expires_at,
      message: 'User registered successfully'
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed'
    })
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
    429: { description: 'Too many registration attempts', schema: errorResponseSchema }
  }
})

export default router
