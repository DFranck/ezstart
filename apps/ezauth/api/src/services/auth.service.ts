import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getAuthUserModel, AuthUserDocument } from '../models/auth-user.js'
import { getAuthCodeModel } from '../models/auth-code.js'
import {
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  AuthToken,
  AuthCode,
  AuthCodeResponse,
  JWTPayload
} from '@ezstart/auth-sdk/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

export class AuthService {
  // Register new user
  static async register(data: RegisterRequest): Promise<AuthCodeResponse> {
    const AuthUserModel = await getAuthUserModel()

    // Check if user already exists
    const existingUser = await AuthUserModel.findOne({
      $or: [{ email: data.email }, { username: data.username }]
    })

    if (existingUser) {
      throw new Error('User already exists with this email or username')
    }

    // Create new user
    const user = new AuthUserModel({
      email: data.email,
      username: data.username,
      passwordHash: data.password, // Will be hashed by pre-save hook
      firstName: data.firstName,
      lastName: data.lastName,
      apps: [data.app], // Grant access to the requesting app
      isVerified: true, // For simplicity in v1
    })

    await user.save()

    // Generate auth code
    return this.generateAuthCode(user._id!.toString(), data.app, data.redirect_uri)
  }

  // Login user
  static async login(data: LoginRequest): Promise<AuthCodeResponse> {
    const AuthUserModel = await getAuthUserModel()
    // Find user by email OR username
    const user = await AuthUserModel.findOne({
      $or: [
        { email: data.email },
        { username: data.email } // Allow using email field for username too
      ]
    })
    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Check password
    const isValidPassword = await user.comparePassword(data.password)
    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Check if user has access to the app
    if (!user.apps.includes(data.app)) {
      // Grant access to new app automatically in v1
      user.apps.push(data.app)
      await user.save()
    }

    // Generate auth code
    return this.generateAuthCode(user._id!.toString(), data.app, data.redirect_uri)
  }

  // ✅ NEW: Login with direct token (httpOnly cookie mode)
  static async loginWithToken(data: LoginRequest): Promise<AuthToken> {
    const AuthUserModel = await getAuthUserModel()

    // Find user by email OR username
    const user = await AuthUserModel.findOne({
      $or: [
        { email: data.email },
        { username: data.email }
      ]
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Check password
    const isValidPassword = await user.comparePassword(data.password)
    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Check if user has access to the app
    if (!user.apps.includes(data.app)) {
      user.apps.push(data.app)
      await user.save()
    }

    // Generate JWT token directly (skip auth code)
    const payload = {
      userId: user._id!.toString(),
      email: user.email,
      username: user.username,
      apps: user.apps
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
      user: user.toAuthUser(),
    }
  }

  // Exchange code for token
  static async exchangeCodeForToken(data: TokenRequest): Promise<AuthToken> {
    const AuthCodeModel = await getAuthCodeModel()
    const AuthUserModel = await getAuthUserModel()
    console.log('🔍 Looking for auth code with:', {
      code: data.code,
      app: data.app,
      redirect_uri: data.redirect_uri
    })
    
    // Find and validate auth code
    const authCode = await AuthCodeModel.findOne({
      code: data.code,
      app: data.app,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    })

    console.log('📄 Found auth code:', authCode ? {
      id: authCode._id,
      code: authCode.code,
      app: authCode.app,
      redirectUri: authCode.redirectUri,
      isUsed: authCode.isUsed,
      expiresAt: authCode.expiresAt
    } : 'null')

    if (!authCode) {
      // Let's also check what codes exist in DB for debugging
      const allCodes = await AuthCodeModel.find({ app: data.app }).sort({ createdAt: -1 }).limit(3)
      console.log('🔍 Recent codes for app:', allCodes.map(c => ({
        code: c.code,
        app: c.app,
        isUsed: c.isUsed,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt
      })))
      throw new Error('Invalid or expired authorization code')
    }

    // Mark code as used
    authCode.isUsed = true
    await authCode.save()

    // Get user
    const user = await AuthUserModel.findById(authCode.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Generate JWT token
    const payload = {
      userId: user._id!.toString(),
      email: user.email,
      username: user.username,
      apps: user.apps
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
      user: user.toAuthUser(),
    }
  }

  // Verify JWT token
  static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
      return payload
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  // Get user by ID
  static async getUserById(userId: string) {
    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }
    return user.toAuthUser()
  }

  // Private: Generate auth code
  private static async generateAuthCode(userId: string, app: string, redirectUri?: string): Promise<AuthCodeResponse> {
    const AuthCodeModel = await getAuthCodeModel()
    const code = crypto.randomBytes(32).toString('hex')
    
    const authCode = new AuthCodeModel({
      code,
      userId,
      app,
      redirectUri,
    })

    await authCode.save()

    return {
      code,
      expires_at: authCode.expiresAt.toISOString(),
    }
  }

  // Check if user has access to app
  static async checkAppAccess(userId: string, app: string): Promise<boolean> {
    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(userId)
    return user ? user.apps.includes(app) : false
  }
}