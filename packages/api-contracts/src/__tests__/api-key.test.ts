import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  ApiKeyEnvSchema,
  ApiKeyItemSchema,
  ApiKeyScopeSchema,
  ApiKeyTypeSchema,
  ApiKeyUsageResponseSchema,
  CreateApiKeyRequestSchema,
  CreateApiKeyResponseSchema,
  type ApiKeyEnv,
  type ApiKeyItem,
  type ApiKeyScope,
  type ApiKeyType,
  type ApiKeyUsageResponse,
  type CreateApiKeyRequest,
  type CreateApiKeyResponse,
} from '../api-key.js'

describe('ApiKeyTypeSchema', () => {
  it('accepts publishable and secret', () => {
    expect(ApiKeyTypeSchema.parse('publishable')).toBe('publishable')
    expect(ApiKeyTypeSchema.parse('secret')).toBe('secret')
  })

  it('rejects unknown types', () => {
    expect(() => ApiKeyTypeSchema.parse('admin')).toThrow()
    expect(() => ApiKeyTypeSchema.parse('public')).toThrow()
    expect(() => ApiKeyTypeSchema.parse('')).toThrow()
  })

  it('exports the type union', () => {
    expectTypeOf<ApiKeyType>().toEqualTypeOf<'publishable' | 'secret'>()
  })
})

describe('ApiKeyEnvSchema', () => {
  it('accepts live and test', () => {
    expect(ApiKeyEnvSchema.parse('live')).toBe('live')
    expect(ApiKeyEnvSchema.parse('test')).toBe('test')
  })

  it('rejects unknown envs (no staging/prod/etc)', () => {
    expect(() => ApiKeyEnvSchema.parse('staging')).toThrow()
    expect(() => ApiKeyEnvSchema.parse('prod')).toThrow()
    expect(() => ApiKeyEnvSchema.parse('production')).toThrow()
  })

  it('exports the type union', () => {
    expectTypeOf<ApiKeyEnv>().toEqualTypeOf<'live' | 'test'>()
  })
})

describe('ApiKeyScopeSchema', () => {
  it('accepts modern scopes (admin, user, readonly)', () => {
    expect(ApiKeyScopeSchema.parse('admin')).toBe('admin')
    expect(ApiKeyScopeSchema.parse('user')).toBe('user')
    expect(ApiKeyScopeSchema.parse('readonly')).toBe('readonly')
  })

  it('accepts legacy scopes (test, live) for read-compat with pre-P2a keys', () => {
    expect(ApiKeyScopeSchema.parse('test')).toBe('test')
    expect(ApiKeyScopeSchema.parse('live')).toBe('live')
  })

  it('rejects unknown scopes', () => {
    expect(() => ApiKeyScopeSchema.parse('owner')).toThrow()
    expect(() => ApiKeyScopeSchema.parse('write')).toThrow()
    expect(() => ApiKeyScopeSchema.parse('superadmin')).toThrow()
  })

  it('exports the type union', () => {
    expectTypeOf<ApiKeyScope>().toEqualTypeOf<'admin' | 'user' | 'readonly' | 'test' | 'live'>()
  })
})

describe('ApiKeyItemSchema', () => {
  const baseValid: ApiKeyItem = {
    id: 'key_abc',
    keyPrefix: 'ez_pk_live_a1b2c3',
    name: 'Production API',
    appName: 'myapp',
    applicationId: null,
    scope: 'live',
    permissions: [],
    status: 'active',
    lastUsedAt: null,
    expiresAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    revokedAt: null,
    quotaMonthly: null,
    usageThisMonth: 0,
    type: null,
    env: null,
  }

  it('accepts a valid item', () => {
    expect(ApiKeyItemSchema.parse(baseValid)).toEqual(baseValid)
  })

  it('accepts a revoked key', () => {
    const revoked: ApiKeyItem = {
      ...baseValid,
      status: 'revoked',
      revokedAt: '2026-02-01T00:00:00.000Z',
    }
    expect(ApiKeyItemSchema.parse(revoked).status).toBe('revoked')
  })

  it('accepts permissions list + applicationId + quota', () => {
    const full: ApiKeyItem = {
      ...baseValid,
      applicationId: 'app_xyz',
      permissions: ['read:users', 'write:keys'],
      quotaMonthly: 10000,
      usageThisMonth: 123,
      lastUsedAt: '2026-05-15T12:00:00.000Z',
      expiresAt: '2027-01-01T00:00:00.000Z',
    }
    expect(ApiKeyItemSchema.parse(full)).toEqual(full)
  })

  it('rejects unknown scope values', () => {
    expect(() => ApiKeyItemSchema.parse({ ...baseValid, scope: 'evil' })).toThrow()
  })

  it('rejects unknown status', () => {
    expect(() => ApiKeyItemSchema.parse({ ...baseValid, status: 'pending' })).toThrow()
  })

  describe('drift fixes (Lot 2.3.1)', () => {
    it('accepts scope=user (modern permission level)', () => {
      const result = ApiKeyItemSchema.safeParse({ ...baseValid, scope: 'user' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.scope).toBe('user')
    })

    it('accepts scope=readonly (modern permission level)', () => {
      const result = ApiKeyItemSchema.safeParse({ ...baseValid, scope: 'readonly' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.scope).toBe('readonly')
    })

    it('accepts applicationId=null (wire emits null for pre-P6 keys)', () => {
      const result = ApiKeyItemSchema.safeParse({ ...baseValid, applicationId: null })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.applicationId).toBeNull()
    })

    it('preserves type field on parse (was silently stripped pre-Lot 2.3.1)', () => {
      const result = ApiKeyItemSchema.safeParse({ ...baseValid, type: 'publishable' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.type).toBe('publishable')
    })

    it('preserves env field on parse (was silently stripped pre-Lot 2.3.1)', () => {
      const result = ApiKeyItemSchema.safeParse({ ...baseValid, env: 'test' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.env).toBe('test')
    })

    it('accepts the full real wire shape from apps/ezauth/api/src/routes/api-keys/list.ts', () => {
      // Mirror the exact wire shape from list.ts:131-148.
      const wireItem = {
        id: 'key_abc',
        keyPrefix: 'ez_pk_test_a1b2c3',
        name: 'Test key',
        appName: 'myapp',
        scope: 'user',
        permissions: [],
        status: 'active' as const,
        lastUsedAt: null,
        expiresAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        revokedAt: null,
        quotaMonthly: null,
        usageThisMonth: 0,
        applicationId: null,
        type: 'publishable' as const,
        env: 'test' as const,
      }
      const result = ApiKeyItemSchema.safeParse(wireItem)
      expect(result.success).toBe(true)
    })

    it('rejects unknown scope=hacker', () => {
      const result = ApiKeyItemSchema.safeParse({ ...baseValid, scope: 'hacker' })
      expect(result.success).toBe(false)
    })

    it('rejects unknown env=preview', () => {
      const result = ApiKeyItemSchema.safeParse({ ...baseValid, env: 'preview' })
      expect(result.success).toBe(false)
    })

    it('rejects unknown type=admin', () => {
      // 'admin' is a valid scope but not a valid type
      const result = ApiKeyItemSchema.safeParse({ ...baseValid, type: 'admin' })
      expect(result.success).toBe(false)
    })
  })
})

describe('ApiKeyUsageResponseSchema', () => {
  it('accepts a fully-populated stats response', () => {
    const stats: ApiKeyUsageResponse = {
      currentMonth: {
        requestCount: 1234,
        topEndpoints: [
          { endpoint: '/api/users/me', count: 800 },
          { endpoint: '/api/keys', count: 434 },
        ],
      },
      daily: [
        { date: '2026-05-01', requestCount: 100 },
        { date: '2026-05-02', requestCount: 200 },
      ],
      quota: { limit: 10000, used: 1234, remaining: 8766 },
    }
    expect(ApiKeyUsageResponseSchema.parse(stats)).toEqual(stats)
  })

  it('accepts unlimited quota (limit/remaining=null)', () => {
    const stats: ApiKeyUsageResponse = {
      currentMonth: { requestCount: 0, topEndpoints: [] },
      daily: [],
      quota: { limit: null, used: 0, remaining: null },
    }
    expect(ApiKeyUsageResponseSchema.parse(stats)).toEqual(stats)
  })
})

describe('CreateApiKeyResponseSchema', () => {
  it('accepts a legacy create response (no type/env/scope)', () => {
    const res: CreateApiKeyResponse = {
      id: 'key_abc',
      key: 'ezk_live_abcdef0123456789',
      keyPrefix: 'ezk_live_abcdef',
      name: 'Legacy key',
    }
    expect(CreateApiKeyResponseSchema.parse(res)).toEqual(res)
  })

  it('accepts a P2a create response with typed key metadata', () => {
    const res: CreateApiKeyResponse = {
      id: 'key_abc',
      key: 'ez_pk_live_a1b2c3d4e5f6...',
      keyPrefix: 'ez_pk_live_a1b2c3',
      name: 'New publishable key',
      applicationId: 'app_xyz',
      type: 'publishable',
      env: 'live',
      scope: 'user',
    }
    expect(CreateApiKeyResponseSchema.parse(res)).toEqual(res)
  })

  it('rejects invalid type/env/scope values', () => {
    expect(() =>
      CreateApiKeyResponseSchema.parse({
        id: 'k',
        key: 'k',
        keyPrefix: 'k',
        name: 'n',
        type: 'evil',
      })
    ).toThrow()
  })
})

describe('CreateApiKeyRequestSchema', () => {
  it('accepts a minimal request (legacy appName flow)', () => {
    const req: CreateApiKeyRequest = {
      name: 'Legacy key',
      appName: 'myapp',
      expiresAt: null,
    }
    expect(CreateApiKeyRequestSchema.parse(req)).toEqual(req)
  })

  it('accepts a P2a request (applicationId + typed metadata)', () => {
    const req: CreateApiKeyRequest = {
      name: 'Production publishable',
      applicationId: 'app_xyz',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      expiresAt: null,
    }
    expect(CreateApiKeyRequestSchema.parse(req)).toEqual(req)
  })

  it('accepts an explicit expiresAt', () => {
    const req: CreateApiKeyRequest = {
      name: 'Time-limited key',
      applicationId: 'app_xyz',
      expiresAt: '2027-01-01T00:00:00.000Z',
    }
    expect(CreateApiKeyRequestSchema.parse(req)).toEqual(req)
  })

  it('rejects missing name', () => {
    expect(() =>
      CreateApiKeyRequestSchema.parse({ applicationId: 'app_xyz', expiresAt: null })
    ).toThrow()
  })

  it('rejects missing expiresAt (must be explicit)', () => {
    expect(() => CreateApiKeyRequestSchema.parse({ name: 'k', applicationId: 'app_xyz' })).toThrow()
  })

  it('rejects invalid type/env/scope', () => {
    expect(() =>
      CreateApiKeyRequestSchema.parse({
        name: 'k',
        applicationId: 'app_xyz',
        type: 'admin',
        expiresAt: null,
      })
    ).toThrow()
  })
})
