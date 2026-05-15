/**
 * Adversarial boundary tests for auth schemas.
 *
 * Goal: prove that schemas reject dangerous/oversized inputs that could cause
 * bcrypt DoS, memory exhaustion, or bypass validation.
 */

import { describe, expect, it } from 'vitest'
import {
  LoginRequestSchema,
  RegisterRequestSchema,
  QuickSignupRequestSchema,
  ResetPasswordRequestSchema,
  ForgotPasswordRequestSchema,
  EmailOverrideSchema,
  AuthUserSchema,
  SendVerificationRequestSchema,
  TokenRequestSchema,
  RefreshRequestSchema,
  VerifyRequestSchema,
  VerifyEmailRequestSchema,
} from '../../auth.js'

// ---------------------------------------------------------------------------
// 1. Password max length — bcrypt DoS prevention
//
// bcrypt truncates at 72 bytes but still hashes whatever you send it.
// A 1MB password causes bcrypt to spend excessive CPU. Max 128 is generous.
// ---------------------------------------------------------------------------

describe('password max length (bcrypt DoS)', () => {
  const base = { email: 'user@test.com', app: 'myapp' }

  it('LoginRequestSchema rejects passwords > 128 chars', () => {
    const hugePassword = 'a'.repeat(10_000)
    expect(() => LoginRequestSchema.parse({ ...base, password: hugePassword })).toThrow()
  })

  it('LoginRequestSchema accepts password at 128 chars', () => {
    const pw128 = 'a'.repeat(128)
    expect(LoginRequestSchema.parse({ ...base, password: pw128 }).password).toBe(pw128)
  })

  it('RegisterRequestSchema rejects passwords > 128 chars', () => {
    const hugePassword = 'a'.repeat(10_000)
    expect(() =>
      RegisterRequestSchema.parse({
        ...base,
        username: 'user',
        password: hugePassword,
      })
    ).toThrow()
  })

  it('RegisterRequestSchema accepts password at 128 chars', () => {
    const pw128 = 'a'.repeat(128)
    expect(
      RegisterRequestSchema.parse({
        ...base,
        username: 'user',
        password: pw128,
      }).password
    ).toBe(pw128)
  })

  it('ResetPasswordRequestSchema rejects newPassword > 128 chars', () => {
    const hugePassword = 'a'.repeat(10_000)
    expect(() =>
      ResetPasswordRequestSchema.parse({
        token: 'tok_abc',
        newPassword: hugePassword,
      })
    ).toThrow()
  })

  it('ResetPasswordRequestSchema accepts newPassword at 128 chars', () => {
    const pw128 = 'a'.repeat(128)
    expect(
      ResetPasswordRequestSchema.parse({ token: 'tok_abc', newPassword: pw128 }).newPassword
    ).toBe(pw128)
  })
})

// ---------------------------------------------------------------------------
// 2. Username constraints — max length, disallowed special chars
// ---------------------------------------------------------------------------

describe('username constraints', () => {
  // 2026-05-15 (H3) — username now strict regex (3-32 alphanumerics + _ - .).
  // Bound dropped from 50 to 32.
  it('RegisterRequestSchema rejects username > 32 chars', () => {
    expect(() =>
      RegisterRequestSchema.parse({
        email: 'a@b.com',
        username: 'a'.repeat(33),
        password: 'long-password',
        app: 'myapp',
      })
    ).toThrow()
  })

  it('RegisterRequestSchema accepts username at 32 chars', () => {
    const name32 = 'a'.repeat(32)
    expect(
      RegisterRequestSchema.parse({
        email: 'a@b.com',
        username: name32,
        password: 'long-password',
        app: 'myapp',
      }).username
    ).toBe(name32)
  })
})

// ---------------------------------------------------------------------------
// 3. Email max length — prevent oversized email fields
// ---------------------------------------------------------------------------

describe('email max length', () => {
  it('RegisterRequestSchema rejects email > 254 chars', () => {
    // RFC 5321: max email length is 254
    const longLocal = 'a'.repeat(243)
    const hugeEmail = `${longLocal}@example.com` // 255 chars
    expect(() =>
      RegisterRequestSchema.parse({
        email: hugeEmail,
        username: 'user',
        password: 'long-password',
        app: 'myapp',
      })
    ).toThrow()
  })

  it('ForgotPasswordRequestSchema rejects email > 254 chars', () => {
    const longLocal = 'a'.repeat(243)
    const hugeEmail = `${longLocal}@example.com`
    expect(() => ForgotPasswordRequestSchema.parse({ email: hugeEmail })).toThrow()
  })

  it('QuickSignupRequestSchema rejects email > 254 chars', () => {
    const longLocal = 'a'.repeat(243)
    const hugeEmail = `${longLocal}@example.com`
    expect(() =>
      QuickSignupRequestSchema.parse({
        username: 'user',
        email: hugeEmail,
        app: 'myapp',
      })
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// 4. EmailOverrideSchema — max length on string fields
// ---------------------------------------------------------------------------

describe('EmailOverrideSchema field limits', () => {
  // 2026-05-15 (H2) — subject max raised to RFC 5322 line length (998).
  it('rejects subject > 998 chars (RFC 5322 line length)', () => {
    expect(() => EmailOverrideSchema.parse({ subject: 'a'.repeat(999) })).toThrow()
  })

  it('rejects bodyHtml > 50_000 chars', () => {
    expect(() => EmailOverrideSchema.parse({ bodyHtml: 'a'.repeat(50_001) })).toThrow()
  })

  it('rejects heading > 500 chars', () => {
    expect(() => EmailOverrideSchema.parse({ heading: 'a'.repeat(501) })).toThrow()
  })

  it('rejects intro > 2000 chars', () => {
    expect(() => EmailOverrideSchema.parse({ intro: 'a'.repeat(2001) })).toThrow()
  })

  it('rejects outro > 2000 chars', () => {
    expect(() => EmailOverrideSchema.parse({ outro: 'a'.repeat(2001) })).toThrow()
  })

  it('rejects ctaLabel > 200 chars', () => {
    expect(() => EmailOverrideSchema.parse({ ctaLabel: 'a'.repeat(201) })).toThrow()
  })

  it('accepts fields within limits', () => {
    const result = EmailOverrideSchema.parse({
      subject: 'a'.repeat(998),
      heading: 'a'.repeat(500),
      intro: 'a'.repeat(2000),
      outro: 'a'.repeat(2000),
      ctaLabel: 'a'.repeat(200),
      bodyHtml: 'a'.repeat(50_000),
    })
    expect(result.subject).toHaveLength(998)
  })
})

// ---------------------------------------------------------------------------
// 5. Unknown keys stripping — schemas should not leak extra fields
// ---------------------------------------------------------------------------

describe('unknown key stripping', () => {
  it('LoginRequestSchema strips unknown keys', () => {
    const result = LoginRequestSchema.parse({
      email: 'user@test.com',
      password: 'secret',
      app: 'myapp',
      __proto__: { admin: true },
      isAdmin: true,
      role: 'superadmin',
    })
    expect(result).not.toHaveProperty('isAdmin')
    expect(result).not.toHaveProperty('role')
  })

  it('RegisterRequestSchema strips unknown keys', () => {
    const result = RegisterRequestSchema.parse({
      email: 'user@test.com',
      username: 'user',
      password: 'longpassword',
      app: 'myapp',
      isAdmin: true,
      roles: ['superadmin'],
    })
    expect(result).not.toHaveProperty('isAdmin')
    expect(result).not.toHaveProperty('roles')
  })

  it('QuickSignupRequestSchema strips unknown keys', () => {
    const result = QuickSignupRequestSchema.parse({
      username: 'user',
      email: 'a@b.com',
      app: 'myapp',
      isVerified: true,
    })
    expect(result).not.toHaveProperty('isVerified')
  })
})

// ---------------------------------------------------------------------------
// 6. Login email/username field — accepts both but not garbage
// ---------------------------------------------------------------------------

describe('LoginRequestSchema email field (dual purpose)', () => {
  const base = { password: 'secret', app: 'myapp' }

  it('accepts a valid email', () => {
    expect(LoginRequestSchema.parse({ ...base, email: 'user@test.com' }).email).toBe(
      'user@test.com'
    )
  })

  it('accepts a username (non-email string)', () => {
    expect(LoginRequestSchema.parse({ ...base, email: 'myusername' }).email).toBe('myusername')
  })

  it('rejects email/username > 254 chars', () => {
    expect(() => LoginRequestSchema.parse({ ...base, email: 'a'.repeat(255) })).toThrow()
  })

  it('accepts email/username at 254 chars', () => {
    const long254 = 'a'.repeat(254)
    expect(LoginRequestSchema.parse({ ...base, password: 'secret', email: long254 }).email).toBe(
      long254
    )
  })
})

// ---------------------------------------------------------------------------
// 7. App field — reasonable max length
// ---------------------------------------------------------------------------

describe('app field max length', () => {
  it('LoginRequestSchema rejects app > 100 chars', () => {
    expect(() =>
      LoginRequestSchema.parse({
        email: 'a@b.com',
        password: 'secret',
        app: 'a'.repeat(101),
      })
    ).toThrow()
  })

  it('RegisterRequestSchema rejects app > 100 chars', () => {
    expect(() =>
      RegisterRequestSchema.parse({
        email: 'a@b.com',
        username: 'user',
        password: 'longpassword',
        app: 'a'.repeat(101),
      })
    ).toThrow()
  })

  it('TokenRequestSchema rejects app > 100 chars', () => {
    expect(() =>
      TokenRequestSchema.parse({
        code: 'auth_code',
        app: 'a'.repeat(101),
      })
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// 8. Token fields — max length to prevent oversized tokens
// ---------------------------------------------------------------------------

describe('token field max length', () => {
  it('ResetPasswordRequestSchema rejects token > 2048 chars', () => {
    expect(() =>
      ResetPasswordRequestSchema.parse({
        token: 'a'.repeat(2049),
        newPassword: 'validpass1',
      })
    ).toThrow()
  })

  it('VerifyEmailRequestSchema rejects token > 2048 chars', () => {
    expect(() => VerifyEmailRequestSchema.parse({ token: 'a'.repeat(2049) })).toThrow()
  })

  it('VerifyRequestSchema rejects token > 4096 chars', () => {
    // JWT tokens can be longer than simple tokens
    expect(() => VerifyRequestSchema.parse({ token: 'a'.repeat(4097) })).toThrow()
  })

  it('RefreshRequestSchema rejects refreshToken > 4096 chars', () => {
    expect(() => RefreshRequestSchema.parse({ refreshToken: 'a'.repeat(4097) })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// 9. PromoCode max length
// ---------------------------------------------------------------------------

describe('promoCode max length', () => {
  it('RegisterRequestSchema rejects promoCode > 50 chars', () => {
    expect(() =>
      RegisterRequestSchema.parse({
        email: 'a@b.com',
        username: 'user',
        password: 'longpassword',
        app: 'myapp',
        promoCode: 'a'.repeat(51),
      })
    ).toThrow()
  })

  it('QuickSignupRequestSchema rejects promoCode > 50 chars', () => {
    expect(() =>
      QuickSignupRequestSchema.parse({
        username: 'user',
        email: 'a@b.com',
        app: 'myapp',
        promoCode: 'a'.repeat(51),
      })
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// 9b. utmSource max length
// ---------------------------------------------------------------------------

describe('utmSource max length', () => {
  it('RegisterRequestSchema accepts utmSource up to 128 chars', () => {
    expect(() =>
      RegisterRequestSchema.parse({
        email: 'a@b.com',
        username: 'user',
        password: 'longpassword',
        app: 'myapp',
        utmSource: 'a'.repeat(128),
      })
    ).not.toThrow()
  })

  it('RegisterRequestSchema rejects utmSource > 128 chars', () => {
    expect(() =>
      RegisterRequestSchema.parse({
        email: 'a@b.com',
        username: 'user',
        password: 'longpassword',
        app: 'myapp',
        utmSource: 'a'.repeat(129),
      })
    ).toThrow()
  })

  it('QuickSignupRequestSchema accepts utmSource up to 128 chars', () => {
    expect(() =>
      QuickSignupRequestSchema.parse({
        username: 'user',
        email: 'a@b.com',
        app: 'myapp',
        utmSource: 'a'.repeat(128),
      })
    ).not.toThrow()
  })

  it('QuickSignupRequestSchema rejects utmSource > 128 chars', () => {
    expect(() =>
      QuickSignupRequestSchema.parse({
        username: 'user',
        email: 'a@b.com',
        app: 'myapp',
        utmSource: 'a'.repeat(129),
      })
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// 10. redirect_uri — reject dangerous protocols (XSS/open-redirect)
// ---------------------------------------------------------------------------

describe('redirect_uri protocol safety', () => {
  const loginBase = { email: 'user@test.com', password: 'secret', app: 'myapp' }
  const registerBase = {
    email: 'a@b.com',
    username: 'user',
    password: 'longpassword',
    app: 'myapp',
  }

  it('LoginRequestSchema rejects javascript: URI', () => {
    expect(() =>
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'javascript:alert(1)' })
    ).toThrow()
  })

  it('LoginRequestSchema rejects data: URI', () => {
    expect(() =>
      LoginRequestSchema.parse({
        ...loginBase,
        redirect_uri: 'data:text/html,<script>alert(1)</script>',
      })
    ).toThrow()
  })

  it('LoginRequestSchema accepts https: URI', () => {
    expect(
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'https://example.com/cb' })
        .redirect_uri
    ).toBe('https://example.com/cb')
  })

  it('LoginRequestSchema accepts http: URI (dev)', () => {
    expect(
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'http://localhost:3000/cb' })
        .redirect_uri
    ).toBe('http://localhost:3000/cb')
  })

  it('RegisterRequestSchema rejects javascript: URI', () => {
    expect(() =>
      RegisterRequestSchema.parse({ ...registerBase, redirect_uri: 'javascript:void(0)' })
    ).toThrow()
  })

  it('ForgotPasswordRequestSchema rejects data: URI', () => {
    expect(() =>
      ForgotPasswordRequestSchema.parse({ email: 'a@b.com', redirect_uri: 'data:text/html,test' })
    ).toThrow()
  })

  it('TokenRequestSchema rejects javascript: URI', () => {
    expect(() =>
      TokenRequestSchema.parse({
        code: 'auth_code',
        app: 'myapp',
        redirect_uri: 'javascript:alert(document.cookie)',
      })
    ).toThrow()
  })

  it('SendVerificationRequestSchema rejects vbscript: URI', () => {
    expect(() =>
      SendVerificationRequestSchema.parse({ redirect_uri: 'vbscript:MsgBox("XSS")' })
    ).toThrow()
  })

  it('redirect_uri rejects blob: URI', () => {
    expect(() =>
      LoginRequestSchema.parse({ ...loginBase, redirect_uri: 'blob:https://evil.com/uuid' })
    ).toThrow()
  })

  it('redirect_uri max length 2048', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2030)
    expect(() => LoginRequestSchema.parse({ ...loginBase, redirect_uri: longUrl })).toThrow()
  })

  it('redirect_uri accepts at 2048 chars', () => {
    const url = 'https://example.com/' + 'a'.repeat(2028) // 20 + 2028 = 2048
    expect(LoginRequestSchema.parse({ ...loginBase, redirect_uri: url }).redirect_uri).toHaveLength(
      2048
    )
  })
})

// ---------------------------------------------------------------------------
// 11. EmailOverride from/replyTo — max 254 chars (RFC 5321)
// ---------------------------------------------------------------------------

describe('EmailOverride from/replyTo max length', () => {
  it('rejects from email > 254 chars', () => {
    const longLocal = 'a'.repeat(243)
    const longEmail = `${longLocal}@example.com` // 243 + 12 = 255 chars
    expect(() => EmailOverrideSchema.parse({ from: longEmail })).toThrow()
  })

  it('rejects replyTo email > 254 chars', () => {
    const longLocal = 'a'.repeat(243)
    const longEmail = `${longLocal}@example.com` // 255 chars
    expect(() => EmailOverrideSchema.parse({ replyTo: longEmail })).toThrow()
  })

  it('accepts from email at 254 chars', () => {
    const longLocal = 'a'.repeat(242)
    const email254 = `${longLocal}@example.com` // 254 chars
    expect(EmailOverrideSchema.parse({ from: email254 }).from).toBe(email254)
  })
})
