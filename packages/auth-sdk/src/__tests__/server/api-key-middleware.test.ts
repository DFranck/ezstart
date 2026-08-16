/**
 * Tests for `createApiKeyMiddleware` — drop-in API-key-only authentication
 * middleware factory shipped from `@ezstart/auth-sdk/server`.
 *
 * The factory replaces ~200 LOC of duplication between the ezauth and ezpay
 * `validateApiKey` middlewares. We exercise it with plain mock request /
 * response objects to keep the test layer independent of Express runtime
 * quirks (no supertest needed) and stub the Mongoose model surface so the
 * SDK never depends on `mongoose` at test time.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createApiKeyMiddleware,
  type ApiKeyMiddlewareConfig,
  type ApiKeyModelLike,
  type ApiKeyShape,
  type ApiKeyUsageModelLike,
} from '../../server/api-key-middleware.js'
import { hashApiKey } from '../../core/api-keys-crypto.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

interface TestApiKey extends ApiKeyShape {
  _id: { toString(): string }
  key: string
  userId: string
  status: string
  scope?: string | null
  appName?: string | null
  applicationId?: string
  appSlug?: string
  expiresAt?: Date | null
  quotaMonthly?: number | null
}

function makeApiKey(overrides: Partial<TestApiKey> = {}): TestApiKey {
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

function buildKeyModel(key: TestApiKey | null): ApiKeyModelLike<TestApiKey> {
  return {
    findOne: vi.fn(() => ({ lean: vi.fn(async () => key) })),
    updateOne: vi.fn(async () => ({ acknowledged: true })),
  }
}

function buildUsageModel(monthlyTotal = 0): ApiKeyUsageModelLike {
  return {
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

function buildConfig(
  overrides: Partial<ApiKeyMiddlewareConfig<TestApiKey>> = {}
): ApiKeyMiddlewareConfig<TestApiKey> {
  return {
    getKeyModel: vi.fn(async () => buildKeyModel(null)),
    getUsageModel: vi.fn(async () => buildUsageModel()),
    populateRequest: () => {},
    cacheTtlMs: 0, // disable cache by default to keep tests deterministic
    ...overrides,
  }
}

/** Helper that runs the middleware and waits for the async chain to settle. */
async function runMiddleware(
  middleware: (req: never, res: never, next: () => void) => void,
  req: unknown,
  res: MockRes
): Promise<{ nextCalled: boolean }> {
  let nextCalled = false
  await new Promise<void>(resolve => {
    middleware(req as never, res as never, () => {
      nextCalled = true
      resolve()
    })
    // give the async path a tick to call sendError if next() never fires
    setTimeout(resolve, 50)
  })
  return { nextCalled }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createApiKeyMiddleware — header parsing', () => {
  let req: { headers: Record<string, string>; path: string }
  let res: MockRes

  beforeEach(() => {
    req = { headers: {}, path: '/' }
    res = makeRes()
  })

  it('returns 401 when no API key is present in headers', async () => {
    const middleware = createApiKeyMiddleware(buildConfig())
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(false)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'API key required' }),
      })
    )
  })

  it('accepts the X-API-Key header', async () => {
    const rawKey = 'ez_pk_live_abcdef0123456789'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const populateRequest = vi.fn()
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        populateRequest,
      })
    )
    req.headers['x-api-key'] = rawKey
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(true)
    expect(populateRequest).toHaveBeenCalledOnce()
  })

  it('accepts the Authorization: ApiKey <key> header', async () => {
    const rawKey = 'ez_pk_live_abcdef0123456789'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
      })
    )
    req.headers.authorization = `ApiKey ${rawKey}`
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(true)
  })

  it('ignores Authorization: Bearer <token> (this middleware is API-key only)', async () => {
    const middleware = createApiKeyMiddleware(buildConfig())
    req.headers.authorization = 'Bearer some-jwt-token'
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(false)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})

describe('createApiKeyMiddleware — key validation', () => {
  let res: MockRes
  beforeEach(() => {
    res = makeRes()
  })

  it('returns 401 when the hashed key is not found in the DB', async () => {
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(null)),
      })
    )
    const req = { headers: { 'x-api-key': 'ez_pk_live_unknown' }, path: '/' }
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(false)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Invalid API key' }),
      })
    )
  })

  it('returns 401 when the key has been revoked', async () => {
    const rawKey = 'ez_pk_live_revoked_test_key'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), status: 'revoked' })
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(false)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'API key has been revoked' }),
      })
    )
  })

  it('returns 401 when the key has expired', async () => {
    const rawKey = 'ez_pk_live_expired_test_key'
    const past = new Date(Date.now() - 86_400_000) // yesterday
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), expiresAt: past })
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(false)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'API key has expired' }),
      })
    )
  })

  it('accepts a key with a future expiresAt', async () => {
    const rawKey = 'ez_pk_live_future_test_key'
    const future = new Date(Date.now() + 86_400_000) // tomorrow
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), expiresAt: future })
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(true)
  })
})

describe('createApiKeyMiddleware — quota enforcement', () => {
  let res: MockRes
  beforeEach(() => {
    res = makeRes()
  })

  it('returns 429 with QUOTA_EXCEEDED code when the monthly quota is reached', async () => {
    const rawKey = 'ez_pk_live_quota_test_key'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), quotaMonthly: 100 })
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        getUsageModel: vi.fn(async () => buildUsageModel(100)),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(false)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'QUOTA_EXCEEDED',
          details: { quota: 100, used: 100 },
        }),
      })
    )
  })

  it('allows requests when usage is below the monthly quota', async () => {
    const rawKey = 'ez_pk_live_under_quota_key'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), quotaMonthly: 100 })
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        getUsageModel: vi.fn(async () => buildUsageModel(42)),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(true)
  })

  it('skips quota check entirely when quotaMonthly is null (unlimited)', async () => {
    const rawKey = 'ez_pk_live_unlimited_key'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), quotaMonthly: null })
    const usageModel = buildUsageModel()
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        getUsageModel: vi.fn(async () => usageModel),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(true)
    // aggregate is only called for the monthly count; with quota:null we
    // skip that path entirely (only the fire-and-forget usage updateOne
    // runs, which doesn't trigger aggregate).
    expect(usageModel.aggregate).not.toHaveBeenCalled()
  })
})

describe('createApiKeyMiddleware — request population', () => {
  it('calls populateRequest with the loaded key after validation passes', async () => {
    const rawKey = 'ez_pk_live_populate_key'
    const apiKey = makeApiKey({
      key: hashApiKey(rawKey),
      applicationId: 'app-xyz',
      appSlug: 'acme',
      scope: 'admin',
    })
    const populateRequest = vi.fn((req: { fooBar?: string }, key: TestApiKey) => {
      // Consumer attaches whatever fields they want.
      req.fooBar = key._id.toString()
    })
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        populateRequest: populateRequest as ApiKeyMiddlewareConfig<TestApiKey>['populateRequest'],
      })
    )
    const req = {
      headers: { 'x-api-key': rawKey },
      path: '/',
      fooBar: undefined as undefined | string,
    }
    const res = makeRes()
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(true)
    expect(populateRequest).toHaveBeenCalledOnce()
    expect(populateRequest).toHaveBeenCalledWith(req, apiKey)
    expect(req.fooBar).toBe('key-id-1')
  })

  it('handles a string _id as well as an object _id with toString', async () => {
    const rawKey = 'ez_pk_live_string_id_key'
    const apiKey = makeApiKey({
      _id: 'string-id-foo' as unknown as { toString(): string },
      key: hashApiKey(rawKey),
    })
    const populateRequest = vi.fn()
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        populateRequest,
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const res = makeRes()
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(true)
    expect(populateRequest).toHaveBeenCalledWith(req, apiKey)
  })
})

describe('createApiKeyMiddleware — fire-and-forget bookkeeping', () => {
  it('bumps lastUsedAt on the key after a successful request', async () => {
    const rawKey = 'ez_pk_live_bookkeeping_key'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const keyModel = buildKeyModel(apiKey)
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => keyModel),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/api/test' }
    const res = makeRes()
    await runMiddleware(middleware, req, res)
    // Allow the fire-and-forget chain to settle.
    await new Promise(resolve => setImmediate(resolve))
    expect(keyModel.updateOne).toHaveBeenCalledWith(
      { _id: apiKey._id },
      expect.objectContaining({ $set: expect.objectContaining({ lastUsedAt: expect.any(Date) }) })
    )
  })

  it('increments the daily usage bucket after a successful request', async () => {
    const rawKey = 'ez_pk_live_usage_track_key'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const usageModel = buildUsageModel()
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        getUsageModel: vi.fn(async () => usageModel),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/api/donations' }
    const res = makeRes()
    await runMiddleware(middleware, req, res)
    await new Promise(resolve => setImmediate(resolve))
    expect(usageModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ apiKeyId: 'key-id-1' }),
      expect.objectContaining({
        $inc: expect.objectContaining({ requestCount: 1 }),
      }),
      expect.objectContaining({ upsert: true })
    )
  })

  it('sanitises path characters that would break the $inc dotted key', async () => {
    const rawKey = 'ez_pk_live_path_sanitise'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const usageModel = buildUsageModel()
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        getUsageModel: vi.fn(async () => usageModel),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/api/v1.test/$donation' }
    const res = makeRes()
    await runMiddleware(middleware, req, res)
    await new Promise(resolve => setImmediate(resolve))
    const updateCall = usageModel.updateOne.mock.calls[0]
    const inc = (updateCall?.[1] as { $inc: Record<string, unknown> }).$inc
    const endpointKey = Object.keys(inc).find(k => k.startsWith('endpoints.'))
    expect(endpointKey).toBeDefined()
    // Strip the `endpoints.` prefix before asserting the sanitised path —
    // the prefix itself legitimately contains a dot.
    const pathPart = endpointKey?.slice('endpoints.'.length) ?? ''
    expect(pathPart).not.toContain('.') // dots in path replaced
    expect(pathPart).not.toContain('$') // $ in path replaced
  })

  it('does not block the request when fire-and-forget tracking fails', async () => {
    const rawKey = 'ez_pk_live_tracking_fail'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => ({
          findOne: vi.fn(() => ({ lean: vi.fn(async () => apiKey) })),
          updateOne: vi.fn(async () => {
            throw new Error('lastUsedAt update fail')
          }),
        })),
        getUsageModel: vi.fn(async () => ({
          updateOne: vi.fn(async () => {
            throw new Error('usage update fail')
          }),
          aggregate: vi.fn(async () => []),
        })),
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const res = makeRes()
    const result = await runMiddleware(middleware, req, res)
    // Tracking failure must not abort the request.
    expect(result.nextCalled).toBe(true)
    await new Promise(resolve => setImmediate(resolve))
  })
})

describe('createApiKeyMiddleware — cache + reset', () => {
  it('caches monthly usage when cacheTtlMs > 0 (only one aggregate call)', async () => {
    const rawKey = 'ez_pk_live_cache_test'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), quotaMonthly: 100 })
    const usageModel = buildUsageModel(50)
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        getUsageModel: vi.fn(async () => usageModel),
        cacheTtlMs: 60_000, // 1 minute
      })
    )
    for (let i = 0; i < 3; i++) {
      const req = { headers: { 'x-api-key': rawKey }, path: '/' }
      const res = makeRes()
      await runMiddleware(middleware, req, res)
    }
    // Expect aggregate (the quota lookup) called once on the first request,
    // then served from cache for the next two.
    expect(usageModel.aggregate).toHaveBeenCalledTimes(1)
  })

  it('reset() clears the cached monthly usage so subsequent aggregates re-run', async () => {
    const rawKey = 'ez_pk_live_reset_test'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), quotaMonthly: 100 })
    const usageModel = buildUsageModel(50)
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        getUsageModel: vi.fn(async () => usageModel),
        cacheTtlMs: 60_000,
      })
    )
    const req1 = { headers: { 'x-api-key': rawKey }, path: '/' }
    const res1 = makeRes()
    await runMiddleware(middleware, req1, res1)

    middleware.reset()

    const req2 = { headers: { 'x-api-key': rawKey }, path: '/' }
    const res2 = makeRes()
    await runMiddleware(middleware, req2, res2)
    expect(usageModel.aggregate).toHaveBeenCalledTimes(2)
  })

  it('disables caching when cacheTtlMs is 0 (every quota check hits the DB)', async () => {
    const rawKey = 'ez_pk_live_no_cache_test'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey), quotaMonthly: 100 })
    const usageModel = buildUsageModel(50)
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        getUsageModel: vi.fn(async () => usageModel),
        cacheTtlMs: 0,
      })
    )
    for (let i = 0; i < 3; i++) {
      const req = { headers: { 'x-api-key': rawKey }, path: '/' }
      const res = makeRes()
      await runMiddleware(middleware, req, res)
    }
    expect(usageModel.aggregate).toHaveBeenCalledTimes(3)
  })
})

describe('createApiKeyMiddleware — legacy ezk_* warning', () => {
  it('logs a warning when a legacy ezk_* key is used (still accepted)', async () => {
    const rawKey = 'ezk_live_legacy_key_format'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const warn = vi.fn()
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        logger: { warn, error: vi.fn() },
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const res = makeRes()
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(true)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Legacy ezk_*'),
      expect.objectContaining({ keyPrefix: expect.any(String) })
    )
  })

  it('does NOT log the legacy warning for modern ez_pk_/ez_sk_ keys', async () => {
    const rawKey = 'ez_pk_live_modern_key'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const warn = vi.fn()
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        logger: { warn, error: vi.fn() },
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const res = makeRes()
    await runMiddleware(middleware, req, res)
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Legacy ezk_*'),
      expect.anything()
    )
  })
})

describe('createApiKeyMiddleware — error handling', () => {
  it('returns 500 when the key model getter throws', async () => {
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => {
          throw new Error('DB unreachable')
        }),
        logger: { warn: vi.fn(), error: vi.fn() },
      })
    )
    const req = { headers: { 'x-api-key': 'ez_pk_live_anything' }, path: '/' }
    const res = makeRes()
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(false)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'API key authentication failed' }),
      })
    )
  })

  it('returns 500 when populateRequest throws (consumer bug)', async () => {
    const rawKey = 'ez_pk_live_populator_throws'
    const apiKey = makeApiKey({ key: hashApiKey(rawKey) })
    const middleware = createApiKeyMiddleware(
      buildConfig({
        getKeyModel: vi.fn(async () => buildKeyModel(apiKey)),
        populateRequest: () => {
          throw new Error('consumer bug')
        },
        logger: { warn: vi.fn(), error: vi.fn() },
      })
    )
    const req = { headers: { 'x-api-key': rawKey }, path: '/' }
    const res = makeRes()
    const result = await runMiddleware(middleware, req, res)
    expect(result.nextCalled).toBe(false)
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
