/**
 * Unit tests for `core/pkce.ts` — agnostic PKCE (RFC 7636) generation.
 *
 * Runs in the jsdom + Node ≥ 20 environment, which exposes `globalThis.crypto`
 * (Web Crypto: `getRandomValues` + `subtle.digest`).
 */

import { describe, expect, it } from 'vitest'
import {
  PKCE_METHOD_S256,
  deriveCodeChallenge,
  generateCodeVerifier,
  generatePkcePair,
} from '../../core/pkce.js'

describe('generateCodeVerifier', () => {
  it('produces a 43-char URL-safe base64url string (no padding)', () => {
    const verifier = generateCodeVerifier()
    expect(verifier).toHaveLength(43)
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/)
    expect(verifier).not.toContain('=')
    expect(verifier).not.toContain('+')
    expect(verifier).not.toContain('/')
  })

  it('returns a different value on each call (entropy)', () => {
    const a = generateCodeVerifier()
    const b = generateCodeVerifier()
    expect(a).not.toBe(b)
  })
})

describe('deriveCodeChallenge', () => {
  it('matches the RFC 7636 Appendix B S256 reference vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const expected = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    expect(await deriveCodeChallenge(verifier)).toBe(expected)
  })

  it('produces a 43-char URL-safe base64url digest', async () => {
    const challenge = await deriveCodeChallenge(generateCodeVerifier())
    expect(challenge).toHaveLength(43)
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/)
    expect(challenge).not.toContain('=')
  })

  it('is deterministic for the same verifier', async () => {
    const verifier = generateCodeVerifier()
    expect(await deriveCodeChallenge(verifier)).toBe(await deriveCodeChallenge(verifier))
  })
})

describe('generatePkcePair', () => {
  it('returns a verifier + its derived S256 challenge + method', async () => {
    const pair = await generatePkcePair()
    expect(pair.codeChallengeMethod).toBe(PKCE_METHOD_S256)
    expect(pair.codeChallengeMethod).toBe('S256')
    // The challenge MUST be the SHA-256 of the returned verifier.
    expect(pair.codeChallenge).toBe(await deriveCodeChallenge(pair.codeVerifier))
  })
})
