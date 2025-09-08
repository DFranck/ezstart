import { createRouterWithDoc, OpenAPIRegistry, z } from '@ezstart/api-core'
import { AuthService } from '../services/auth.service.js'
import { 
  LoginRequestSchema,
  RegisterRequestSchema,
  TokenRequestSchema,
  AuthResponseSchema,
  UserResponseSchema,
  TokenVerifyResponseSchema
} from '@ezstart/ezauth-types'
import express, { Router } from 'express'

export const authRegistry = new OpenAPIRegistry()
const router: Router = express.Router()
const docRouter = createRouterWithDoc(authRegistry, router)

// Register new user
const registerController = async (req: any, res: any) => {
  try {
    const data = RegisterRequestSchema.parse(req.body)
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

// Login user  
const loginController = async (req: any, res: any) => {
  try {
    const data = LoginRequestSchema.parse(req.body)
    const authCode = await AuthService.login(data)
    
    res.json({
      success: true,
      code: authCode.code,
      expires_at: authCode.expires_at,
      message: 'Login successful'
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    })
  }
}

// Exchange code for token
const tokenController = async (req: any, res: any) => {
  try {
    console.log('📋 Token exchange request body:', req.body)
    const data = TokenRequestSchema.parse(req.body)
    console.log('✅ Parsed token request data:', data)
    const token = await AuthService.exchangeCodeForToken(data)
    
    res.json({
      success: true,
      ...token
    })
  } catch (error) {
    console.error('Token exchange error:', error)
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed'
    })
  }
}

// Get current user info
const meController = async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      })
    }

    const token = authHeader.substring(7)
    const payload = await AuthService.verifyToken(token)
    const user = await AuthService.getUserById(payload.userId)
    
    res.json({
      success: true,
      user
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token'
    })
  }
}

// Verify token validity
const verifyController = async (req: any, res: any) => {
  try {
    const { token, app } = req.body
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      })
    }

    const payload = await AuthService.verifyToken(token)
    
    // Check app access if specified
    if (app) {
      const hasAccess = await AuthService.checkAppAccess(payload.userId, app)
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: `No access to app: ${app}`
        })
      }
    }
    
    res.json({
      success: true,
      valid: true,
      payload: {
        userId: payload.userId,
        email: payload.email,
        username: payload.username,
        apps: payload.apps,
        exp: payload.exp
      }
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token'
    })
  }
}

// Define API routes with documentation
docRouter.post('/register', registerController, {
  summary: 'Register new user',
  tags: ['Auth'],
  bodySchema: RegisterRequestSchema,
  responseSchema: AuthResponseSchema.extend({
    code: z.string(),
    expires_at: z.string()
  })
})

docRouter.post('/login', loginController, {
  summary: 'Login user',
  tags: ['Auth'],
  bodySchema: LoginRequestSchema,
  responseSchema: AuthResponseSchema.extend({
    code: z.string(),
    expires_at: z.string()
  })
})

docRouter.post('/token', tokenController, {
  summary: 'Exchange code for token',
  tags: ['Auth'],
  bodySchema: TokenRequestSchema,
  responseSchema: AuthResponseSchema.extend({
    access_token: z.string(),
    token_type: z.literal('Bearer'),
    expires_in: z.number(),
    user: z.object({}).passthrough()
  })
})

docRouter.get('/me', meController, {
  summary: 'Get current user',
  tags: ['Auth'],
  responseSchema: UserResponseSchema
})

docRouter.post('/verify', verifyController, {
  summary: 'Verify token',
  tags: ['Auth'],
  bodySchema: z.object({
    token: z.string().min(1),
    app: z.string().optional()
  }),
  responseSchema: TokenVerifyResponseSchema
})

export default router