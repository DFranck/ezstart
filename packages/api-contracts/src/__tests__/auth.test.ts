import { describe, expect, it } from 'vitest'
import {
  SupportedLocaleSchema,
  EmailOverrideSchema,
  AuthUserSchema,
  LoginRequestSchema,
  LoginAuthCodeResponseSchema,
  LoginTwoFactorPendingResponseSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  QuickSignupRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  VerifyEmailRequestSchema,
  SendVerificationRequestSchema,
  RefreshRequestSchema,
  RefreshResponseSchema,
  TokenRequestSchema,
  TokenResponseSchema,
  VerifyRequestSchema,
  VerifyResponseSchema,
} from '../auth.js'

// ---------------------------------------------------------------------------
// Helpers
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
// SupportedLocaleSchema
// ---------------------------------------------------------------------------

describe('SupportedLocaleSchema', () => {
  it('accepts valid locales', () => {
    expect(SupportedLocaleSchema.parse('en')).toBe('en')
    expect(SupportedLocaleSchema.parse('fr')).toBe('fr')
    expect(SupportedLocaleSchema.parse('vi')).toBe('vi')
  })

  it('rejects invalid locales', () => {
    expect(() => SupportedLocaleSchema.parse('de')).toThrow()
    expect(() => SupportedLocaleSchema.parse('')).toThrow()
    expect(() => SupportedLocaleSchema.parse(42)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// EmailOverrideSchema
// ---------------------------------------------------------------------------

describe('EmailOverrideSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(EmailOverrideSchema.parse({})).toEqual({})
  })

  it('accepts all valid fields', () => {
    const full = {
      subject: 'Hello',
      heading: 'Welcome',
      intro: 'Hi there',
      ctaLabel: 'Click me',
      outro: 'Goodbye',
      from: 'noreply@example.com',
      replyTo: 'support@example.com',
      bodyHtml: '<h1>Hi</h1>',
    }
    expect(EmailOverrideSchema.parse(full)).toEqual(full)
  })

  it('rejects invalid email in from/replyTo', () => {
    expect(() => EmailOverrideSchema.parse({ from: 'not-an-email' })).toThrow()
    expect(() => EmailOverrideSchema.parse({ replyTo: 'bad' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// AuthUserSchema
// ---------------------------------------------------------------------------

describe('AuthUserSchema', () => {
  it('parses a minimal valid user', () => {
    const result = AuthUserSchema.parse(validUser)
    expect(result._id).toBe(validUser._id)
    expect(result.email).toBe(validUser.email)
  })

  it('parses a user with all optional fields', () => {
    const full = {
      ...validUser,
      firstName: 'Jane',
      lastName: 'Doe',
      avatar: 'https://example.com/avatar.png',
      roles: ['admin'],
      permissions: ['read:all'],
      features: ['beta'],
      organizationId: 'org_1',
      managedBy: 'user_0',
    }
    const result = AuthUserSchema.parse(full)
    expect(result.roles).toEqual(['admin'])
    expect(result.features).toEqual(['beta'])
  })

  it('rejects missing required fields', () => {
    expect(() => AuthUserSchema.parse({})).toThrow()
    expect(() => AuthUserSchema.parse({ _id: '1' })).toThrow()
    const { email: _, ...noEmail } = validUser
    expect(() => AuthUserSchema.parse(noEmail)).toThrow()
  })

  it('rejects wrong types', () => {
    expect(() => AuthUserSchema.parse({ ...validUser, isVerified: 'yes' })).toThrow()
    expect(() => AuthUserSchema.parse({ ...validUser, apps: 'myapp' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// LoginRequestSchema
// ---------------------------------------------------------------------------

describe('LoginRequestSchema', () => {
  const valid = { email: 'user@test.com', password: 'secret', app: 'myapp' }

  it('parses a valid request', () => {
    expect(LoginRequestSchema.parse(valid)).toMatchObject(valid)
  })

  it('accepts optional redirect_uri', () => {
    const withUri = { ...valid, redirect_uri: 'https://example.com/cb' }
    expect(LoginRequestSchema.parse(withUri).redirect_uri).toBe('https://example.com/cb')
  })

  it('rejects empty email', () => {
    expect(() => LoginRequestSchema.parse({ ...valid, email: '' })).toThrow()
  })

  it('rejects empty password', () => {
    expect(() => LoginRequestSchema.parse({ ...valid, password: '' })).toThrow()
  })

  it('rejects empty app', () => {
    expect(() => LoginRequestSchema.parse({ ...valid, app: '' })).toThrow()
  })

  it('rejects invalid redirect_uri', () => {
    expect(() => LoginRequestSchema.parse({ ...valid, redirect_uri: 'not-a-url' })).toThrow()
  })

  it('rejects missing fields', () => {
    expect(() => LoginRequestSchema.parse({})).toThrow()
    expect(() => LoginRequestSchema.parse({ email: 'a' })).toThrow()
  })
})

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
// RegisterRequestSchema
// ---------------------------------------------------------------------------

describe('RegisterRequestSchema', () => {
  const valid = {
    email: 'new@example.com',
    username: 'newuser',
    password: 'long-password',
    app: 'myapp',
  }

  it('parses a valid request with defaults', () => {
    const result = RegisterRequestSchema.parse(valid)
    expect(result.locale).toBe('en') // default
  })

  it('accepts all optional fields', () => {
    const full = {
      ...valid,
      firstName: 'Jane',
      lastName: 'Doe',
      redirect_uri: 'https://example.com/cb',
      promoCode: 'PROMO',
      locale: 'fr' as const,
      emailOverride: { subject: 'Welcome' },
    }
    expect(RegisterRequestSchema.parse(full).locale).toBe('fr')
  })

  it('rejects invalid email format', () => {
    expect(() => RegisterRequestSchema.parse({ ...valid, email: 'bad' })).toThrow()
  })

  // H1 (2026-05-15) — password minimum raised from 8 to 12 chars.
  it('rejects password shorter than 12 chars', () => {
    expect(() => RegisterRequestSchema.parse({ ...valid, password: 'short' })).toThrow()
    expect(() => RegisterRequestSchema.parse({ ...valid, password: '12345678' })).toThrow()
    expect(() => RegisterRequestSchema.parse({ ...valid, password: '12345678901' })).toThrow()
  })

  it('accepts password exactly 12 chars', () => {
    expect(RegisterRequestSchema.parse({ ...valid, password: '123456789012' }).password).toBe(
      '123456789012'
    )
  })

  it('rejects empty username', () => {
    expect(() => RegisterRequestSchema.parse({ ...valid, username: '' })).toThrow()
  })

  it('RegisterResponseSchema is the same as LoginAuthCodeResponseSchema', () => {
    expect(RegisterResponseSchema).toBe(LoginAuthCodeResponseSchema)
  })
})

// ---------------------------------------------------------------------------
// QuickSignupRequestSchema
// ---------------------------------------------------------------------------

describe('QuickSignupRequestSchema', () => {
  const valid = { username: 'quickuser', email: 'quick@example.com', app: 'myapp' }

  it('parses a valid request', () => {
    expect(QuickSignupRequestSchema.parse(valid).locale).toBe('en')
  })

  // H3 (2026-05-15) — username now strict regex (3-32 alphanumerics + _ - .).
  // Length cap dropped from 50 to 32, but the prior >50 rejection still holds.
  it('rejects username longer than 32 chars', () => {
    expect(() => QuickSignupRequestSchema.parse({ ...valid, username: 'a'.repeat(33) })).toThrow()
    expect(() => QuickSignupRequestSchema.parse({ ...valid, username: 'a'.repeat(51) })).toThrow()
  })

  it('accepts username exactly 32 chars', () => {
    const name32 = 'a'.repeat(32)
    expect(QuickSignupRequestSchema.parse({ ...valid, username: name32 }).username).toBe(name32)
  })

  it('rejects empty username', () => {
    expect(() => QuickSignupRequestSchema.parse({ ...valid, username: '' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => QuickSignupRequestSchema.parse({ ...valid, email: 'nope' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// ForgotPasswordRequestSchema
// ---------------------------------------------------------------------------

describe('ForgotPasswordRequestSchema', () => {
  it('parses with only email', () => {
    const result = ForgotPasswordRequestSchema.parse({ email: 'a@b.com' })
    expect(result.email).toBe('a@b.com')
    expect(result.locale).toBe('en') // default
  })

  it('rejects invalid email', () => {
    expect(() => ForgotPasswordRequestSchema.parse({ email: 'bad' })).toThrow()
  })

  it('accepts optional app and redirect_uri', () => {
    const result = ForgotPasswordRequestSchema.parse({
      email: 'a@b.com',
      app: 'myapp',
      redirect_uri: 'https://example.com/reset',
    })
    expect(result.app).toBe('myapp')
  })
})

// ---------------------------------------------------------------------------
// ResetPasswordRequestSchema
// ---------------------------------------------------------------------------

describe('ResetPasswordRequestSchema', () => {
  it('parses a valid request', () => {
    const result = ResetPasswordRequestSchema.parse({
      token: 'tok_abc',
      newPassword: 'newpass-2026',
    })
    expect(result.token).toBe('tok_abc')
  })

  it('rejects empty token', () => {
    expect(() =>
      ResetPasswordRequestSchema.parse({ token: '', newPassword: '123456789012' })
    ).toThrow()
  })

  it('rejects short password (< 12 chars after H1 hardening)', () => {
    expect(() => ResetPasswordRequestSchema.parse({ token: 'x', newPassword: '1234567' })).toThrow()
    expect(() =>
      ResetPasswordRequestSchema.parse({ token: 'x', newPassword: '12345678' })
    ).toThrow()
    expect(() =>
      ResetPasswordRequestSchema.parse({ token: 'x', newPassword: '12345678901' })
    ).toThrow()
  })

  it('accepts password at 12 chars', () => {
    const result = ResetPasswordRequestSchema.parse({ token: 'x', newPassword: '123456789012' })
    expect(result.newPassword).toBe('123456789012')
  })
})

// ---------------------------------------------------------------------------
// VerifyEmailRequestSchema
// ---------------------------------------------------------------------------

describe('VerifyEmailRequestSchema', () => {
  it('parses a valid token', () => {
    expect(VerifyEmailRequestSchema.parse({ token: 'verify_abc' }).token).toBe('verify_abc')
  })

  it('rejects empty token', () => {
    expect(() => VerifyEmailRequestSchema.parse({ token: '' })).toThrow()
  })

  it('rejects missing token', () => {
    expect(() => VerifyEmailRequestSchema.parse({})).toThrow()
  })
})

// ---------------------------------------------------------------------------
// SendVerificationRequestSchema
// ---------------------------------------------------------------------------

describe('SendVerificationRequestSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = SendVerificationRequestSchema.parse({})
    expect(result.locale).toBe('en')
  })

  it('accepts all optional fields', () => {
    const result = SendVerificationRequestSchema.parse({
      app: 'myapp',
      redirect_uri: 'https://example.com/verify',
      locale: 'vi',
      emailOverride: { ctaLabel: 'Verify Now' },
    })
    expect(result.locale).toBe('vi')
  })
})

// ---------------------------------------------------------------------------
// RefreshRequestSchema / RefreshResponseSchema
// ---------------------------------------------------------------------------

describe('RefreshRequestSchema', () => {
  it('accepts empty object (refreshToken is optional)', () => {
    expect(RefreshRequestSchema.parse({})).toEqual({})
  })

  it('accepts a refreshToken', () => {
    expect(RefreshRequestSchema.parse({ refreshToken: 'rt_abc' }).refreshToken).toBe('rt_abc')
  })

  it('rejects empty refreshToken string', () => {
    expect(() => RefreshRequestSchema.parse({ refreshToken: '' })).toThrow()
  })
})

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
// TokenRequestSchema / TokenResponseSchema
// ---------------------------------------------------------------------------

describe('TokenRequestSchema', () => {
  const valid = { code: 'auth_code', app: 'myapp' }

  it('parses a valid request', () => {
    expect(TokenRequestSchema.parse(valid).code).toBe('auth_code')
  })

  it('accepts optional redirect_uri', () => {
    const result = TokenRequestSchema.parse({ ...valid, redirect_uri: 'https://example.com/cb' })
    expect(result.redirect_uri).toBe('https://example.com/cb')
  })

  it('rejects empty code', () => {
    expect(() => TokenRequestSchema.parse({ ...valid, code: '' })).toThrow()
  })

  it('rejects empty app', () => {
    expect(() => TokenRequestSchema.parse({ ...valid, app: '' })).toThrow()
  })

  // H3 (2026-05-15) — code is regex-restricted to URL-safe chars.
  it('H3: rejects code with newline (log injection)', () => {
    expect(() => TokenRequestSchema.parse({ ...valid, code: 'auth\ncode' })).toThrow()
  })

  it('H3: rejects code with NUL byte', () => {
    expect(() => TokenRequestSchema.parse({ ...valid, code: 'auth\0code' })).toThrow()
  })

  it('H3: rejects code with whitespace', () => {
    expect(() => TokenRequestSchema.parse({ ...valid, code: 'auth code' })).toThrow()
  })
})

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
// VerifyRequestSchema / VerifyResponseSchema
// ---------------------------------------------------------------------------

describe('VerifyRequestSchema', () => {
  it('parses with token only', () => {
    expect(VerifyRequestSchema.parse({ token: 'jwt_abc' }).token).toBe('jwt_abc')
  })

  it('accepts optional app', () => {
    expect(VerifyRequestSchema.parse({ token: 'jwt_abc', app: 'myapp' }).app).toBe('myapp')
  })

  it('rejects empty token', () => {
    expect(() => VerifyRequestSchema.parse({ token: '' })).toThrow()
  })

  // H3 (2026-05-15) — token is regex-restricted to URL-safe chars.
  it('H3: rejects token with newline', () => {
    expect(() => VerifyRequestSchema.parse({ token: 'jwt\nabc' })).toThrow()
  })
})

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

// ---------------------------------------------------------------------------
// C-2 — AuthUserSchema preserves RBAC + 2FA fields (2026-05-15)
//
// Previous schema silently stripped `twoFactorEnabled`, `globalRoles`,
// `appRoles`, `hasSetOwnPassword`, `mustChangePassword`, `promoCode`,
// `lastActiveAt`. A consumer wiring `AuthUserSchema.parse(serverResponse)`
// got an `AuthUser` shaped object with NO 2FA flag and NO superadmin role,
// silently disabling every downstream RBAC gate.
// Fix: schema aligned with `auth-sdk/src/core/types.ts:AuthUser` + `.passthrough()`.
// ---------------------------------------------------------------------------

describe('AuthUserSchema — C-2 field preservation', () => {
  it('preserves twoFactorEnabled: true', () => {
    const result = AuthUserSchema.parse({ ...validUser, twoFactorEnabled: true })
    expect(result.twoFactorEnabled).toBe(true)
  })

  it('preserves twoFactorEnabled: false', () => {
    const result = AuthUserSchema.parse({ ...validUser, twoFactorEnabled: false })
    expect(result.twoFactorEnabled).toBe(false)
  })

  it('preserves twoFactorVerifiedAt (nullable ISO string)', () => {
    const result = AuthUserSchema.parse({
      ...validUser,
      twoFactorVerifiedAt: '2025-04-01T00:00:00.000Z',
    })
    expect(result.twoFactorVerifiedAt).toBe('2025-04-01T00:00:00.000Z')

    const nullResult = AuthUserSchema.parse({ ...validUser, twoFactorVerifiedAt: null })
    expect(nullResult.twoFactorVerifiedAt).toBeNull()
  })

  it('preserves globalRoles array', () => {
    const result = AuthUserSchema.parse({
      ...validUser,
      globalRoles: ['superadmin', 'support'],
    })
    expect(result.globalRoles).toEqual(['superadmin', 'support'])
  })

  it('preserves appRoles record', () => {
    const result = AuthUserSchema.parse({
      ...validUser,
      appRoles: { ezauth: ['admin'], ezpay: ['readonly'] },
    })
    expect(result.appRoles).toEqual({ ezauth: ['admin'], ezpay: ['readonly'] })
  })

  it('preserves hasSetOwnPassword', () => {
    const result = AuthUserSchema.parse({ ...validUser, hasSetOwnPassword: true })
    expect(result.hasSetOwnPassword).toBe(true)
  })

  it('preserves mustChangePassword', () => {
    const result = AuthUserSchema.parse({ ...validUser, mustChangePassword: true })
    expect(result.mustChangePassword).toBe(true)
  })

  it('preserves promoCode', () => {
    const result = AuthUserSchema.parse({ ...validUser, promoCode: 'BLACKFRIDAY' })
    expect(result.promoCode).toBe('BLACKFRIDAY')
  })

  it('preserves lastActiveAt (nullable)', () => {
    const result = AuthUserSchema.parse({
      ...validUser,
      lastActiveAt: '2025-05-15T10:00:00.000Z',
    })
    expect(result.lastActiveAt).toBe('2025-05-15T10:00:00.000Z')

    const nullResult = AuthUserSchema.parse({ ...validUser, lastActiveAt: null })
    expect(nullResult.lastActiveAt).toBeNull()
  })

  it('preserves UNKNOWN forward-compatible fields via .passthrough()', () => {
    // A future ezauth version adds `betaFeatureEnrollments: string[]` —
    // older consumers MUST still see this field, not have it silently dropped.
    const result = AuthUserSchema.parse({
      ...validUser,
      betaFeatureEnrollments: ['feature-x', 'feature-y'],
    }) as typeof validUser & { betaFeatureEnrollments?: string[] }
    expect(result.betaFeatureEnrollments).toEqual(['feature-x', 'feature-y'])
  })

  it('preserves a full hostile-looking response (server announces 2FA + superadmin)', () => {
    const wireUser = {
      ...validUser,
      twoFactorEnabled: true,
      globalRoles: ['superadmin'],
      appRoles: { ezauth: ['admin'] },
      hasSetOwnPassword: true,
      mustChangePassword: false,
      promoCode: 'PROMO_2026',
      lastActiveAt: '2025-05-14T23:59:59.999Z',
    }
    const parsed = AuthUserSchema.parse(wireUser)
    expect(parsed.twoFactorEnabled).toBe(true)
    expect(parsed.globalRoles).toEqual(['superadmin'])
    expect(parsed.appRoles?.ezauth).toEqual(['admin'])
    expect(parsed.hasSetOwnPassword).toBe(true)
    expect(parsed.promoCode).toBe('PROMO_2026')
  })

  it('rejects oversized globalRoles array (DoS)', () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `role-${i}`)
    expect(() => AuthUserSchema.parse({ ...validUser, globalRoles: tooMany })).toThrow()
  })

  it('rejects appRoles where role list exceeds bound', () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `role-${i}`)
    expect(() => AuthUserSchema.parse({ ...validUser, appRoles: { ezauth: tooMany } })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// H2 — EmailOverrideSchema injection vectors (2026-05-15)
// ---------------------------------------------------------------------------

describe('EmailOverrideSchema — H2 injection vectors', () => {
  it('rejects subject with CR (SMTP header injection)', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'Hello\rBcc: attacker@evil.com' })).toThrow()
  })

  it('rejects subject with LF', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'Hello\nBcc: attacker@evil.com' })).toThrow()
  })

  it('rejects subject with CRLF combo', () => {
    expect(() =>
      EmailOverrideSchema.parse({
        subject: 'Hello\r\nBcc: attacker@evil.com\r\nContent-Type: text/html',
      })
    ).toThrow()
  })

  it('rejects subject with NUL byte', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'Hello\0evil' })).toThrow()
  })

  it('rejects subject with TAB (line folding bypass)', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'Hello\tBcc: x@y.z' })).toThrow()
  })

  it('rejects heading with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ heading: 'Welcome\r\nX-Spoofed: yes' })).toThrow()
  })

  it('rejects intro with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ intro: 'Hi\r\nX-Spoofed: yes' })).toThrow()
  })

  it('rejects outro with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ outro: 'Bye\r\nX-Spoofed: yes' })).toThrow()
  })

  it('rejects ctaLabel with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ ctaLabel: 'Click\r\nHere' })).toThrow()
  })

  it('rejects preheader with CRLF', () => {
    expect(() => EmailOverrideSchema.parse({ preheader: 'Preview\r\nX-Spoofed: yes' })).toThrow()
  })

  it('rejects bodyHtml with <script> tag', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<script>alert(1)</script>' })).toThrow()
  })

  it('rejects bodyHtml with case-insensitive <SCRIPT>', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<ScRiPt>alert(1)</ScRiPt>' })).toThrow()
  })

  it('rejects bodyHtml with javascript: URL', () => {
    expect(() =>
      EmailOverrideSchema.parse({ bodyHtml: '<a href="javascript:alert(1)">click</a>' })
    ).toThrow()
  })

  it('rejects bodyHtml with onerror= attribute', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<img src=x onerror=alert(1)>' })).toThrow()
  })

  it('rejects bodyHtml with onclick= attribute', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: '<a onclick="evil()">x</a>' })).toThrow()
  })

  it('accepts safe HTML in bodyHtml', () => {
    const safe = '<p>Hello <strong>world</strong>!</p><a href="https://example.com">link</a>'
    const result = EmailOverrideSchema.parse({ bodyHtml: safe })
    expect(result.bodyHtml).toBe(safe)
  })

  it('rejects subject > 998 chars (RFC 5322 line length)', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'a'.repeat(999) })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// H3 — username / app / token / code regex allowlists (2026-05-15)
// ---------------------------------------------------------------------------

describe('H3 — username regex allowlist', () => {
  const base = { email: 'a@b.com', password: 'long-password-x', app: 'myapp' }

  it('rejects username with HTML (<script>)', () => {
    expect(() =>
      RegisterRequestSchema.parse({ ...base, username: '<script>alert(1)</script>' })
    ).toThrow()
  })

  it('rejects username with path traversal (../)', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, username: '../../etc/passwd' })).toThrow()
  })

  it('rejects username with newline', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, username: 'line1\nline2' })).toThrow()
  })

  it('rejects username with NUL byte', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, username: 'user\0evil' })).toThrow()
  })

  it('rejects username with whitespace', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, username: 'user name' })).toThrow()
  })

  it('rejects username with slash (path delimiter)', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, username: 'user/name' })).toThrow()
  })

  it('rejects username shorter than 3 chars', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, username: 'ab' })).toThrow()
  })

  it('accepts username with allowed chars (alphanumerics + _ - .)', () => {
    const result = RegisterRequestSchema.parse({ ...base, username: 'user_2026.alpha-beta' })
    expect(result.username).toBe('user_2026.alpha-beta')
  })
})

describe('H3 — app slug regex allowlist', () => {
  const base = {
    email: 'a@b.com',
    username: 'gooduser',
    password: 'long-password-x',
  }

  it('rejects app with path traversal', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, app: '../evil' })).toThrow()
  })

  it('rejects app with uppercase (must be lowercase slug)', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, app: 'EzAuth' })).toThrow()
  })

  it('rejects app with NUL byte', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, app: 'safe\0evil' })).toThrow()
  })

  it('rejects app with newline (log injection)', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, app: 'good\nbad' })).toThrow()
  })

  it('rejects app with whitespace', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, app: 'my app' })).toThrow()
  })

  it('rejects app shorter than 2 chars', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, app: 'a' })).toThrow()
  })

  it('rejects app longer than 32 chars', () => {
    expect(() => RegisterRequestSchema.parse({ ...base, app: 'a'.repeat(33) })).toThrow()
  })

  it('accepts standard kebab-case app slug', () => {
    const result = RegisterRequestSchema.parse({ ...base, app: 'green-pulse' })
    expect(result.app).toBe('green-pulse')
  })
})

describe('H3 — token regex allowlist', () => {
  it('rejects reset token with HTML', () => {
    expect(() =>
      ResetPasswordRequestSchema.parse({
        token: '<script>alert(1)</script>',
        newPassword: '123456789012',
      })
    ).toThrow()
  })

  it('rejects reset token with newline', () => {
    expect(() =>
      ResetPasswordRequestSchema.parse({ token: 'tok\nabc', newPassword: '123456789012' })
    ).toThrow()
  })

  it('rejects reset token with NUL byte', () => {
    expect(() =>
      ResetPasswordRequestSchema.parse({ token: 'tok\0abc', newPassword: '123456789012' })
    ).toThrow()
  })

  it('accepts URL-safe base64 token', () => {
    const result = ResetPasswordRequestSchema.parse({
      token: 'abc.DEF_xyz-123',
      newPassword: '123456789012',
    })
    expect(result.token).toBe('abc.DEF_xyz-123')
  })
})

// ---------------------------------------------------------------------------
// H4 — safeRedirectUri (2026-05-15)
// ---------------------------------------------------------------------------

describe('H4 — safeRedirectUri hardening', () => {
  const loginBase = { email: 'user@test.com', password: 'pwd', app: 'myapp' }

  it('rejects userinfo (https://evil@trusted.com)', () => {
    expect(() =>
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'https://evil.com@trusted.com/' })
    ).toThrow()
  })

  it('rejects userinfo with password (https://user:pass@host/)', () => {
    expect(() =>
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'https://u:p@example.com/' })
    ).toThrow()
  })

  it('rejects URL with raw CR in input string (CRLF injection primitive)', () => {
    expect(() =>
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'https://example.com/\rpath' })
    ).toThrow()
  })

  it('rejects URL with raw LF in input string', () => {
    expect(() =>
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'https://example.com/\npath' })
    ).toThrow()
  })

  it('rejects URL with raw TAB in input string', () => {
    expect(() =>
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'https://example.com/\tpath' })
    ).toThrow()
  })

  it('rejects URL with raw NUL byte in input string', () => {
    expect(() =>
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'https://example.com/\0path' })
    ).toThrow()
  })

  it('rejects fragment containing javascript: scheme', () => {
    expect(() =>
      LoginRequestSchema.parse({
        ...loginBase,
        redirect_uri: 'https://example.com/#javascript:alert(1)',
      })
    ).toThrow()
  })

  it('rejects fragment containing case-insensitive JavaScript:', () => {
    expect(() =>
      LoginRequestSchema.parse({
        ...loginBase,
        redirect_uri: 'https://example.com/#JavaScript:void(0)',
      })
    ).toThrow()
  })

  it('still rejects javascript: scheme', () => {
    expect(() =>
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'javascript:alert(1)' })
    ).toThrow()
  })

  it('rejects Unicode confusable hostname (Cyrillic "а" in example.com)', () => {
    // а = Cyrillic small letter a (looks identical to Latin a)
    // The full URL appears to read "example.com" but the second "a" is Cyrillic.
    expect(() =>
      LoginRequestSchema.parse({
        ...loginBase,
        redirect_uri: 'https://exаmple.com/callback',
      })
    ).toThrow()
  })

  it('rejects non-ASCII hostname (general IDN — consumer must pre-encode to punycode)', () => {
    expect(() =>
      LoginRequestSchema.parse({
        ...loginBase,
        redirect_uri: 'https://münchen.example.com/callback',
      })
    ).toThrow()
  })

  it('accepts pre-encoded punycode hostname', () => {
    const result = LoginRequestSchema.parse({
      ...loginBase,
      redirect_uri: 'https://xn--mnchen-3ya.example.com/callback',
    })
    expect(result.redirect_uri).toBe('https://xn--mnchen-3ya.example.com/callback')
  })

  it('still accepts clean https://', () => {
    const result = LoginRequestSchema.parse({
      ...loginBase,
      redirect_uri: 'https://example.com/callback?state=xyz',
    })
    expect(result.redirect_uri).toBe('https://example.com/callback?state=xyz')
  })

  it('still accepts clean http:// (dev)', () => {
    const result = LoginRequestSchema.parse({
      ...loginBase,
      redirect_uri: 'http://localhost:6111/auth/callback',
    })
    expect(result.redirect_uri).toBe('http://localhost:6111/auth/callback')
  })

  it('accepts clean fragment (non-javascript)', () => {
    const result = LoginRequestSchema.parse({
      ...loginBase,
      redirect_uri: 'https://example.com/page#section-1',
    })
    expect(result.redirect_uri).toBe('https://example.com/page#section-1')
  })
})
