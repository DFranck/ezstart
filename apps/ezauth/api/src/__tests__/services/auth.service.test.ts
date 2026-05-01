import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { AuthService, issueSession, buildJwtPayload } from '../../services/auth.service.js'
import { createUser, createAuthCode, cleanAllCollections } from '../helpers/setup.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { getRefreshTokenModel, hashRefreshToken } from '../../models/refresh-token.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod'

describe('AuthService', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('register', () => {
    it('should register a new user and return auth code', async () => {
      const result = await AuthService.register({
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'Password123!',
        app: 'ezstart',
      })

      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('expires_at')
      expect(result.code).toBeTruthy()
    })

    it('should throw if email already exists', async () => {
      await createUser({ email: 'taken@example.com', username: 'user1' })

      await expect(
        AuthService.register({
          email: 'taken@example.com',
          username: 'user2',
          password: 'Password123!',
          app: 'ezstart',
        })
      ).rejects.toThrow('User already exists')
    })

    it('should throw if username already exists', async () => {
      await createUser({ email: 'user1@example.com', username: 'takenname' })

      await expect(
        AuthService.register({
          email: 'user2@example.com',
          username: 'takenname',
          password: 'Password123!',
          app: 'ezstart',
        })
      ).rejects.toThrow('User already exists')
    })
  })

  describe('validateCredentials', () => {
    it('should return userId for valid email + password', async () => {
      const user = await createUser({
        email: 'valid@example.com',
        username: 'validuser',
        password: 'SecurePass123',
      })

      const userId = await AuthService.validateCredentials({
        email: 'valid@example.com',
        password: 'SecurePass123',
        app: 'ezstart',
      })

      expect(userId).toBe(user._id!.toString())
    })

    it('should return userId when logging in by username', async () => {
      const user = await createUser({
        email: 'user@example.com',
        username: 'myusername',
        password: 'SecurePass123',
      })

      const userId = await AuthService.validateCredentials({
        email: 'myusername', // username in email field
        password: 'SecurePass123',
        app: 'ezstart',
      })

      expect(userId).toBe(user._id!.toString())
    })

    it('should throw for invalid password', async () => {
      await createUser({ email: 'user@example.com', username: 'user1', password: 'RightPassword' })

      await expect(
        AuthService.validateCredentials({
          email: 'user@example.com',
          password: 'WrongPassword',
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should throw for non-existent user', async () => {
      await expect(
        AuthService.validateCredentials({
          email: 'ghost@example.com',
          password: 'AnyPassword',
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should auto-grant app access on login', async () => {
      const user = await createUser({
        email: 'user@example.com',
        username: 'user1',
        password: 'Pass123',
        apps: ['ezstart'],
      })

      await AuthService.validateCredentials({
        email: 'user@example.com',
        password: 'Pass123',
        app: 'ezbill', // Different app
      })

      // Reload user to check apps
      const { getAuthUserModel } = await import('../../models/auth-user.js')
      const AuthUser = await getAuthUserModel()
      const updated = await AuthUser.findById(user._id)
      expect(updated?.apps).toContain('ezbill')
    })
  })

  describe('login', () => {
    it('should return auth code on valid login', async () => {
      await createUser({ email: 'login@example.com', username: 'loginuser', password: 'Pass123!' })

      const result = await AuthService.login({
        email: 'login@example.com',
        password: 'Pass123!',
        app: 'ezstart',
      })

      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('expires_at')
    })
  })

  describe('exchangeCodeForToken', () => {
    it('should exchange valid code for tokens', async () => {
      const user = await createUser({ email: 'ex@example.com', username: 'exuser' })
      const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

      const result = await AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
      })

      expect(result).toHaveProperty('access_token')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('user')
      expect(result.user.email).toBe('ex@example.com')
    })

    it('should mark code as used after exchange', async () => {
      const user = await createUser({ email: 'used@example.com', username: 'useduser' })
      const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

      await AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
      })

      // Try to exchange same code again
      await expect(
        AuthService.exchangeCodeForToken({
          code: authCode.code,
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid or expired authorization code')
    })

    it('should reject expired code', async () => {
      const user = await createUser({ email: 'exp@example.com', username: 'expuser' })
      const AuthCode = await getAuthCodeModel()
      await AuthCode.create({
        code: 'expired-code',
        userId: user._id!.toString(),
        app: 'ezstart',
        type: 'auth',
        expiresAt: new Date(Date.now() - 1000), // Already expired
        isUsed: false,
      })

      await expect(
        AuthService.exchangeCodeForToken({
          code: 'expired-code',
          app: 'ezstart',
        })
      ).rejects.toThrow('Invalid or expired authorization code')
    })

    it('should reject code for wrong app', async () => {
      const user = await createUser({ email: 'app@example.com', username: 'appuser' })
      const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

      await expect(
        AuthService.exchangeCodeForToken({
          code: authCode.code,
          app: 'ezbill', // Wrong app
        })
      ).rejects.toThrow('Invalid or expired authorization code')
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid JWT', async () => {
      const user = await createUser({ email: 'jwt@example.com', username: 'jwtuser' })
      const token = jwt.sign(
        {
          userId: user._id!.toString(),
          email: user.email,
          username: user.username,
          apps: user.apps,
        },
        JWT_SECRET,
        { expiresIn: '15m', algorithm: 'HS256' }
      )

      const payload = await AuthService.verifyToken(token)
      expect(payload.userId).toBe(user._id!.toString())
      expect(payload.email).toBe('jwt@example.com')
    })

    it('should reject an invalid token', async () => {
      await expect(AuthService.verifyToken('invalid-token')).rejects.toThrow('Invalid token')
    })

    it('should reject an expired token', async () => {
      const token = jwt.sign(
        { userId: 'abc', email: 'e@e.com', username: 'u', apps: [] },
        JWT_SECRET,
        { expiresIn: '0s', algorithm: 'HS256' }
      )

      await expect(AuthService.verifyToken(token)).rejects.toThrow('Invalid token')
    })
  })

  describe('getUserById', () => {
    it('should return user without passwordHash', async () => {
      const user = await createUser({ email: 'getme@example.com', username: 'getmeuser' })

      const result = await AuthService.getUserById(user._id!.toString())
      expect(result.email).toBe('getme@example.com')
      expect(result).not.toHaveProperty('passwordHash')
    })

    it('should throw for non-existent user', async () => {
      await expect(AuthService.getUserById('507f1f77bcf86cd799439011')).rejects.toThrow(
        'User not found'
      )
    })
  })

  describe('refreshAccessToken', () => {
    it('should rotate refresh token and return new tokens', async () => {
      const user = await createUser({ email: 'refresh@example.com', username: 'refreshuser' })
      const rawToken = await AuthService.generateRefreshToken(user._id!.toString())

      const result = await AuthService.refreshAccessToken(rawToken)

      expect(result).toHaveProperty('access_token')
      expect(result).toHaveProperty('refreshToken')
      expect(result.refreshToken).not.toBe(rawToken) // Rotated

      // Old token should now be revoked
      const RefreshToken = await getRefreshTokenModel()
      const oldToken = await RefreshToken.findOne({ tokenHash: hashRefreshToken(rawToken) })
      expect(oldToken?.isRevoked).toBe(true)
    })

    it('should reject an invalid refresh token', async () => {
      await expect(AuthService.refreshAccessToken('not-a-real-token')).rejects.toThrow(
        'Invalid refresh token'
      )
    })

    it('should reject a revoked token and revoke all user tokens', async () => {
      const user = await createUser({ email: 'revoke@example.com', username: 'revokeuser' })
      const rawToken1 = await AuthService.generateRefreshToken(user._id!.toString())
      const rawToken2 = await AuthService.generateRefreshToken(user._id!.toString())

      // Revoke token1 manually
      const RefreshToken = await getRefreshTokenModel()
      await RefreshToken.updateOne(
        { tokenHash: hashRefreshToken(rawToken1) },
        { $set: { isRevoked: true } }
      )

      // Reuse revoked token → should trigger revocation of ALL tokens
      await expect(AuthService.refreshAccessToken(rawToken1)).rejects.toThrow(
        'Refresh token has been revoked'
      )

      // Token2 should also be revoked now (security measure)
      const token2 = await RefreshToken.findOne({ tokenHash: hashRefreshToken(rawToken2) })
      expect(token2?.isRevoked).toBe(true)
    })

    it('should reject an expired refresh token', async () => {
      const user = await createUser({ email: 'expired@example.com', username: 'expireduser' })
      const RefreshToken = await getRefreshTokenModel()
      const rawToken = 'expired-raw-token-abc'

      await RefreshToken.create({
        userId: user._id,
        tokenHash: hashRefreshToken(rawToken),
        expiresAt: new Date(Date.now() - 1000), // Expired
        isRevoked: false,
      })

      await expect(AuthService.refreshAccessToken(rawToken)).rejects.toThrow(
        'Refresh token has expired'
      )
    })
  })

  describe('revokeAllUserTokens', () => {
    it('should revoke all active tokens for a user', async () => {
      const user = await createUser({ email: 'revokeall@example.com', username: 'revokealluser' })
      await AuthService.generateRefreshToken(user._id!.toString())
      await AuthService.generateRefreshToken(user._id!.toString())

      const count = await AuthService.revokeAllUserTokens(user._id!.toString())
      expect(count).toBe(2)

      const RefreshToken = await getRefreshTokenModel()
      const active = await RefreshToken.find({ userId: user._id, isRevoked: false })
      expect(active).toHaveLength(0)
    })
  })

  describe('issueSession', () => {
    it('should return access_token, refreshToken, and user object', async () => {
      const user = await createUser({ email: 'session@example.com', username: 'sessionuser' })

      const session = await issueSession(user)

      expect(session.access_token).toBeTruthy()
      expect(session.refreshToken).toBeTruthy()
      expect(session.token_type).toBe('Bearer')
      expect(session.user.email).toBe('session@example.com')
    })

    it('should embed isVerified=true claim in the signed access token (verified user)', async () => {
      // JWT-ISVERIFIED-CLAIM-001 — consumer apps gate verified-only features
      // straight from the token, no /me round trip.
      const user = await createUser({
        email: 'verified-session@example.com',
        username: 'verifiedsession',
        isVerified: true,
      })

      const session = await issueSession(user)
      const decoded = jwt.verify(session.access_token, JWT_SECRET) as Record<string, unknown>
      expect(decoded.isVerified).toBe(true)
    })

    it('should embed isVerified=false claim for an unverified user', async () => {
      // JWT-ISVERIFIED-CLAIM-001 — quick-signup ghost users / freshly-registered
      // users carry the false claim so feature gates can react before the user
      // confirms their email (without an extra fetch).
      const user = await createUser({
        email: 'unverified-session@example.com',
        username: 'unverifiedsession',
        isVerified: false,
      })

      const session = await issueSession(user)
      const decoded = jwt.verify(session.access_token, JWT_SECRET) as Record<string, unknown>
      expect(decoded.isVerified).toBe(false)
    })
  })

  describe('buildJwtPayload', () => {
    it('should include essential fields', async () => {
      const user = await createUser({
        email: 'payload@example.com',
        username: 'payloaduser',
        apps: ['ezstart', 'ezbill'],
        globalRoles: ['superadmin'],
      })

      const payload = await buildJwtPayload(user)
      expect(payload.userId).toBe(user._id!.toString())
      expect(payload.email).toBe('payload@example.com')
      expect(payload.apps).toEqual(['ezstart', 'ezbill'])
      expect(payload.globalRoles).toEqual(['superadmin'])
    })

    it('should include isVerified=true when the user is verified', async () => {
      // JWT-ISVERIFIED-CLAIM-001 — backward-compat: legacy tokens without this
      // claim are still accepted by the SDK (optional field). Newly issued
      // tokens always carry it so consumers can stop rendering "Verify your
      // email" banners as soon as the next refresh fires.
      const user = await createUser({
        email: 'payload-verified@example.com',
        username: 'payloadverified',
        isVerified: true,
      })

      const payload = await buildJwtPayload(user)
      expect(payload.isVerified).toBe(true)
    })

    it('should include isVerified=false when the user is not verified', async () => {
      // Defensive: the field MUST always be present on freshly minted tokens
      // (true or false), never undefined. Undefined is reserved for legacy
      // tokens signed before JWT-ISVERIFIED-CLAIM-001.
      const user = await createUser({
        email: 'payload-unverified@example.com',
        username: 'payloadunverified',
        isVerified: false,
      })

      const payload = await buildJwtPayload(user)
      expect(payload.isVerified).toBe(false)
      // Make the always-present invariant explicit so a future regression
      // (e.g. someone wrapping the field in a conditional) is caught.
      expect(typeof payload.isVerified).toBe('boolean')
    })

    it('should include twoFactorEnabled=false when 2FA is not enrolled', async () => {
      // 2FA_MANDATORY_ADMIN-001 — claim must always be present on freshly
      // minted tokens so SDK consumers can rely on it without a /me round
      // trip. Undefined is reserved for legacy tokens.
      const user = await createUser({
        email: 'payload-no2fa@example.com',
        username: 'payloadno2fa',
      })

      const payload = await buildJwtPayload(user)
      expect(payload.twoFactorEnabled).toBe(false)
      expect(typeof payload.twoFactorEnabled).toBe('boolean')
    })

    it('should include twoFactorEnabled=true when 2FA is enrolled', async () => {
      const user = await createUser({
        email: 'payload-2fa@example.com',
        username: 'payload2fa',
      })
      // Enroll 2FA via the helper (writes a TotpSecret doc with
      // isEnabled: true).
      const { enableTwoFactorForUser } = await import('../helpers/setup.js')
      await enableTwoFactorForUser(user._id!.toString())

      const payload = await buildJwtPayload(user)
      expect(payload.twoFactorEnabled).toBe(true)
    })
  })
})
