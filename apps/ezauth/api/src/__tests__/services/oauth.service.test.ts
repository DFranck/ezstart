import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { OAuthService, OAuthLinkingRefusedError } from '../../services/oauth.service.js'
import type { OAuthProfile } from '../../services/oauth.service.js'
import { createUser, createQuickSignupUser, cleanAllCollections } from '../helpers/setup.js'
import { getOAuthAccountModel } from '../../models/oauth-account.js'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'

function makeGoogleProfile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    provider: 'google',
    providerId: `google-${Date.now()}`,
    email: 'oauth@example.com',
    emailVerified: true,
    displayName: 'OAuth User',
    firstName: 'OAuth',
    lastName: 'User',
    avatar: 'https://lh3.googleusercontent.com/a/default',
    rawProfile: { sub: '123' },
    ...overrides,
  }
}

describe('OAuthService', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('handleOAuthCallback', () => {
    it('should create a new user when no existing account', async () => {
      const profile = makeGoogleProfile({ email: 'brand-new@example.com' })

      const result = await OAuthService.handleOAuthCallback(profile, 'ezstart')

      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('expires_at')

      // Verify user was created
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findOne({ email: 'brand-new@example.com' })
      expect(user).toBeTruthy()
      expect(user?.isVerified).toBe(true)
      expect(user?.apps).toContain('ezstart')

      // Verify OAuth account linked
      const OAuthAccount = await getOAuthAccountModel()
      const oauthAccount = await OAuthAccount.findOne({ userId: user?._id })
      expect(oauthAccount?.provider).toBe('google')
    })

    it('should login existing user with OAuth already linked', async () => {
      const user = await createUser({
        email: 'existing@example.com',
        username: 'existing',
        isVerified: true,
      })

      const OAuthAccount = await getOAuthAccountModel()
      await OAuthAccount.create({
        userId: user._id,
        provider: 'google',
        providerId: 'google-existing-123',
        email: 'existing@example.com',
        profile: { sub: '123' },
      })

      const profile = makeGoogleProfile({
        email: 'existing@example.com',
        providerId: 'google-existing-123',
      })

      const result = await OAuthService.handleOAuthCallback(profile, 'ezstart')
      expect(result).toHaveProperty('code')

      // Verify auth code points to existing user
      const AuthCode = await getAuthCodeModel()
      const code = await AuthCode.findOne({ code: result.code })
      expect(code?.userId).toBe(user._id!.toString())
    })

    it('should auto-link quickSignup ghost when provider email is verified', async () => {
      const ghost = await createQuickSignupUser({
        email: 'ghost@example.com',
        username: 'ghostuser',
      })

      expect(ghost.isVerified).toBe(false)
      expect(ghost.hasSetOwnPassword).toBe(false)

      const profile = makeGoogleProfile({
        email: 'ghost@example.com',
        emailVerified: true,
      })

      const result = await OAuthService.handleOAuthCallback(profile, 'ezstart')
      expect(result).toHaveProperty('code')

      // Verify ghost account is now verified
      const AuthUser = await getAuthUserModel()
      const updated = await AuthUser.findById(ghost._id)
      expect(updated?.isVerified).toBe(true)

      // Verify OAuth account was linked
      const OAuthAccount = await getOAuthAccountModel()
      const oauthLink = await OAuthAccount.findOne({ userId: ghost._id })
      expect(oauthLink?.provider).toBe('google')
    })

    it('should refuse linking when local user is unverified and has own password', async () => {
      await createUser({
        email: 'unverified@example.com',
        username: 'unverifieduser',
        isVerified: false,
        hasSetOwnPassword: true,
      })

      const profile = makeGoogleProfile({
        email: 'unverified@example.com',
        emailVerified: true,
      })

      await expect(
        OAuthService.handleOAuthCallback(profile, 'ezstart')
      ).rejects.toThrow(OAuthLinkingRefusedError)
    })

    it('should refuse linking when provider email is not verified', async () => {
      await createUser({
        email: 'verified-local@example.com',
        username: 'verifiedlocal',
        isVerified: true,
      })

      const profile = makeGoogleProfile({
        email: 'verified-local@example.com',
        emailVerified: false, // Provider did NOT verify
      })

      await expect(
        OAuthService.handleOAuthCallback(profile, 'ezstart')
      ).rejects.toThrow(OAuthLinkingRefusedError)
    })

    it('should auto-link when both sides are verified', async () => {
      const user = await createUser({
        email: 'both-verified@example.com',
        username: 'bothverified',
        isVerified: true,
      })

      const profile = makeGoogleProfile({
        email: 'both-verified@example.com',
        emailVerified: true,
      })

      const result = await OAuthService.handleOAuthCallback(profile, 'ezstart')
      expect(result).toHaveProperty('code')

      const OAuthAccount = await getOAuthAccountModel()
      const link = await OAuthAccount.findOne({ userId: user._id })
      expect(link?.provider).toBe('google')
    })

    it('should refuse to create account from unverified provider email (new user)', async () => {
      const profile = makeGoogleProfile({
        email: 'no-verify-provider@example.com',
        emailVerified: false,
      })

      await expect(
        OAuthService.handleOAuthCallback(profile, 'ezstart')
      ).rejects.toThrow(OAuthLinkingRefusedError)
    })

    it('should generate unique username when email prefix is taken', async () => {
      await createUser({ email: 'other@example.com', username: 'newgoogle' })

      const profile = makeGoogleProfile({
        email: 'newgoogle@gmail.com',
        emailVerified: true,
      })

      const result = await OAuthService.handleOAuthCallback(profile, 'ezstart')
      expect(result).toHaveProperty('code')

      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findOne({ email: 'newgoogle@gmail.com' })
      // Username should be newgoogle1 since newgoogle is taken
      expect(user?.username).toBe('newgoogle1')
    })

    it('should grant app access when logging in via existing OAuth for a new app', async () => {
      const user = await createUser({
        email: 'multiapp@example.com',
        username: 'multiapp',
        isVerified: true,
        apps: ['ezstart'],
      })

      const OAuthAccount = await getOAuthAccountModel()
      await OAuthAccount.create({
        userId: user._id,
        provider: 'google',
        providerId: 'google-multi-123',
        email: 'multiapp@example.com',
        profile: { sub: '123' },
      })

      const profile = makeGoogleProfile({
        email: 'multiapp@example.com',
        providerId: 'google-multi-123',
      })

      await OAuthService.handleOAuthCallback(profile, 'ezbill') // New app

      const AuthUser = await getAuthUserModel()
      const updated = await AuthUser.findById(user._id)
      expect(updated?.apps).toContain('ezbill')
    })
  })

  describe('getUserOAuthAccounts', () => {
    it('should return all OAuth accounts for a user', async () => {
      const user = await createUser({ email: 'multi-oauth@example.com', username: 'multioauth' })
      const OAuthAccount = await getOAuthAccountModel()

      await OAuthAccount.create({
        userId: user._id,
        provider: 'google',
        providerId: 'g-123',
        email: 'multi-oauth@example.com',
        profile: {},
      })

      const accounts = await OAuthService.getUserOAuthAccounts(user._id!.toString())
      expect(accounts).toHaveLength(1)
      expect(accounts[0]?.provider).toBe('google')
    })
  })

  describe('unlinkOAuthAccount', () => {
    it('should unlink OAuth account when user has a password', async () => {
      const user = await createUser({ email: 'unlink@example.com', username: 'unlinkuser' })
      const OAuthAccount = await getOAuthAccountModel()

      await OAuthAccount.create({
        userId: user._id,
        provider: 'google',
        providerId: 'g-unlink',
        email: 'unlink@example.com',
        profile: {},
      })

      const result = await OAuthService.unlinkOAuthAccount(user._id!.toString(), 'google')
      expect(result).toBe(true)

      const remaining = await OAuthAccount.find({ userId: user._id })
      expect(remaining).toHaveLength(0)
    })

    it('should refuse to unlink when user has no password', async () => {
      // Create an OAuth-only user (no password)
      const AuthUser = await getAuthUserModel()
      const user = new AuthUser({
        email: 'oauthonly@example.com',
        username: 'oauthonly',
        isVerified: true,
        apps: ['ezstart'],
      })
      await user.save()

      await expect(
        OAuthService.unlinkOAuthAccount(user._id!.toString(), 'google')
      ).rejects.toThrow('Cannot unlink OAuth account - set a password first')
    })
  })
})
