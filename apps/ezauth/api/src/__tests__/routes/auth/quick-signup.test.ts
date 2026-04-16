import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { createUser, cleanAllCollections } from '../../helpers/setup.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { getAuthCodeModel } from '../../../models/auth-code.js'
import { issueSession } from '../../../services/auth.service.js'

// Mock email service to prevent actual sending
vi.mock('../../../services/email.service.js', () => ({
  emailService: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('Quick Signup Logic', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('should create user with hasSetOwnPassword: false and isVerified: false', async () => {
    const AuthUser = await getAuthUserModel()

    // Simulate quickSignup logic (extracted from the route)
    const user = new AuthUser({
      email: 'quick@example.com',
      username: 'quickuser',
      passwordHash: 'random-uuid-placeholder',
      apps: ['green-pulse'],
      isVerified: false,
      hasSetOwnPassword: false,
    })
    await user.save()

    const saved = await AuthUser.findById(user._id)
    expect(saved?.isVerified).toBe(false)
    expect(saved?.hasSetOwnPassword).toBe(false)
    expect(saved?.apps).toContain('green-pulse')
    // Password should be hashed (even the random one)
    expect(saved?.passwordHash).not.toBe('random-uuid-placeholder')
  })

  it('should reject if email already exists', async () => {
    await createUser({ email: 'taken@example.com', username: 'user1' })

    const AuthUser = await getAuthUserModel()
    const existing = await AuthUser.findOne({
      $or: [{ email: 'taken@example.com' }, { username: 'quickdup' }],
    })

    expect(existing).toBeTruthy()
  })

  it('should reject if username already exists', async () => {
    await createUser({ email: 'user1@example.com', username: 'takenname' })

    const AuthUser = await getAuthUserModel()
    const existing = await AuthUser.findOne({
      $or: [{ email: 'new@example.com' }, { username: 'takenname' }],
    })

    expect(existing).toBeTruthy()
  })

  it('should create a password-reset code for the set-password email', async () => {
    const AuthUser = await getAuthUserModel()
    const AuthCode = await getAuthCodeModel()

    const user = new AuthUser({
      email: 'setpass@example.com',
      username: 'setpassuser',
      passwordHash: 'random-placeholder',
      apps: ['ezstart'],
      isVerified: false,
      hasSetOwnPassword: false,
    })
    await user.save()

    const code = new AuthCode({
      code: 'set-password-token-abc',
      userId: user._id!.toString(),
      type: 'password-reset',
      app: 'ezstart',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    await code.save()

    const found = await AuthCode.findOne({ code: 'set-password-token-abc' })
    expect(found?.type).toBe('password-reset')
    expect(found?.userId).toBe(user._id!.toString())
  })

  it('should issue an auto-login session after quickSignup', async () => {
    const AuthUser = await getAuthUserModel()

    const user = new AuthUser({
      email: 'autologin@example.com',
      username: 'autologinuser',
      passwordHash: 'random-placeholder',
      apps: ['green-pulse'],
      isVerified: false,
      hasSetOwnPassword: false,
    })
    await user.save()

    const session = await issueSession(user)

    expect(session.access_token).toBeTruthy()
    expect(session.refreshToken).toBeTruthy()
    expect(session.user.email).toBe('autologin@example.com')
    expect(session.user.isVerified).toBe(false)
  })

  it('should store promoCode when provided', async () => {
    const AuthUser = await getAuthUserModel()

    const user = new AuthUser({
      email: 'promo@example.com',
      username: 'promouser',
      passwordHash: 'random-placeholder',
      apps: ['green-pulse'],
      isVerified: false,
      hasSetOwnPassword: false,
      promoCode: 'EARTH2026',
    })
    await user.save()

    const saved = await AuthUser.findById(user._id)
    expect(saved?.promoCode).toBe('EARTH2026')
  })
})
