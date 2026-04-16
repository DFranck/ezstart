import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { AuthService } from '../../../services/auth.service.js'
import { createUser, createAuthCode, cleanAllCollections } from '../../helpers/setup.js'
import { getAuthCodeModel } from '../../../models/auth-code.js'

describe('Token Exchange Logic', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('should exchange valid auth code for access + refresh tokens', async () => {
    const user = await createUser({ email: 'exchange@example.com', username: 'exchangeuser' })
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

    const result = await AuthService.exchangeCodeForToken({
      code: authCode.code,
      app: 'ezstart',
    })

    expect(result.access_token).toBeTruthy()
    expect(result.token_type).toBe('Bearer')
    expect(result.expires_in).toBeGreaterThan(0)
    expect(result.user).toBeTruthy()
    expect(result.user.email).toBe('exchange@example.com')
    expect(result.refreshToken).toBeTruthy()
  })

  it('should reject exchange with wrong app', async () => {
    const user = await createUser({ email: 'wrongapp@example.com', username: 'wrongappuser' })
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

    await expect(
      AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezbill',
      })
    ).rejects.toThrow('Invalid or expired authorization code')
  })

  it('should reject exchange with already-used code', async () => {
    const user = await createUser({ email: 'used@example.com', username: 'usedcode' })
    const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

    // First exchange succeeds
    await AuthService.exchangeCodeForToken({ code: authCode.code, app: 'ezstart' })

    // Second exchange fails
    await expect(
      AuthService.exchangeCodeForToken({ code: authCode.code, app: 'ezstart' })
    ).rejects.toThrow('Invalid or expired authorization code')
  })

  it('should reject exchange with expired code', async () => {
    const user = await createUser({ email: 'expired@example.com', username: 'expiredcode' })

    const AuthCode = await getAuthCodeModel()
    await AuthCode.create({
      code: 'expired-auth-code',
      userId: user._id!.toString(),
      app: 'ezstart',
      type: 'auth',
      expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
      isUsed: false,
    })

    await expect(
      AuthService.exchangeCodeForToken({ code: 'expired-auth-code', app: 'ezstart' })
    ).rejects.toThrow('Invalid or expired authorization code')
  })

  it('should reject exchange with non-existent code', async () => {
    await expect(
      AuthService.exchangeCodeForToken({ code: 'does-not-exist', app: 'ezstart' })
    ).rejects.toThrow('Invalid or expired authorization code')
  })
})
