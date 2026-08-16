import crypto from 'crypto'

/**
 * PKCE (RFC 7636 / OAuth 2.1) server-side helpers.
 *
 * The authorization-code flow stores a `code_challenge` =
 * `BASE64URL(SHA256(code_verifier))` on the auth code at issue time. On the
 * /token exchange, the client presents the original `code_verifier`; the
 * server recomputes the challenge and compares it (timing-safe) against the
 * stored value. A mismatch (or a missing verifier when a challenge was stored)
 * rejects the exchange — defeating authorization-code interception attacks
 * where an attacker steals the code but never knew the verifier.
 *
 * S256 only — the `plain` method is rejected at the contract layer
 * (`PkceCodeChallengeMethodSchema = z.literal('S256')`).
 */

/**
 * Compute the S256 PKCE challenge for a given verifier:
 * `BASE64URL(SHA256(ASCII(code_verifier)))` (RFC 7636 §4.2).
 *
 * Returns a base64url string (no padding), e.g. 43 chars for a SHA-256 digest.
 */
export function computeS256Challenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier, 'ascii').digest('base64url')
}

/**
 * Verify a presented `code_verifier` against a stored S256 `code_challenge`
 * using a constant-time comparison.
 *
 * Returns `true` iff `BASE64URL(SHA256(codeVerifier)) === storedChallenge`.
 * The comparison is timing-safe (`crypto.timingSafeEqual`) so an attacker
 * cannot probe the challenge byte-by-byte via response-time analysis. A length
 * mismatch short-circuits to `false` BEFORE `timingSafeEqual` (which throws on
 * unequal-length buffers) — the length of the SHA-256 digest is public and
 * fixed, so this leaks nothing.
 */
export function verifyPkceChallenge(codeVerifier: string, storedChallenge: string): boolean {
  const computed = computeS256Challenge(codeVerifier)
  const computedBuf = Buffer.from(computed, 'utf8')
  const storedBuf = Buffer.from(storedChallenge, 'utf8')
  if (computedBuf.length !== storedBuf.length) return false
  return crypto.timingSafeEqual(computedBuf, storedBuf)
}
