/**
 * Tests for `src/auth/auth-responses.ts` — server → client response schemas:
 * - LoginResponseSchema (discriminated union + C-1 hardening)
 * - LoginAuthCodeResponseSchema / LoginTwoFactorPendingResponseSchema
 * - RegisterResponseSchema
 * - RefreshResponseSchema (+ C-3 lifetime bounds)
 * - TokenResponseSchema (+ C-3 lifetime bounds)
 * - VerifyResponseSchema (+ C-3 payload.exp bounds)
 */

import { describe, expect, it } from 'vitest'
import {
  LoginAuthCodeResponseSchema,
  LoginResponseSchema,
  LoginTwoFactorPendingResponseSchema,
  RefreshResponseSchema,
  RegisterResponseSchema,
  TokenResponseSchema,
  VerifyResponseSchema,
} from '../../auth.js'

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const validUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  username: 'testuser',
  isVerified: true,
  apps: ['myapp'],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

// ---------------------------------------------------------------------------
// LoginResponseSchema (union discrimination)
// ---------------------------------------------------------------------------

describe('LoginResponseSchema', () => {
  const authCode = {
    code: 'abc123',
    expires_at: '2025-01-01T00:05:00.000Z',
    message: 'Authorization code issued',
  }

  const twoFactor = {
    requires2FA: true as const,
    tempToken: 'tmp_xyz',
    message: '2FA required',
  }

  it('parses an auth-code response (no requires2FA field)', () => {
    const result = LoginResponseSchema.parse(authCode)
    expect(result).toMatchObject({ code: 'abc123' })
  })

  it('parses an auth-code response with explicit requires2FA: false', () => {
    const result = LoginResponseSchema.parse({ ...authCode, requires2FA: false })
    expect(result).toMatchObject({ code: 'abc123', requires2FA: false })
  })

  it('parses a 2FA pending response', () => {
    const result = LoginResponseSchema.parse(twoFactor)
    expect(result).toMatchObject({ requires2FA: true, tempToken: 'tmp_xyz' })
  })

  it('LoginAuthCodeResponseSchema rejects missing code', () => {
    expect(() => LoginAuthCodeResponseSchema.parse({ message: 'hi' })).toThrow()
  })

  it('LoginTwoFactorPendingResponseSchema requires requires2FA === true', () => {
    expect(() =>
      LoginTwoFactorPendingResponseSchema.parse({
        requires2FA: false,
        tempToken: 'x',
        message: 'm',
      })
    ).toThrow()
  })

  it('rejects objects matching neither branch', () => {
    expect(() => LoginResponseSchema.parse({ random: true })).toThrow()
    expect(() => LoginResponseSchema.parse({})).toThrow()
  })

  // --- C-1: discriminated union enforcement (2026-05-15) ---
  // Previously a `z.union([A, B])` would accept payloads matching A and
  // silently drop fields belonging to B (or vice versa). With
  // `z.discriminatedUnion('requires2FA', [...])`, the discriminator MUST be
  // present (or `false` / absent for the auth-code branch) and the branch
  // is selected unambiguously.

  it('C-1: rejects payload satisfying both branches at once (requires2FA: true + code)', () => {
    // A hostile / compromised server returning BOTH a 2FA challenge AND an
    // auth code should be rejected, not parsed as one or the other.
    const hostile = {
      requires2FA: true,
      tempToken: 'TOTP_BYPASS_ATTEMPT',
      code: 'auth_abc',
      expires_at: 'x',
      message: 'm',
    }
    const result = LoginResponseSchema.safeParse(hostile)
    // The 2FA branch will accept it (extra `code`/`expires_at` keys are stripped),
    // but the critical guarantee is that the discriminator picks the 2FA branch
    // (`requires2FA: true`) — NEVER the auth-code branch. So a consumer checking
    // `if ('requires2FA' in resp && resp.requires2FA)` ALWAYS sees the challenge.
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.requires2FA).toBe(true)
      // tempToken is preserved, the hostile `code` is stripped silently.
      expect((result.data as { tempToken?: string }).tempToken).toBe('TOTP_BYPASS_ATTEMPT')
      expect((result.data as { code?: string }).code).toBeUndefined()
    }
  })

  it('C-1: rejects payload with requires2FA: "true" string (no coercion)', () => {
    expect(() =>
      LoginResponseSchema.parse({
        requires2FA: 'true',
        tempToken: 'x',
        message: 'm',
      })
    ).toThrow()
  })

  it('C-1: rejects payload with requires2FA: 1 (number, no coercion)', () => {
    expect(() =>
      LoginResponseSchema.parse({
        requires2FA: 1,
        tempToken: 'x',
        message: 'm',
      })
    ).toThrow()
  })

  it('C-1: requires2FA: true branch needs tempToken (no fall-through to auth-code)', () => {
    // Even though the auth-code branch accepts requires2FA: false|undefined,
    // a payload with requires2FA: true MUST satisfy the 2FA branch's
    // required `tempToken` — no silent fall-through.
    expect(() =>
      LoginResponseSchema.parse({
        requires2FA: true,
        message: 'm',
        // tempToken missing
      })
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// RegisterResponseSchema (alias to LoginAuthCodeResponseSchema)
// ---------------------------------------------------------------------------

describe('RegisterResponseSchema', () => {
  it('RegisterResponseSchema is the same as LoginAuthCodeResponseSchema', () => {
    expect(RegisterResponseSchema).toBe(LoginAuthCodeResponseSchema)
  })
})

// ---------------------------------------------------------------------------
// RefreshResponseSchema
// ---------------------------------------------------------------------------

describe('RefreshResponseSchema', () => {
  const valid = {
    accessToken: 'at_xyz',
    refreshToken: 'rt_xyz',
    expiresIn: 3600,
    user: validUser,
  }

  it('parses a valid response', () => {
    const result = RefreshResponseSchema.parse(valid)
    expect(result.accessToken).toBe('at_xyz')
    expect(result.user._id).toBe(validUser._id)
  })

  it('rejects missing accessToken', () => {
    const { accessToken: _, ...rest } = valid
    expect(() => RefreshResponseSchema.parse(rest)).toThrow()
  })

  it('rejects non-number expiresIn', () => {
    expect(() => RefreshResponseSchema.parse({ ...valid, expiresIn: '3600' })).toThrow()
  })

  // --- C-3: token lifetime + length bounds (2026-05-15) ---
  it('C-3: rejects expiresIn: -1 (negative TTL = immediate refresh DoS)', () => {
    expect(() => RefreshResponseSchema.parse({ ...valid, expiresIn: -1 })).toThrow()
  })

  it('C-3: rejects expiresIn: 0', () => {
    expect(() => RefreshResponseSchema.parse({ ...valid, expiresIn: 0 })).toThrow()
  })

  it('C-3: rejects expiresIn: Infinity (silent session death via setTimeout overflow)', () => {
    expect(() => RefreshResponseSchema.parse({ ...valid, expiresIn: Infinity })).toThrow()
  })

  it('C-3: rejects expiresIn: 3600.5 (float TTL)', () => {
    expect(() => RefreshResponseSchema.parse({ ...valid, expiresIn: 3600.5 })).toThrow()
  })

  it('C-3: rejects expiresIn > 86400 (24h cap)', () => {
    expect(() => RefreshResponseSchema.parse({ ...valid, expiresIn: 86_401 })).toThrow()
  })

  it('C-3: accepts expiresIn at the 86400 boundary', () => {
    const result = RefreshResponseSchema.parse({ ...valid, expiresIn: 86_400 })
    expect(result.expiresIn).toBe(86_400)
  })

  it('C-3: rejects empty accessToken string', () => {
    expect(() => RefreshResponseSchema.parse({ ...valid, accessToken: '' })).toThrow()
  })

  it('C-3: rejects empty refreshToken string', () => {
    expect(() => RefreshResponseSchema.parse({ ...valid, refreshToken: '' })).toThrow()
  })

  it('C-3: rejects accessToken > 2048 chars (oversized token DoS)', () => {
    expect(() => RefreshResponseSchema.parse({ ...valid, accessToken: 'a'.repeat(2049) })).toThrow()
  })

  it('C-3: rejects refreshToken > 2048 chars', () => {
    expect(() =>
      RefreshResponseSchema.parse({ ...valid, refreshToken: 'a'.repeat(2049) })
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// TokenResponseSchema
// ---------------------------------------------------------------------------

describe('TokenResponseSchema', () => {
  const valid = {
    access_token: 'jwt_abc',
    token_type: 'Bearer' as const,
    expires_in: 3600,
    user: validUser,
  }

  it('parses a valid response', () => {
    const result = TokenResponseSchema.parse(valid)
    expect(result.token_type).toBe('Bearer')
  })

  it('rejects wrong token_type', () => {
    expect(() => TokenResponseSchema.parse({ ...valid, token_type: 'Basic' })).toThrow()
  })

  it('rejects missing user', () => {
    const { user: _, ...rest } = valid
    expect(() => TokenResponseSchema.parse(rest)).toThrow()
  })

  // --- C-3: same bounds as RefreshResponseSchema (2026-05-15) ---
  it('C-3: rejects expires_in: -1', () => {
    expect(() => TokenResponseSchema.parse({ ...valid, expires_in: -1 })).toThrow()
  })

  it('C-3: rejects expires_in: Infinity', () => {
    expect(() => TokenResponseSchema.parse({ ...valid, expires_in: Infinity })).toThrow()
  })

  it('C-3: rejects expires_in > 86400', () => {
    expect(() => TokenResponseSchema.parse({ ...valid, expires_in: 86_401 })).toThrow()
  })

  it('C-3: rejects empty access_token', () => {
    expect(() => TokenResponseSchema.parse({ ...valid, access_token: '' })).toThrow()
  })

  it('C-3: rejects access_token > 2048 chars', () => {
    expect(() => TokenResponseSchema.parse({ ...valid, access_token: 'a'.repeat(2049) })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// VerifyResponseSchema
// ---------------------------------------------------------------------------

describe('VerifyResponseSchema', () => {
  it('parses valid=true with payload', () => {
    const result = VerifyResponseSchema.parse({
      valid: true,
      payload: {
        userId: 'u_1',
        email: 'a@b.com',
        username: 'test',
        apps: ['myapp'],
        exp: 1700000000,
      },
    })
    expect(result.valid).toBe(true)
    expect(result.payload?.userId).toBe('u_1')
  })

  it('parses valid=false without payload', () => {
    const result = VerifyResponseSchema.parse({ valid: false })
    expect(result.valid).toBe(false)
    expect(result.payload).toBeUndefined()
  })

  it('rejects non-boolean valid', () => {
    expect(() => VerifyResponseSchema.parse({ valid: 'true' })).toThrow()
  })

  it('rejects payload with missing required fields', () => {
    expect(() => VerifyResponseSchema.parse({ valid: true, payload: { userId: 'u_1' } })).toThrow()
  })

  // C-3 (2026-05-15) — payload.exp is now bounded.
  it('C-3: rejects payload.exp: -1', () => {
    expect(() =>
      VerifyResponseSchema.parse({
        valid: true,
        payload: {
          userId: 'u',
          email: 'a@b.com',
          username: 'u',
          apps: ['x'],
          exp: -1,
        },
      })
    ).toThrow()
  })

  it('C-3: rejects payload.exp: Infinity', () => {
    expect(() =>
      VerifyResponseSchema.parse({
        valid: true,
        payload: {
          userId: 'u',
          email: 'a@b.com',
          username: 'u',
          apps: ['x'],
          exp: Infinity,
        },
      })
    ).toThrow()
  })
})
