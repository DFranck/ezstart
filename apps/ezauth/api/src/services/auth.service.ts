import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getAuthUserModel, AuthUserDocument } from '../models/auth-user.js'
import { getAuthCodeModel } from '../models/auth-code.js'
import { getWaitlistModel } from '../models/waitlist.js'
import {
  getRefreshTokenModel,
  hashRefreshToken,
  generateRawRefreshToken,
} from '../models/refresh-token.js'
import {
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  AuthToken,
  AuthCode,
  AuthCodeResponse,
  JWTPayload,
} from '@ezstart/auth-sdk/server'
import { ROLE_PERMISSIONS, ROLE_FEATURES } from '@ezstart/rbac/server'
import { logger } from '@ezstart/logger/server'
import { mapToRecord } from '../utils/map-to-record.js'

const JWT_SECRET = process.env.JWT_SECRET!
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required')
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'
const REFRESH_TOKEN_DAYS = 30

function buildJwtPayload(user: AuthUserDocument) {
  return {
    userId: user._id!.toString(),
    email: user.email,
    username: user.username,
    apps: user.apps,
    globalRoles: user.globalRoles || [],
    appRoles: mapToRecord(user.appRoles),
    permissions: user.permissions || [],
    features: user.features || [],
  }
}

export class AuthService {
  // Register new user
  static async register(data: RegisterRequest): Promise<AuthCodeResponse> {
    const AuthUserModel = await getAuthUserModel()

    // Check if user already exists
    const existingUser = await AuthUserModel.findOne({
      $or: [{ email: data.email }, { username: data.username }],
    })

    if (existingUser) {
      throw new Error('User already exists with this email or username')
    }

    // Validate access code if provided
    let isBetaTester = false
    if (data.accessCode) {
      const WaitlistModel = await getWaitlistModel()

      // Find waitlist entry with this access code (dot-notation query for nested subdocument)
      const waitlist = await WaitlistModel.findOne({
        'emails.accessCode': data.accessCode,
      } as Record<string, string>)

      if (!waitlist) {
        throw new Error('Invalid access code')
      }

      const entry = waitlist.emails.find(
        (e: { accessCode: string | null }) => e.accessCode === data.accessCode
      )

      if (!entry) {
        throw new Error('Invalid access code')
      }

      if (entry.status !== 'invited') {
        throw new Error('Access code is not valid (already used or expired)')
      }

      // Mark as activated
      entry.status = 'activated'
      entry.activatedAt = new Date()
      await waitlist.save()

      isBetaTester = true
    }

    // Create new user
    const appRoles = new Map<string, string[]>()
    if (isBetaTester) {
      appRoles.set(data.app, ['beta-tester'])
    }

    const user = new AuthUserModel({
      email: data.email,
      username: data.username,
      passwordHash: data.password, // Will be hashed by pre-save hook
      firstName: data.firstName,
      lastName: data.lastName,
      apps: [data.app], // Grant access to the requesting app
      isVerified: false, // Requires email verification
      // Assign role and permissions (app-specific)
      appRoles,
      permissions: isBetaTester ? ROLE_PERMISSIONS['beta-tester'] : [],
      features: isBetaTester ? ROLE_FEATURES['beta-tester'] : [],
    })

    await user.save()

    // Generate auth code
    return this.generateAuthCode(user._id!.toString(), data.app, data.redirect_uri)
  }

  /**
   * Validate user credentials without generating an auth code.
   * Used by the login route to check credentials before 2FA.
   * Returns the user ID on success.
   */
  static async validateCredentials(data: LoginRequest): Promise<string> {
    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findOne({
      $or: [{ email: data.email }, { username: data.email }],
    })
    if (!user) {
      throw new Error('Invalid credentials')
    }

    const isValidPassword = await user.comparePassword(data.password)
    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Grant access to new app automatically in v1
    if (!user.apps.includes(data.app)) {
      user.apps.push(data.app)
      await user.save()
    }

    return user._id!.toString()
  }

  // Login user
  static async login(data: LoginRequest): Promise<AuthCodeResponse> {
    const userId = await this.validateCredentials(data)
    return this.generateAuthCode(userId, data.app, data.redirect_uri)
  }

  // ✅ NEW: Login with direct token (httpOnly cookie mode)
  static async loginWithToken(
    data: LoginRequest,
    meta?: { userAgent?: string; ip?: string }
  ): Promise<AuthToken & { refreshToken: string }> {
    const AuthUserModel = await getAuthUserModel()

    // Find user by email OR username
    const user = await AuthUserModel.findOne({
      $or: [{ email: data.email }, { username: data.email }],
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

    // Generate short-lived access token
    const payload = buildJwtPayload(user)
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN as any })

    // Generate refresh token
    const rawRefreshToken = await this.generateRefreshToken(
      user._id!.toString(),
      meta?.userAgent,
      meta?.ip
    )

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 15 * 60, // 15 minutes in seconds
      user: user.toAuthUser(),
      refreshToken: rawRefreshToken,
    }
  }

  // Exchange code for token
  static async exchangeCodeForToken(
    data: TokenRequest,
    meta?: { userAgent?: string; ip?: string }
  ): Promise<AuthToken & { refreshToken: string }> {
    const AuthCodeModel = await getAuthCodeModel()
    const AuthUserModel = await getAuthUserModel()
    logger.debug(
      { code: data.code, app: data.app, redirect_uri: data.redirect_uri },
      'Looking for auth code'
    )

    // Find and validate auth code
    const authCode = await AuthCodeModel.findOne({
      code: data.code,
      app: data.app,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    logger.debug({ found: !!authCode, app: data.app }, 'Auth code lookup result')

    if (!authCode) {
      logger.debug({ app: data.app }, 'No valid auth code found')
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

    // Generate short-lived access token
    const payload = buildJwtPayload(user)
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN as any })

    // Generate refresh token
    const rawRefreshToken = await this.generateRefreshToken(
      user._id!.toString(),
      meta?.userAgent,
      meta?.ip
    )

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 15 * 60, // 15 minutes in seconds
      user: user.toAuthUser(),
      refreshToken: rawRefreshToken,
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

  /**
   * Public wrapper for generating auth codes (used by 2FA validate route)
   */
  static async generateAuthCodePublic(
    userId: string,
    app: string,
    redirectUri?: string
  ): Promise<AuthCodeResponse> {
    return this.generateAuthCode(userId, app, redirectUri)
  }

  // Private: Generate auth code
  private static async generateAuthCode(
    userId: string,
    app: string,
    redirectUri?: string
  ): Promise<AuthCodeResponse> {
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

  // --- Refresh Token Management ---

  /**
   * Create and store a refresh token for a user.
   * Returns the raw (unhashed) token to send to the client.
   */
  static async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ip?: string
  ): Promise<string> {
    const RefreshTokenModel = await getRefreshTokenModel()
    const rawToken = generateRawRefreshToken()
    const tokenHash = hashRefreshToken(rawToken)

    await RefreshTokenModel.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
      userAgent,
      ip,
    })

    return rawToken
  }

  /**
   * Validate a refresh token, rotate it (revoke old, create new), and return
   * new access + refresh tokens.
   */
  static async refreshAccessToken(
    rawRefreshToken: string,
    meta?: { userAgent?: string; ip?: string }
  ): Promise<AuthToken & { refreshToken: string }> {
    const RefreshTokenModel = await getRefreshTokenModel()
    const AuthUserModel = await getAuthUserModel()
    const tokenHash = hashRefreshToken(rawRefreshToken)

    // Find the stored token
    const storedToken = await RefreshTokenModel.findOne({ tokenHash })

    if (!storedToken) {
      throw new Error('Invalid refresh token')
    }

    if (storedToken.isRevoked) {
      // Possible token reuse attack — revoke ALL tokens for this user
      logger.warn(
        { userId: storedToken.userId.toString() },
        'Revoked refresh token reuse detected — revoking all user tokens'
      )
      await RefreshTokenModel.updateMany(
        { userId: storedToken.userId },
        { $set: { isRevoked: true } }
      )
      throw new Error('Refresh token has been revoked')
    }

    if (storedToken.expiresAt < new Date()) {
      throw new Error('Refresh token has expired')
    }

    // Revoke the old token (rotation)
    storedToken.isRevoked = true
    await storedToken.save()

    // Get user
    const user = await AuthUserModel.findById(storedToken.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Generate new access token
    const payload = buildJwtPayload(user)
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN as any })

    // Generate new refresh token
    const newRawRefreshToken = await this.generateRefreshToken(
      user._id!.toString(),
      meta?.userAgent || storedToken.userAgent,
      meta?.ip || storedToken.ip
    )

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 15 * 60,
      user: user.toAuthUser(),
      refreshToken: newRawRefreshToken,
    }
  }

  /**
   * Revoke a specific refresh token by its document ID.
   */
  static async revokeRefreshToken(tokenId: string, userId: string): Promise<void> {
    const RefreshTokenModel = await getRefreshTokenModel()
    const token = await RefreshTokenModel.findOne({ _id: tokenId, userId })

    if (!token) {
      throw new Error('Session not found')
    }

    token.isRevoked = true
    await token.save()
  }

  /**
   * Revoke all refresh tokens for a user (logout everywhere).
   */
  static async revokeAllUserTokens(userId: string): Promise<number> {
    const RefreshTokenModel = await getRefreshTokenModel()
    const result = await RefreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } }
    )
    return result.modifiedCount
  }

  /**
   * Get all active (non-revoked, non-expired) sessions for a user.
   */
  static async getUserSessions(userId: string, currentTokenHash?: string) {
    const RefreshTokenModel = await getRefreshTokenModel()
    const sessions = await RefreshTokenModel.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select('_id userAgent ip createdAt expiresAt tokenHash')
      .lean()

    return sessions.map(s => ({
      id: s._id.toString(),
      userAgent: s.userAgent || null,
      ip: s.ip || null,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: currentTokenHash ? s.tokenHash === currentTokenHash : false,
    }))
  }
}
