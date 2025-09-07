import { Router } from 'express'
import { AuthService } from '../services/auth.service.js'
import { 
  LoginRequestSchema, 
  RegisterRequestSchema, 
  TokenRequestSchema 
} from '../types/auth.js'

const router: Router = Router()

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
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
})

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
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
})

// POST /api/auth/token - Exchange code for token
router.post('/token', async (req, res) => {
  try {
    const data = TokenRequestSchema.parse(req.body)
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
})

// GET /api/auth/me - Get current user info
router.get('/me', async (req, res) => {
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
})

// POST /api/auth/verify - Verify token validity
router.post('/verify', async (req, res) => {
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
})

export default router