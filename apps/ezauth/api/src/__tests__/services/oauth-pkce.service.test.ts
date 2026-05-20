import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { OAuthService } from '../../services/oauth.service.js'
import type { OAuthProfile } from '../../services/oauth.service.js'
import { AuthService } from '../../services/auth.service.js'
import { computeS256Challenge } from '../../utils/pkce.js'
import { cleanAllCollections } from '../helpers/setup.js'
import { getAuthCodeModel } from '../../models/auth-code.js'

/**
 * Wave D Lot 5B — PKCE (RFC 7636) end-to-end on the OAuth Google flow.
 *
 * `OAuthService.handleOAuthCallback` is the point where the (tamper-proof,
 * state-derived) PKCE challenge is propagated onto the minted auth code. These
 * tests pin:
 *  - challenge present → minted code carries it → /token requires the verifier
 *  - challenge absent  → legacy (no-PKCE) code → /token exchanges without one
 */
function makeGoogleProfile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    provider: 'google',
    providerId: `google-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    email: 'oauth-pkce@example.com',
    emailVerified: true,
    displayName: 'OAuth PKCE User',
    firstName: 'OAuth',
    lastName: 'User',
    avatar: 'https://lh3.googleusercontent.com/a/default',
    rawProfile: { sub: '123' },
    ...overrides,
  }
}

describe('OAuthService PKCE propagation (Lot 5B)', () => {
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

  it('mints a challenge-bound code when flow.pkce is supplied', async () => {
    const profile = makeGoogleProfile({ email: 'pkce-new@example.com' })

    const result = await OAuthService.handleOAuthCallback(profile, 'ezstart', undefined, {
      intent: 'signin',
      pkce: { codeChallenge: CHALLENGE, codeChallengeMethod: 'S256' },
    })

    // The persisted code carries the challenge.
    const AuthCodeModel = await getAuthCodeModel()
    const stored = await AuthCodeModel.findOne({ code: result.code })
    expect(stored?.codeChallenge).toBe(CHALLENGE)
    expect(stored?.codeChallengeMethod).toBe('S256')

    // Exchange now REQUIRES the verifier — absent ⇒ reject (generic message).
    await expect(
      AuthService.exchangeCodeForToken({ code: result.code, app: 'ezstart' })
    ).rejects.toThrow('Invalid or expired authorization code')

    // With the correct verifier the exchange succeeds.
    const exchanged = await AuthService.exchangeCodeForToken({
      code: result.code,
      app: 'ezstart',
      code_verifier: VERIFIER,
    })
    expect(exchanged.access_token).toBeTruthy()
    expect(exchanged.user.email).toBe('pkce-new@example.com')
  })

  it('rejects a WRONG verifier on a challenge-bound OAuth code', async () => {
    const profile = makeGoogleProfile({ email: 'pkce-wrong@example.com' })

    const result = await OAuthService.handleOAuthCallback(profile, 'ezstart', undefined, {
      intent: 'signin',
      pkce: { codeChallenge: CHALLENGE, codeChallengeMethod: 'S256' },
    })

    await expect(
      AuthService.exchangeCodeForToken({
        code: result.code,
        app: 'ezstart',
        code_verifier: 'totally-different-verifier-zzzzzzzzzzzzzzzzzz',
      })
    ).rejects.toThrow('Invalid or expired authorization code')
  })

  it('mints a legacy (no-PKCE) code when flow.pkce is absent (backward compat)', async () => {
    const profile = makeGoogleProfile({ email: 'legacy-oauth@example.com' })

    // No `pkce` in the flow context — exactly what an older SDK that never sent
    // a challenge produces (the state had no challenge → passport forwards none).
    const result = await OAuthService.handleOAuthCallback(profile, 'ezstart', undefined, {
      intent: 'signin',
    })

    const AuthCodeModel = await getAuthCodeModel()
    const stored = await AuthCodeModel.findOne({ code: result.code })
    expect(stored?.codeChallenge).toBeUndefined()
    expect(stored?.codeChallengeMethod).toBeUndefined()

    // Exchange succeeds with NO verifier (legacy path).
    const exchanged = await AuthService.exchangeCodeForToken({
      code: result.code,
      app: 'ezstart',
    })
    expect(exchanged.access_token).toBeTruthy()
    expect(exchanged.user.email).toBe('legacy-oauth@example.com')
  })
})
