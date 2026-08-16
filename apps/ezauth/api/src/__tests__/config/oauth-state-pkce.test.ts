import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { signOAuthStateToken, verifyOAuthStateToken } from '../../config/passport.js'
import { OAUTH_STATE_SECRET } from '../../config/env.js'
import { computeS256Challenge } from '../../utils/pkce.js'

/**
 * Wave D Lot 5B — PKCE (RFC 7636) on the OAuth Google redirect flow.
 *
 * The challenge MUST travel inside the SIGNED state JWT (not a raw query param
 * on the callback) so an attacker who intercepts the callback cannot strip or
 * substitute it without breaking the HMAC signature (anti-downgrade). These
 * tests pin that contract on `signOAuthStateToken` / `verifyOAuthStateToken`.
 */
describe('OAuth state token — PKCE binding (Lot 5B)', () => {
  // RFC 7636 Appendix B reference pair.
  const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  const CHALLENGE = computeS256Challenge(VERIFIER)

  it('round-trips the challenge in the signed state', () => {
    const token = signOAuthStateToken({
      nonce: 'n1',
      app: 'ezstart',
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
    })
    const claims = verifyOAuthStateToken(token)
    expect(claims.codeChallenge).toBe(CHALLENGE)
    expect(claims.codeChallengeMethod).toBe('S256')
  })

  it('omits the challenge when none was signed (backward compat — legacy SDK)', () => {
    const token = signOAuthStateToken({ nonce: 'n2', app: 'ezstart' })
    const claims = verifyOAuthStateToken(token)
    expect(claims.codeChallenge).toBeUndefined()
    expect(claims.codeChallengeMethod).toBeUndefined()
  })

  it('rejects a state whose challenge was tampered with (signature breaks)', () => {
    // The legit token (correct secret) verifies fine — establishes the baseline.
    const legit = signOAuthStateToken({
      nonce: 'n3',
      app: 'ezstart',
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
    })
    expect(verifyOAuthStateToken(legit).codeChallenge).toBe(CHALLENGE)

    // Forge a NEW token with an attacker-controlled challenge, signed with the
    // WRONG secret — exactly what an interceptor who can't see OAUTH_STATE_SECRET
    // would have to do to substitute their own challenge. The HMAC check fails.
    const forged = jwt.sign(
      {
        nonce: 'n3',
        app: 'ezstart',
        codeChallenge: computeS256Challenge('attacker-verifier-zzzzzzzzzzzzzzzzzzzzzzzz'),
        codeChallengeMethod: 'S256',
      },
      'attacker-secret',
      { algorithm: 'HS256' }
    )
    expect(() => verifyOAuthStateToken(forged)).toThrow()
  })

  it('drops a downgraded method (challenge present, method != S256)', () => {
    // Sign a VALID (correct-secret) token but with the method set to a bogus
    // value. Because the method is not `'S256'`, no challenge surfaces → the
    // callback mints a legacy code rather than honouring a downgraded binding.
    const downgradedToken = jwt.sign(
      { nonce: 'n4', app: 'ezstart', codeChallenge: CHALLENGE, codeChallengeMethod: 'plain' },
      OAUTH_STATE_SECRET,
      { algorithm: 'HS256' }
    )
    const claims = verifyOAuthStateToken(downgradedToken)
    expect(claims.codeChallenge).toBeUndefined()
    expect(claims.codeChallengeMethod).toBeUndefined()
  })
})
