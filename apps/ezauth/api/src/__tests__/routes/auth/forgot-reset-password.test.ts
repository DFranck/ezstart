import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import {
  createUser,
  createQuickSignupUser,
  createPasswordResetCode,
  cleanAllCollections,
} from '../../helpers/setup.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { getAuthCodeModel } from '../../../models/auth-code.js'
import resetPasswordRouter from '../../../routes/auth/reset-password.js'
import crypto from 'crypto'

function buildResetApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', resetPasswordRouter)
  return app
}

describe('Forgot / Reset Password Logic', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('Forgot Password', () => {
    it('should create a password-reset code for existing user', async () => {
      const user = await createUser({ email: 'forgot@example.com', username: 'forgotuser' })
      const AuthCode = await getAuthCodeModel()

      const token = crypto.randomBytes(32).toString('hex')
      const authCode = new AuthCode({
        code: token,
        userId: user._id!.toString(),
        type: 'password-reset',
        app: 'ezstart',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      await authCode.save()

      const found = await AuthCode.findOne({ code: token })
      expect(found?.type).toBe('password-reset')
      expect(found?.userId).toBe(user._id!.toString())
    })

    it('should work for quickSignup users too', async () => {
      const ghost = await createQuickSignupUser({
        email: 'ghost-forgot@example.com',
        username: 'ghostforgot',
      })
      const AuthCode = await getAuthCodeModel()

      const token = crypto.randomBytes(32).toString('hex')
      const authCode = new AuthCode({
        code: token,
        userId: ghost._id!.toString(),
        type: 'password-reset',
        app: 'ezstart',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      await authCode.save()

      const found = await AuthCode.findOne({ code: token })
      expect(found).toBeTruthy()
    })

    it('should not reveal if email exists (no code for non-existent)', async () => {
      // In the actual route, it always returns 200 regardless of email existence
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findOne({ email: 'nonexistent@example.com' })
      expect(user).toBeNull()
      // Route logic: always returns "If an account exists, a reset link has been sent"
    })
  })

  describe('Reset Password', () => {
    it('should reset password with valid token', async () => {
      const user = await createUser({
        email: 'reset@example.com',
        username: 'resetuser',
        password: 'OldPassword123',
      })

      const resetCode = await createPasswordResetCode(user._id!.toString())

      // Simulate reset-password route logic
      const AuthCode = await getAuthCodeModel()
      const AuthUser = await getAuthUserModel()

      const authCode = await AuthCode.findOne({
        code: resetCode.code,
        type: 'password-reset',
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })

      expect(authCode).toBeTruthy()

      const targetUser = await AuthUser.findById(authCode!.userId)
      expect(targetUser).toBeTruthy()

      targetUser!.passwordHash = 'NewPassword456'
      targetUser!.hasSetOwnPassword = true
      await targetUser!.save()

      authCode!.isUsed = true
      await authCode!.save()

      // Verify password was changed
      const isMatch = await targetUser!.comparePassword('NewPassword456')
      expect(isMatch).toBe(true)

      // Verify hasSetOwnPassword is now true
      const refreshed = await AuthUser.findById(user._id)
      expect(refreshed?.hasSetOwnPassword).toBe(true)
    })

    it('should set hasSetOwnPassword: true for quickSignup users', async () => {
      const ghost = await createQuickSignupUser({
        email: 'ghost-reset@example.com',
        username: 'ghostreset',
      })

      expect(ghost.hasSetOwnPassword).toBe(false)

      const resetCode = await createPasswordResetCode(ghost._id!.toString())

      const AuthUser = await getAuthUserModel()
      const AuthCode = await getAuthCodeModel()

      const authCode = await AuthCode.findOne({ code: resetCode.code })
      const targetUser = await AuthUser.findById(authCode!.userId)

      targetUser!.passwordHash = 'MyRealPassword'
      targetUser!.hasSetOwnPassword = true
      await targetUser!.save()

      const updated = await AuthUser.findById(ghost._id)
      expect(updated?.hasSetOwnPassword).toBe(true)
    })

    it('should reject invalid/expired token', async () => {
      const AuthCode = await getAuthCodeModel()

      // Expired token
      await AuthCode.create({
        code: 'expired-reset-token',
        userId: '507f1f77bcf86cd799439011',
        type: 'password-reset',
        app: 'ezstart',
        expiresAt: new Date(Date.now() - 1000),
        isUsed: false,
      })

      const found = await AuthCode.findOne({
        code: 'expired-reset-token',
        type: 'password-reset',
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })

      expect(found).toBeNull()
    })

    it('should reject already-used token', async () => {
      const user = await createUser({ email: 'used@example.com', username: 'useduser' })
      const AuthCode = await getAuthCodeModel()

      await AuthCode.create({
        code: 'used-reset-token',
        userId: user._id!.toString(),
        type: 'password-reset',
        app: 'ezstart',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        isUsed: true, // Already used
      })

      const found = await AuthCode.findOne({
        code: 'used-reset-token',
        type: 'password-reset',
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })

      expect(found).toBeNull()
    })
  })

  /**
   * Wave D Lot 2.5 / HAC-NEW-5 (2026-05-17) — HTTP-level coverage for the
   * `newPassword` floor on `POST /api/reset-password`.
   *
   * Previously this route inlined `newPassword: min(8)`, while
   * `RegisterRequestSchema` and `changePasswordSchema` both enforce `min(12)`.
   * An attacker could chain forgot-password → reset-password to downgrade
   * any account's password to 8 chars and bypass the registration floor.
   *
   * The route now imports the canonical `ResetPasswordRequestSchema` from
   * `@ezstart/api-contracts` (single source of truth) which enforces
   * `min(12).max(128)` + `OPAQUE_TOKEN_REGEX`. Cf. `standard-saas-security.md` §2.
   */
  describe('POST /api/reset-password — newPassword min(12) policy (HAC-NEW-5)', () => {
    it('rejects newPassword shorter than 12 characters', async () => {
      const user = await createUser({
        email: 'short-reset@example.com',
        username: 'shortresetpw',
        password: 'OldPassword123!',
      })
      const resetCode = await createPasswordResetCode(user._id!.toString())

      const res = await request(buildResetApp())
        .post('/api/reset-password')
        .send({ token: resetCode.code, newPassword: 'Short8!1' }) // 8 chars — below floor

      // api-core `sendValidationError` uses HTTP 422 (Unprocessable Entity).
      expect(res.status).toBe(422)
      const flat = JSON.stringify(res.body)
      expect(flat).toMatch(/at least 12|too_small|12 characters/i)

      // Password must NOT have been changed.
      const AuthUser = await getAuthUserModel()
      const refreshed = await AuthUser.findById(user._id)
      const stillOld = await refreshed!.comparePassword('OldPassword123!')
      expect(stillOld).toBe(true)
    })

    it('accepts newPassword of 12+ characters and resets the password', async () => {
      const user = await createUser({
        email: 'ok-reset@example.com',
        username: 'okresetpw',
        password: 'OldPassword123!',
      })
      const resetCode = await createPasswordResetCode(user._id!.toString())

      const res = await request(buildResetApp())
        .post('/api/reset-password')
        .send({ token: resetCode.code, newPassword: 'NewLongerPwd123!' }) // 16 chars

      expect(res.status).toBe(200)

      // Password was actually rotated.
      const AuthUser = await getAuthUserModel()
      const refreshed = await AuthUser.findById(user._id)
      const matchesNew = await refreshed!.comparePassword('NewLongerPwd123!')
      expect(matchesNew).toBe(true)
    })
  })
})
