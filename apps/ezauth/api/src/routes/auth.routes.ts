import { createRouterWithDoc, OpenAPIRegistry, z } from '@ezstart/express-core'
import { AuthService } from '../services/auth.service.js'
import { 
  LoginRequest,
  RegisterRequest,
  TokenRequest
} from '@ezstart/auth-sdk'
import express, { Router } from 'express'

export const authRegistry = new OpenAPIRegistry()
const router: Router = express.Router()
const docRouter = createRouterWithDoc(authRegistry, router)

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

// Login user  
const loginController = async (req: any, res: any) => {
  try {
    const data = req.body as LoginRequest
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
    const data = req.body as TokenRequest
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

// Define API routes (simplified without schemas for now)
router.post('/register', registerController)
router.post('/login', loginController)  
router.post('/token', tokenController)
router.get('/me', meController)
router.post('/verify', verifyController)

export default router