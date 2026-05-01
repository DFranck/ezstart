/**
 * Tests for `createAuthMiddleware` — drop-in JWT cookie/Bearer + API-key
 * unified auth factory shipped from `@ezstart/auth-sdk/server`.
 *
 * The factory is the SDK-side equivalent of `createUnifiedAuthMiddleware`
 * from `@ezstart/api-core` but pre-wires JWT and API-key verifiers using
 * the same crypto primitives as `@ezstart/auth-sdk/core`. We exercise it
 * with plain mock request / response objects to keep the test layer
 * independent of Express runtime quirks (no supertest needed).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import {
  createAuthMiddleware,
  type ApiKeyDoc,
  type AuthMiddlewareConfig,
  type AuthMiddlewareModel,
  type AuthUserDoc,
} from '../../server/auth-middleware.js'
import { hashApiKey } from '../../core/api-keys-crypto.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const JWT_SECRET = 'test-secret-do-not-use-in-prod'
const COOKIE_NAME = 'ez_access'

function makeUser(overrides: Partial<AuthUserDoc> = {}): AuthUserDoc {
  return {
    _id: 'user-123',
    email: 'alice@example.com',
    username: 'alice',
    isVerified: true,
    apps: ['ezauth'],
    globalRoles: [],
    appRoles: { ezauth: ['admin'] },
    permissions: [],
    features: [],
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  }
}

function makeApiKey(overrides: Partial<ApiKeyDoc> = {}): ApiKeyDoc {
  return {
    _id: { toString: () => 'key-id-1' },
    key: 'hashed-placeholder',
    userId: 'user-123',
    status: 'active',
    scope: 'admin',
    appName: 'ezauth',
    quotaMonthly: null,
    expiresAt: null,
    ...overrides,
  }
}

// Build a mock Mongoose-like model. The middleware only calls `findOne`,
// `findById`, `updateOne`, `aggregate` — we stub these to return canned data.
function buildAuthUserModel(user: AuthUserDoc | null): AuthMiddlewareModel<AuthUserDoc> {
  return {
    findById: vi.fn(() => ({
      select: vi.fn(() => ({
        lean: vi.fn(async () => user),
      })),
    })),
    findOne: vi.fn(() => ({ lean: vi.fn(async () => null) })),
    updateOne: vi.fn(async () => ({ acknowledged: true })),
    aggregate: vi.fn(async () => []),
  }
}

function buildApiKeyModel(key: ApiKeyDoc | null): AuthMiddlewareModel<ApiKeyDoc> {
  return {
    findOne: vi.fn(() => ({ lean: vi.fn(async () => key) })),
    findById: vi.fn(() => ({
      select: vi.fn(() => ({
        lean: vi.fn(async () => null),
      })),
    })),
    updateOne: vi.fn(async () => ({ acknowledged: true })),
    aggregate: vi.fn(async () => []),
  }
}

function buildUsageModel(monthlyTotal = 0): AuthMiddlewareModel<unknown> {
  return {
    findOne: vi.fn(() => ({ lean: vi.fn(async () => null) })),
    findById: vi.fn(() => ({
      select: vi.fn(() => ({
        lean: vi.fn(async () => null),
      })),
    })),
    updateOne: vi.fn(async () => ({ acknowledged: true })),
    aggregate: vi.fn(async () => (monthlyTotal > 0 ? [{ total: monthlyTotal }] : [])),
  }
}

interface MockRes {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  headersSent: boolean
}

function makeRes(): MockRes {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    headersSent: false,
  } as MockRes
  res.status.mockReturnValue(res)
  res.json.mockImplementation(() => {
    res.headersSent = true
    return res
  })
  return res
}

// Build a baseline factory config; tests override individual fields.
function buildConfig(overrides: Partial<AuthMiddlewareConfig> = {}): AuthMiddlewareConfig {
  return {
    appName: 'ezauth',
    jwtSecret: JWT_SECRET,
    cookieName: COOKIE_NAME,
    getApiKeyModel: vi.fn(async () => buildApiKeyModel(null)),
    getApiKeyUsageModel: vi.fn(async () => buildUsageModel()),
    getAuthUserModel: vi.fn(async () => buildAuthUserModel(null)),
    usageCacheTtlMs: 0, // disable cache by default to keep tests deterministic
    ...overrides,
  }
}

function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createAuthMiddleware — JWT path', () => {
  let next: ReturnType<typeof vi.fn>
  beforeEach(() => {
    next = vi.fn()
  })

  it('returns 401 with code UNAUTHORIZED when no JWT and no API key are present', async () => {
    const factory = createAuthMiddleware(buildConfig())
    const middleware = factory()
    const req = { headers: {}, cookies: {}, path: '/' } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => {
        next()
        resolve()
      })
      // give the async path a tick to call sendError
      setTimeout(resolve, 50)
    })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    )
  })

  it('accepts a valid JWT cookie and attaches req.user / req.userId', async () => {
    const user = makeUser()
    const cfg = buildConfig({
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const token = signToken({ userId: 'user-123', email: 'alice@example.com' })
    const req = {
      headers: {},
      cookies: { [COOKIE_NAME]: token },
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    expect(res.json).not.toHaveBeenCalled()
    expect((req as { userId?: string }).userId).toBe('user-123')
    expect((req as { user?: { email?: string } }).user?.email).toBe('alice@example.com')
  })

  it('accepts a JWT via Authorization: Bearer header', async () => {
    const user = makeUser()
    const cfg = buildConfig({
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const token = signToken({ userId: 'user-123', email: 'alice@example.com' })
    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    expect(res.json).not.toHaveBeenCalled()
    expect((req as { userId?: string }).userId).toBe('user-123')
  })

  it('rejects an expired JWT with code TOKEN_EXPIRED (does not fall back to API key)', async () => {
    const user = makeUser()
    const cfg = buildConfig({
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const expired = jwt.sign({ userId: 'user-123' }, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '-1s',
    })
    const req = {
      headers: {},
      cookies: { [COOKIE_NAME]: expired },
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
      })
    )
  })

  it('rejects a forged JWT with code INVALID_TOKEN', async () => {
    const cfg = buildConfig()
    const middleware = createAuthMiddleware(cfg)()
    const forged = jwt.sign({ userId: 'user-123' }, 'WRONG-SECRET', { algorithm: 'HS256' })
    const req = {
      headers: {},
      cookies: { [COOKIE_NAME]: forged },
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_TOKEN' }),
      })
    )
  })

  it('rejects a JWT pointing at a missing user with code USER_NOT_FOUND', async () => {
    const cfg = buildConfig({
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(null)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const token = signToken({ userId: 'ghost-id' })
    const req = {
      headers: {},
      cookies: { [COOKIE_NAME]: token },
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'USER_NOT_FOUND' }),
      })
    )
  })

  it('rejects a JWT for a soft-deleted user (deletedAt set)', async () => {
    const deleted = makeUser({ deletedAt: new Date() })
    const cfg = buildConfig({
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(deleted)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const token = signToken({ userId: 'user-123' })
    const req = {
      headers: {},
      cookies: { [COOKIE_NAME]: token },
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'USER_NOT_FOUND' }),
      })
    )
  })

  it('fires the onUserAttached hook with the resolved userId', async () => {
    const user = makeUser()
    const onUserAttached = vi.fn()
    const cfg = buildConfig({
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
      onUserAttached,
    })
    const middleware = createAuthMiddleware(cfg)()
    const token = signToken({ userId: 'user-123' })
    const req = { headers: {}, cookies: { [COOKIE_NAME]: token }, path: '/' } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    expect(onUserAttached).toHaveBeenCalledWith('user-123')
  })
})

describe('createAuthMiddleware — API key path', () => {
  it('accepts a valid X-API-Key, attaches user and stamps legacy req fields', async () => {
    const user = makeUser()
    const rawKey = 'ez_sk_live_abcdef0123456789'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), scope: 'admin', appName: 'ezauth' })
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)({ requireKeyScope: 'admin' })
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/applications',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    expect(res.json).not.toHaveBeenCalled()
    expect((req as { apiKeyId?: string }).apiKeyId).toBe('key-id-1')
    expect((req as { apiKeyUserId?: string }).apiKeyUserId).toBe('user-123')
    expect((req as { apiKeyScope?: string }).apiKeyScope).toBe('admin')
    expect((req as { apiKeyAppName?: string }).apiKeyAppName).toBe('ezauth')
    expect((req as { user?: { email?: string } }).user?.email).toBe('alice@example.com')
  })

  it('accepts a valid Authorization: ApiKey header (alternative format)', async () => {
    const user = makeUser()
    const rawKey = 'ez_sk_live_xyz'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const req = {
      headers: { authorization: `ApiKey ${rawKey}` },
      cookies: {},
      path: '/x',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    expect(res.json).not.toHaveBeenCalled()
    expect((req as { apiKeyId?: string }).apiKeyId).toBe('key-id-1')
  })

  it('rejects an unknown API key with code INVALID_API_KEY', async () => {
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(null)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const req = {
      headers: { 'x-api-key': 'ez_sk_live_does_not_exist' },
      cookies: {},
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_API_KEY' }),
      })
    )
  })

  it('rejects a revoked API key with code API_KEY_REVOKED', async () => {
    const rawKey = 'ez_sk_live_revoked'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), status: 'revoked' })
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'API_KEY_REVOKED' }),
      })
    )
  })

  it('rejects an expired API key with code API_KEY_EXPIRED', async () => {
    const rawKey = 'ez_sk_live_expired'
    const apiKey = makeApiKey({
      key: hashApiKey(rawKey),
      expiresAt: new Date(Date.now() - 1000),
    })
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'API_KEY_EXPIRED' }),
      })
    )
  })

  it('rejects a key whose monthly quota is exceeded with code QUOTA_EXCEEDED + 429', async () => {
    const rawKey = 'ez_sk_live_quota'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), quotaMonthly: 100 })
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
      getApiKeyUsageModel: vi.fn(async () => buildUsageModel(150)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'QUOTA_EXCEEDED',
          details: { quota: 100, used: 150 },
        }),
      })
    )
  })

  it('rejects a publishable (scope=user) key on an admin-only route with INSUFFICIENT_SCOPE 403', async () => {
    const user = makeUser()
    const rawKey = 'ez_pk_live_user_only'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), scope: 'user' })
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)({ requireKeyScope: 'admin' })
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/applications',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INSUFFICIENT_SCOPE' }),
      })
    )
  })

  it('demotes legacy scope=live to user (rejects on admin route)', async () => {
    const user = makeUser()
    const rawKey = 'ez_pk_live_legacy_scope'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), scope: 'live' })
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)({ requireKeyScope: 'admin' })
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('rejects a key whose owner is missing with code API_KEY_OWNER_NOT_FOUND', async () => {
    const rawKey = 'ez_sk_live_orphan'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), userId: 'ghost' })
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(null)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
      setTimeout(resolve, 50)
    })
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'API_KEY_OWNER_NOT_FOUND' }),
      })
    )
  })

  it('fires the lastUsedAt update + usage tracking call (best-effort)', async () => {
    const user = makeUser()
    const rawKey = 'ez_sk_live_track'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const apiKeyModel = buildApiKeyModel(apiKey)
    const usageModel = buildUsageModel()
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => apiKeyModel),
      getApiKeyUsageModel: vi.fn(async () => usageModel),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/some.path',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    // Microtask boundary so the fire-and-forget chain runs.
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(apiKeyModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: apiKey._id }),
      expect.objectContaining({ $set: { lastUsedAt: expect.any(Date) } })
    )
    expect(usageModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ apiKeyId: 'key-id-1', date: expect.any(String) }),
      expect.objectContaining({
        $inc: expect.objectContaining({ requestCount: 1 }),
      }),
      { upsert: true }
    )
  })

  it('caches monthly usage so subsequent requests skip the aggregate call', async () => {
    const user = makeUser()
    const rawKey = 'ez_sk_live_cache'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), quotaMonthly: 100 })
    const usageModel = buildUsageModel(50)
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
      getApiKeyUsageModel: vi.fn(async () => usageModel),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
      usageCacheTtlMs: 60_000, // re-enable cache for this test
    })
    const middleware = createAuthMiddleware(cfg)()

    async function callOnce() {
      const req = {
        headers: { 'x-api-key': rawKey },
        cookies: {},
        path: '/',
      } as never
      const res = makeRes()
      await new Promise<void>(resolve => {
        middleware(req, res as never, () => resolve())
      })
    }
    await callOnce()
    await callOnce()
    await callOnce()
    // First call hits aggregate; subsequent calls should be served from cache.
    expect(usageModel.aggregate).toHaveBeenCalledTimes(1)
  })
})

describe('createAuthMiddleware — combined behaviour', () => {
  it('JWT wins when BOTH JWT cookie and X-API-Key are present', async () => {
    const jwtUser = makeUser({ _id: 'jwt-user' })
    const rawKey = 'ez_sk_live_should_be_ignored'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), userId: 'apikey-user' })
    const apiKeyModel = buildApiKeyModel(apiKey)

    // The auth user model must answer for the JWT user.
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => apiKeyModel),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(jwtUser)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const token = signToken({ userId: 'jwt-user' })
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: { [COOKIE_NAME]: token },
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    expect(res.json).not.toHaveBeenCalled()
    expect((req as { userId?: string }).userId).toBe('jwt-user')
    // API key was never inspected because JWT succeeded first.
    expect(apiKeyModel.findOne).not.toHaveBeenCalled()
  })

  it('logs a warning when a legacy ezk_* key is presented', async () => {
    const user = makeUser()
    const rawKey = 'ezk_live_legacy_format_xyz'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), scope: 'admin' })
    const warn = vi.fn()
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
      logger: { warn, error: vi.fn() },
    })
    const middleware = createAuthMiddleware(cfg)({ requireKeyScope: 'admin' })
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('legacy ezk_* key detected'),
      expect.objectContaining({ keyPrefix: expect.stringContaining('ezk_live_') })
    )
  })

  it('allows readonly route to accept any key scope', async () => {
    const user = makeUser()
    const rawKey = 'ez_pk_live_readonly_ok'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), scope: 'readonly' })
    const cfg = buildConfig({
      getApiKeyModel: vi.fn(async () => buildApiKeyModel(apiKey)),
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)({ requireKeyScope: 'readonly' })
    const req = {
      headers: { 'x-api-key': rawKey },
      cookies: {},
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    expect(res.json).not.toHaveBeenCalled()
  })

  it('uses default cookieName "ez_access" when none is provided in config', async () => {
    const user = makeUser()
    const cfg = buildConfig({
      cookieName: undefined,
      getAuthUserModel: vi.fn(async () => buildAuthUserModel(user)),
    })
    const middleware = createAuthMiddleware(cfg)()
    const token = signToken({ userId: 'user-123' })
    const req = {
      headers: {},
      cookies: { ez_access: token },
      path: '/',
    } as never
    const res = makeRes()
    await new Promise<void>(resolve => {
      middleware(req, res as never, () => resolve())
    })
    expect(res.json).not.toHaveBeenCalled()
    expect((req as { userId?: string }).userId).toBe('user-123')
  })
})
