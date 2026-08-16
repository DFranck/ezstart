import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { createUser, cleanAllCollections } from '../helpers/setup.js'
import { getAuthCodeModel } from '../../models/auth-code.js'

// Mock the env module to provide SSO_ALLOWED_REDIRECTS for tests
vi.mock('../../config/env.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../config/env.js')>()
  return {
    ...original,
    env: {
      ...original.env,
      SSO_ALLOWED_REDIRECTS: 'http://localhost:6121,http://localhost:6131,https://ezbill.ezstart.xyz',
    },
  }
})

// Import AFTER mock setup
const { issueHandoffCode, consumeHandoffCode } = await import('../../services/sso.service.js')

describe('SSOService', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('issueHandoffCode', () => {
    it('should issue a single-use code with 60s TTL', async () => {
      const user = await createUser({ email: 'sso@example.com', username: 'ssouser' })

      const result = await issueHandoffCode({
        userId: user._id!.toString(),
        app: 'ezbill',
        redirectUri: 'http://localhost:6121/auth/callback',
      })

      expect(result.code).toBeTruthy()
      expect(result.code.length).toBeGreaterThan(20)
      expect(result.expiresIn).toBe(60)

      // Verify persisted in DB
      const AuthCode = await getAuthCodeModel()
      const doc = await AuthCode.findOne({ code: result.code })
      expect(doc?.type).toBe('sso-handoff')
      expect(doc?.isUsed).toBe(false)
      expect(doc?.app).toBe('ezbill')
    })

    it('should reject disallowed redirect URI', async () => {
      const user = await createUser({ email: 'sso2@example.com', username: 'ssouser2' })

      await expect(
        issueHandoffCode({
          userId: user._id!.toString(),
          app: 'ezbill',
          redirectUri: 'https://evil.com/steal',
        })
      ).rejects.toThrow('Disallowed redirectUri origin')
    })

    it('should reject invalid redirect URI', async () => {
      const user = await createUser({ email: 'sso3@example.com', username: 'ssouser3' })

      await expect(
        issueHandoffCode({
          userId: user._id!.toString(),
          app: 'ezbill',
          redirectUri: 'not-a-url',
        })
      ).rejects.toThrow('Invalid redirectUri')
    })

    it('should accept redirect to allowed origin', async () => {
      const user = await createUser({ email: 'valid-redir@example.com', username: 'validrediruser' })

      const result = await issueHandoffCode({
        userId: user._id!.toString(),
        app: 'ezbill',
        redirectUri: 'https://ezbill.ezstart.xyz/dashboard',
      })

      expect(result.code).toBeTruthy()
    })
  })

  describe('consumeHandoffCode', () => {
    it('should consume a valid code and return userId + app', async () => {
      const user = await createUser({ email: 'consume@example.com', username: 'consumeuser' })

      const { code } = await issueHandoffCode({
        userId: user._id!.toString(),
        app: 'ezbill',
        redirectUri: 'http://localhost:6121/auth/callback',
      })

      const consumed = await consumeHandoffCode({ code, app: 'ezbill' })

      expect(consumed.userId).toBe(user._id!.toString())
      expect(consumed.app).toBe('ezbill')
      expect(consumed.redirectUri).toBe('http://localhost:6121/auth/callback')
    })

    it('should reject already-used code (single use)', async () => {
      const user = await createUser({ email: 'once@example.com', username: 'onceuser' })

      const { code } = await issueHandoffCode({
        userId: user._id!.toString(),
        app: 'ezbill',
        redirectUri: 'http://localhost:6121/auth/callback',
      })

      // First consumption succeeds
      await consumeHandoffCode({ code, app: 'ezbill' })

      // Second attempt fails
      await expect(consumeHandoffCode({ code, app: 'ezbill' })).rejects.toThrow(
        'Invalid or expired authorization code'
      )
    })

    it('should reject code for wrong app', async () => {
      const user = await createUser({ email: 'wrongapp@example.com', username: 'wrongappuser' })

      const { code } = await issueHandoffCode({
        userId: user._id!.toString(),
        app: 'ezbill',
        redirectUri: 'http://localhost:6121/auth/callback',
      })

      await expect(consumeHandoffCode({ code, app: 'ezpay' })).rejects.toThrow(
        'Invalid or expired authorization code'
      )
    })

    it('should reject expired code', async () => {
      const user = await createUser({ email: 'expiry@example.com', username: 'expiryuser' })

      // Create an SSO handoff code that's already expired
      const AuthCode = await getAuthCodeModel()
      await AuthCode.create({
        code: 'expired-sso-code',
        userId: user._id!.toString(),
        app: 'ezbill',
        type: 'sso-handoff',
        expiresAt: new Date(Date.now() - 1000), // Already expired
        isUsed: false,
      })

      await expect(
        consumeHandoffCode({ code: 'expired-sso-code', app: 'ezbill' })
      ).rejects.toThrow('Invalid or expired authorization code')
    })

    it('should reject non-existent code', async () => {
      await expect(
        consumeHandoffCode({ code: 'does-not-exist', app: 'ezbill' })
      ).rejects.toThrow('Invalid or expired authorization code')
    })
  })
})
