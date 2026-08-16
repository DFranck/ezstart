import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { AuthService } from '../../../services/auth.service.js'
import { createUser, cleanAllCollections } from '../../helpers/setup.js'

describe('Login Route Logic', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('should login with valid email + password', async () => {
    await createUser({
      email: 'login@example.com',
      username: 'loginuser',
      password: 'MyPassword123',
    })

    const result = await AuthService.login({
      email: 'login@example.com',
      password: 'MyPassword123',
      app: 'ezstart',
    })

    expect(result.code).toBeTruthy()
    expect(result.expires_at).toBeTruthy()
  })

  it('should login with valid username + password', async () => {
    await createUser({
      email: 'user@example.com',
      username: 'myusername',
      password: 'MyPassword123',
    })

    const result = await AuthService.login({
      email: 'myusername', // Username in email field
      password: 'MyPassword123',
      app: 'ezstart',
    })

    expect(result.code).toBeTruthy()
  })

  it('should reject invalid password', async () => {
    await createUser({
      email: 'wrong@example.com',
      username: 'wronguser',
      password: 'CorrectPassword',
    })

    await expect(
      AuthService.login({
        email: 'wrong@example.com',
        password: 'WrongPassword',
        app: 'ezstart',
      })
    ).rejects.toThrow('Invalid credentials')
  })

  it('should reject non-existent user', async () => {
    await expect(
      AuthService.login({
        email: 'nonexistent@example.com',
        password: 'AnyPassword',
        app: 'ezstart',
      })
    ).rejects.toThrow('Invalid credentials')
  })

  it('should be case-insensitive on email', async () => {
    await createUser({
      email: 'case@example.com',
      username: 'caseuser',
      password: 'MyPassword123',
    })

    const result = await AuthService.login({
      email: 'CASE@EXAMPLE.COM',
      password: 'MyPassword123',
      app: 'ezstart',
    })

    expect(result.code).toBeTruthy()
  })

  it('should trim whitespace from email', async () => {
    await createUser({
      email: 'trim@example.com',
      username: 'trimuser',
      password: 'MyPassword123',
    })

    const result = await AuthService.login({
      email: '  trim@example.com  ',
      password: 'MyPassword123',
      app: 'ezstart',
    })

    expect(result.code).toBeTruthy()
  })

  describe('loginWithToken (httpOnly cookie mode)', () => {
    it('should return access and refresh tokens', async () => {
      await createUser({
        email: 'token@example.com',
        username: 'tokenuser',
        password: 'MyPassword123',
      })

      const result = await AuthService.loginWithToken({
        email: 'token@example.com',
        password: 'MyPassword123',
        app: 'ezstart',
      })

      expect(result.access_token).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(result.token_type).toBe('Bearer')
      expect(result.user.email).toBe('token@example.com')
    })

    it('should auto-grant app access', async () => {
      const user = await createUser({
        email: 'autogrant@example.com',
        username: 'autogrant',
        password: 'MyPassword123',
        apps: ['ezstart'],
      })

      await AuthService.loginWithToken({
        email: 'autogrant@example.com',
        password: 'MyPassword123',
        app: 'ezbill', // New app
      })

      const { getAuthUserModel } = await import('../../../models/auth-user.js')
      const AuthUser = await getAuthUserModel()
      const updated = await AuthUser.findById(user._id)
      expect(updated?.apps).toContain('ezbill')
    })
  })
})
