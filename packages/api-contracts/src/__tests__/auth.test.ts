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

  it('parses an auth-code response', () => {
    const result = LoginResponseSchema.parse(authCode)
    expect(result).toMatchObject({ code: 'abc123' })
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
})

// ---------------------------------------------------------------------------
// RegisterRequestSchema
// ---------------------------------------------------------------------------

describe('RegisterRequestSchema', () => {
  const valid = {
    email: 'new@example.com',
    username: 'newuser',
    password: 'longpassword',
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

  it('rejects password shorter than 8 chars', () => {
    expect(() => RegisterRequestSchema.parse({ ...valid, password: 'short' })).toThrow()
    expect(() => RegisterRequestSchema.parse({ ...valid, password: '1234567' })).toThrow()
  })

  it('accepts password exactly 8 chars', () => {
    expect(RegisterRequestSchema.parse({ ...valid, password: '12345678' }).password).toBe(
      '12345678'
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

  it('rejects username longer than 50 chars', () => {
    expect(() => QuickSignupRequestSchema.parse({ ...valid, username: 'a'.repeat(51) })).toThrow()
  })

  it('accepts username exactly 50 chars', () => {
    const name50 = 'a'.repeat(50)
    expect(QuickSignupRequestSchema.parse({ ...valid, username: name50 }).username).toBe(name50)
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
    const result = ResetPasswordRequestSchema.parse({ token: 'tok_abc', newPassword: 'newpass88' })
    expect(result.token).toBe('tok_abc')
  })

  it('rejects empty token', () => {
    expect(() => ResetPasswordRequestSchema.parse({ token: '', newPassword: '12345678' })).toThrow()
  })

  it('rejects short password', () => {
    expect(() => ResetPasswordRequestSchema.parse({ token: 'x', newPassword: '1234567' })).toThrow()
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
})
