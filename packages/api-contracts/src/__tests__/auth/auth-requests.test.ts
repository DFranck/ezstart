/**
 * Tests for `src/auth/auth-requests.ts` — client → server request schemas:
 * - LoginRequestSchema (+ A14 control-char filter on email)
 * - RegisterRequestSchema (+ H1 password length)
 * - QuickSignupRequestSchema
 * - ForgotPasswordRequestSchema
 * - ResetPasswordRequestSchema (+ H1 password length)
 * - VerifyEmailRequestSchema
 * - SendVerificationRequestSchema
 * - RefreshRequestSchema
 * - TokenRequestSchema
 * - VerifyRequestSchema
 * - H3 regex coverage across username/app/token
 * - H4 safeRedirectUri hardening (via LoginRequestSchema)
 */

import { describe, expect, it } from 'vitest'
import {
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  QuickSignupRequestSchema,
  RefreshRequestSchema,
  RegisterRequestSchema,
  ResetPasswordRequestSchema,
  SendVerificationRequestSchema,
  TokenRequestSchema,
  VerifyEmailRequestSchema,
  VerifyRequestSchema,
} from '../../auth.js'

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

  // A14 — control characters in the loose username-or-email identifier
  // would let an attacker smuggle log lines or SMTP headers if the server
  // logs the raw identifier. Reject conservatively at the contract layer.
  it('A14: rejects email with trailing CRLF (log injection)', () => {
    expect(() => LoginRequestSchema.parse({ ...valid, email: 'a@b.com\r\n' })).toThrow()
  })

  it('A14: rejects email with CR alone', () => {
    expect(() => LoginRequestSchema.parse({ ...valid, email: 'a@b.com\rsomething' })).toThrow()
  })

  it('A14: rejects email with LF alone', () => {
    expect(() => LoginRequestSchema.parse({ ...valid, email: 'a@b.com\nbcc:evil@x.y' })).toThrow()
  })

  it('A14: rejects email with TAB', () => {
    expect(() => LoginRequestSchema.parse({ ...valid, email: 'a@b.com\ttab' })).toThrow()
  })

  it('A14: rejects email with NUL byte', () => {
    expect(() => LoginRequestSchema.parse({ ...valid, email: 'a@b.com\0evil' })).toThrow()
  })

  it('A14: accepts a plain email identifier', () => {
    expect(LoginRequestSchema.parse({ ...valid, email: 'plain@example.com' }).email).toBe(
      'plain@example.com'
    )
  })

  it('A14: accepts a plain username identifier', () => {
    expect(LoginRequestSchema.parse({ ...valid, email: 'someUser-123.foo' }).email).toBe(
      'someUser-123.foo'
    )
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
// RefreshRequestSchema
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

// ---------------------------------------------------------------------------
// TokenRequestSchema
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

// ---------------------------------------------------------------------------
// VerifyRequestSchema
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
    const result = RegisterRequestSchema.parse({ ...base, app: 'demo-app' })
    expect(result.app).toBe('demo-app')
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
// H4 — safeRedirectUri (via LoginRequestSchema — same refine chain applies
// to every request schema that accepts a redirect_uri).
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
