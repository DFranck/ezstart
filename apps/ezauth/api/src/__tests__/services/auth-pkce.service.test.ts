import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { AuthService } from '../../services/auth.service.js'
import { computeS256Challenge } from '../../utils/pkce.js'
import { createUser, createAuthCode, cleanAllCollections } from '../helpers/setup.js'
import { getAuthCodeModel } from '../../models/auth-code.js'

/**
 * PKCE (RFC 7636 / OAuth 2.1) end-to-end service tests.
 *
 * Covers the binding contract of `AuthService.exchangeCodeForToken`:
 *  - code minted WITH a challenge → verifier required + must match
 *  - missing / wrong verifier → reject (generic message, code NOT burned)
 *  - code minted WITHOUT a challenge → verifier ignored (backward compat)
 *  - login() propagates a supplied PKCE challenge onto the minted code
 */
describe('AuthService PKCE (RFC 7636)', () => {
  // RFC 7636 Appendix B reference pair.
  const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  const CHALLENGE = computeS256Challenge(VERIFIER)

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('exchangeCodeForToken — code minted WITH a PKCE challenge', () => {
    it('succeeds when the correct code_verifier is presented', async () => {
      const user = await createUser({ email: 'pkce-ok@example.com', username: 'pkceok' })
      const authCode = await createAuthCode(user._id!.toString(), 'ezstart', {
        codeChallenge: CHALLENGE,
        codeChallengeMethod: 'S256',
      })

      const result = await AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
        code_verifier: VERIFIER,
      })

      expect(result.access_token).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(result.user.email).toBe('pkce-ok@example.com')
    })

    it('rejects when the code_verifier is WRONG', async () => {
      const user = await createUser({ email: 'pkce-wrong@example.com', username: 'pkcewrong' })
      const authCode = await createAuthCode(user._id!.toString(), 'ezstart', {
        codeChallenge: CHALLENGE,
        codeChallengeMethod: 'S256',
      })

      await expect(
        AuthService.exchangeCodeForToken({
          code: authCode.code,
          app: 'ezstart',
          code_verifier: 'totally-different-verifier-zzzzzzzzzzzzzzzz',
        })
      ).rejects.toThrow('Invalid or expired authorization code')
    })

    it('rejects when the code_verifier is ABSENT (challenge present)', async () => {
      const user = await createUser({ email: 'pkce-missing@example.com', username: 'pkcemissing' })
      const authCode = await createAuthCode(user._id!.toString(), 'ezstart', {
        codeChallenge: CHALLENGE,
        codeChallengeMethod: 'S256',
      })

      await expect(
        AuthService.exchangeCodeForToken({ code: authCode.code, app: 'ezstart' })
      ).rejects.toThrow('Invalid or expired authorization code')
    })

    it('does NOT burn the code on a failed PKCE check (check runs before isUsed=true)', async () => {
      const user = await createUser({ email: 'pkce-retry@example.com', username: 'pkceretry' })
      const authCode = await createAuthCode(user._id!.toString(), 'ezstart', {
        codeChallenge: CHALLENGE,
        codeChallengeMethod: 'S256',
      })

      // First attempt with the WRONG verifier → rejected.
      await expect(
        AuthService.exchangeCodeForToken({
          code: authCode.code,
          app: 'ezstart',
          code_verifier: 'wrong-verifier-aaaaaaaaaaaaaaaaaaaaaaaaaa',
        })
      ).rejects.toThrow('Invalid or expired authorization code')

      // The code must still be unused — a failed PKCE check must not consume it.
      const AuthCodeModel = await getAuthCodeModel()
      const stillThere = await AuthCodeModel.findOne({ code: authCode.code })
      expect(stillThere?.isUsed).toBe(false)

      // Second attempt with the CORRECT verifier now succeeds.
      const result = await AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
        code_verifier: VERIFIER,
      })
      expect(result.access_token).toBeTruthy()
    })
  })

  describe('exchangeCodeForToken — code minted WITHOUT a PKCE challenge (backward compat)', () => {
    it('succeeds with NO verifier (legacy / magic-link / sso-handoff path)', async () => {
      const user = await createUser({ email: 'legacy@example.com', username: 'legacypkce' })
      const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

      const result = await AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
      })
      expect(result.access_token).toBeTruthy()
    })

    it('ignores a stray verifier when no challenge was stored', async () => {
      const user = await createUser({ email: 'stray@example.com', username: 'straypkce' })
      const authCode = await createAuthCode(user._id!.toString(), 'ezstart')

      // A client that sends a verifier on a non-PKCE code is not penalized —
      // the field is simply ignored (the server never committed to PKCE).
      const result = await AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
        code_verifier: VERIFIER,
      })
      expect(result.access_token).toBeTruthy()
    })
  })

  describe('login() PKCE propagation', () => {
    it('stores the challenge on the minted code, which then requires the verifier', async () => {
      await createUser({
        email: 'login-pkce@example.com',
        username: 'loginpkce',
        password: 'Pass123!secure',
      })

      const authCode = await AuthService.login({
        email: 'login-pkce@example.com',
        password: 'Pass123!secure',
        app: 'ezstart',
        code_challenge: CHALLENGE,
        code_challenge_method: 'S256',
      })

      // The persisted code carries the challenge.
      const AuthCodeModel = await getAuthCodeModel()
      const stored = await AuthCodeModel.findOne({ code: authCode.code })
      expect(stored?.codeChallenge).toBe(CHALLENGE)
      expect(stored?.codeChallengeMethod).toBe('S256')

      // Exchange now requires the verifier.
      await expect(
        AuthService.exchangeCodeForToken({ code: authCode.code, app: 'ezstart' })
      ).rejects.toThrow('Invalid or expired authorization code')

      const result = await AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
        code_verifier: VERIFIER,
      })
      expect(result.access_token).toBeTruthy()
    })

    it('mints a no-challenge code when login omits PKCE (backward compat)', async () => {
      await createUser({
        email: 'login-nopkce@example.com',
        username: 'loginnopkce',
        password: 'Pass123!secure',
      })

      const authCode = await AuthService.login({
        email: 'login-nopkce@example.com',
        password: 'Pass123!secure',
        app: 'ezstart',
      })

      const AuthCodeModel = await getAuthCodeModel()
      const stored = await AuthCodeModel.findOne({ code: authCode.code })
      expect(stored?.codeChallenge).toBeUndefined()

      // Exchange succeeds without a verifier.
      const result = await AuthService.exchangeCodeForToken({
        code: authCode.code,
        app: 'ezstart',
      })
      expect(result.access_token).toBeTruthy()
    })
  })
})
