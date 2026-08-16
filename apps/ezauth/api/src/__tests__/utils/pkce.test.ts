import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { computeS256Challenge, verifyPkceChallenge } from '../../utils/pkce.js'

/**
 * PKCE (RFC 7636) server helper unit tests. No DB — pure crypto.
 *
 * The canonical RFC 7636 Appendix B example pins the exact S256 derivation so
 * a regression in the hashing/encoding (e.g. base64 vs base64url, padding)
 * is caught immediately.
 */
describe('pkce util', () => {
  describe('computeS256Challenge', () => {
    it('matches the RFC 7636 Appendix B reference vector', () => {
      // verifier + expected challenge straight from RFC 7636 Appendix B.
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
      const expected = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
      expect(computeS256Challenge(verifier)).toBe(expected)
    })

    it('produces a 43-char base64url string (no padding, URL-safe)', () => {
      const challenge = computeS256Challenge('some-arbitrary-verifier-value-1234567890')
      expect(challenge).toHaveLength(43)
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/)
      expect(challenge).not.toContain('=')
    })
  })

  describe('verifyPkceChallenge', () => {
    it('returns true for the matching verifier (timing-safe)', () => {
      const verifier = crypto.randomBytes(32).toString('base64url')
      const challenge = computeS256Challenge(verifier)
      expect(verifyPkceChallenge(verifier, challenge)).toBe(true)
    })

    it('returns false for a mismatched verifier', () => {
      const challenge = computeS256Challenge('the-real-verifier-xxxxxxxxxxxxxxxxxxxxxxxx')
      expect(verifyPkceChallenge('a-different-verifier-yyyyyyyyyyyyyyyyyyyyyy', challenge)).toBe(
        false
      )
    })

    it('returns false (no throw) on a length-mismatched stored challenge', () => {
      // A truncated/garbage stored challenge has a different length than the
      // computed digest — must short-circuit to false BEFORE timingSafeEqual
      // (which throws on unequal-length buffers).
      const verifier = crypto.randomBytes(32).toString('base64url')
      expect(verifyPkceChallenge(verifier, 'too-short')).toBe(false)
    })
  })
})
