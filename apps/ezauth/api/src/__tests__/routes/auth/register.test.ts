import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { AuthService } from '../../../services/auth.service.js'
import { createUser, cleanAllCollections } from '../../helpers/setup.js'
import { getAuthUserModel } from '../../../models/auth-user.js'

// Mock email service to prevent actual email sending
vi.mock('../../../services/email.service.js', () => ({
  emailService: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('Register Route Logic', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('should register a new user with valid data', async () => {
    const result = await AuthService.register({
      email: 'newreg@example.com',
      username: 'newreg',
      password: 'StrongPass123!',
      app: 'ezstart',
    })

    expect(result.code).toBeTruthy()
    expect(result.expires_at).toBeTruthy()

    // Verify user was created in DB
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findOne({ email: 'newreg@example.com' })
    expect(user).toBeTruthy()
    expect(user?.isVerified).toBe(false) // Not yet verified
    expect(user?.apps).toContain('ezstart')
  })

  it('should reject registration with existing email', async () => {
    await createUser({ email: 'dup@example.com', username: 'user1' })

    await expect(
      AuthService.register({
        email: 'dup@example.com',
        username: 'user2',
        password: 'StrongPass123!',
        app: 'ezstart',
      })
    ).rejects.toThrow('User already exists')
  })

  it('should reject registration with existing username', async () => {
    await createUser({ email: 'user1@example.com', username: 'dupname' })

    await expect(
      AuthService.register({
        email: 'user2@example.com',
        username: 'dupname',
        password: 'StrongPass123!',
        app: 'ezstart',
      })
    ).rejects.toThrow('User already exists')
  })

  it('should hash the password (not store plaintext)', async () => {
    await AuthService.register({
      email: 'hash@example.com',
      username: 'hashuser',
      password: 'MyPlainPassword',
      app: 'ezstart',
    })

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findOne({ email: 'hash@example.com' })
    expect(user?.passwordHash).toBeTruthy()
    expect(user?.passwordHash).not.toBe('MyPlainPassword')
  })

  it('should create auth code for the requesting app', async () => {
    const result = await AuthService.register({
      email: 'apptest@example.com',
      username: 'apptest',
      password: 'StrongPass123!',
      app: 'ezbill',
    })

    expect(result.code).toBeTruthy()

    // Auth code should be for ezbill
    const { getAuthCodeModel } = await import('../../../models/auth-code.js')
    const AuthCode = await getAuthCodeModel()
    const code = await AuthCode.findOne({ code: result.code })
    expect(code?.app).toBe('ezbill')
  })

  it('should store promoCode when provided', async () => {
    const AuthUser = await getAuthUserModel()

    await AuthService.register({
      email: 'promo@example.com',
      username: 'promouser',
      password: 'StrongPass123!',
      app: 'ezstart',
      promoCode: 'SAVE20',
    })

    const user = await AuthUser.findOne({ email: 'promo@example.com' })
    expect(user?.promoCode).toBe('SAVE20')
  })
})
