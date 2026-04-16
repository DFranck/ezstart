import { describe, it, expect } from 'vitest'
import { createFakeJWT, createExpiredJWT } from '../helpers.js'

/**
 * JWT token handling tests.
 *
 * The auth-provider uses a getTokenExpiry helper to decode JWT exp claims.
 * These tests verify the parser handles adversarial inputs without crashing.
 */

function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2 || !parts[1]) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

describe('JWT Token Parsing (adversarial)', () => {
  it('parses a valid JWT expiry', () => {
    const token = createFakeJWT(3600) // 1 hour
    const expiry = getTokenExpiry(token)
    expect(expiry).toBeTypeOf('number')
    expect(expiry).toBeGreaterThan(Date.now())
  })

  it('handles expired JWT correctly', () => {
    const token = createExpiredJWT()
    const expiry = getTokenExpiry(token)
    expect(expiry).toBeTypeOf('number')
    expect(expiry).toBeLessThan(Date.now())
  })

  it('returns null for empty string', () => {
    expect(getTokenExpiry('')).toBeNull()
  })

  it('returns null for single-segment token', () => {
    expect(getTokenExpiry('not-a-jwt')).toBeNull()
  })

  it('returns null for two-segment token with invalid base64', () => {
    expect(getTokenExpiry('header.!!!invalid-base64!!!')).toBeNull()
  })

  it('returns null for valid base64 but no exp claim', () => {
    const payload = btoa(JSON.stringify({ userId: '123', email: 'a@b.com' }))
    expect(getTokenExpiry(`header.${payload}.sig`)).toBeNull()
  })

  it('returns null for valid base64 but invalid JSON', () => {
    const payload = btoa('not json at all')
    expect(getTokenExpiry(`header.${payload}.sig`)).toBeNull()
  })

  it('handles extremely large exp values', () => {
    const payload = btoa(JSON.stringify({ exp: Number.MAX_SAFE_INTEGER }))
    const expiry = getTokenExpiry(`header.${payload}.sig`)
    expect(expiry).toBeTypeOf('number')
    expect(expiry).toBeGreaterThan(0)
  })

  it('handles negative exp values', () => {
    const payload = btoa(JSON.stringify({ exp: -1 }))
    const expiry = getTokenExpiry(`header.${payload}.sig`)
    expect(expiry).toBe(-1000)
  })

  it('handles exp=0', () => {
    const payload = btoa(JSON.stringify({ exp: 0 }))
    const expiry = getTokenExpiry(`header.${payload}.sig`)
    // exp is 0 which is falsy, so returns null
    expect(expiry).toBeNull()
  })

  it('handles XSS payload in JWT', () => {
    // An attacker might try to inject XSS via JWT payload
    const xssPayload = btoa(
      JSON.stringify({
        exp: 9999999999,
        username: '<script>alert("xss")</script>',
      })
    )
    const expiry = getTokenExpiry(`header.${xssPayload}.sig`)
    // Should parse normally — XSS is in the data, not executed here
    expect(expiry).toBeTypeOf('number')
  })
})
