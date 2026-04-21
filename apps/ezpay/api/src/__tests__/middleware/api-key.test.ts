/**
 * Tests for the EZPay api-key middleware (validateApiKey).
 *
 * Exercises header parsing, hash lookup, revocation/expiry, quota
 * enforcement, and fire-and-forget usage tracking. Uses MongoMemoryServer
 * via `@ezstart/test-utils`, never a real DB.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Request, Response } from 'express'
import { getApiKeyModel, type ApiKeyDocument } from '../../models/api-key.js'
import { getApiKeyUsageModel, type ApiKeyUsageDocument } from '../../models/api-key-usage.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'
import { validateApiKey, _resetUsageCacheForTests } from '../../middleware/api-key.js'
import type { Model } from 'mongoose'

interface MockRes {
  statusCode: number
  body: unknown
  status(code: number): MockRes
  json(payload: unknown): MockRes
}

function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 0,
    body: null,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  return res
}

function createMockReq(headers: Record<string, string> = {}, path = '/api/test'): Request {
  return {
    headers,
    path,
  } as unknown as Request
}

/** Helper to persist a key and return raw + hash pair. */
async function seedKey(ApiKey: Model<ApiKeyDocument>, overrides: Partial<ApiKeyDocument> = {}) {
  const rawKey = generateRawApiKey({ type: 'publishable', env: 'live' })
  const hashedKey = hashApiKey(rawKey)
  const doc = await ApiKey.create({
    key: hashedKey,
    keyPrefix: extractKeyPrefix(rawKey),
    name: 'Test',
    userId: 'user-1',
    applicationId: 'app-1',
    appSlug: 'acme',
    type: 'publishable',
    env: 'live',
    scope: 'user',
    permissions: ['*'],
    status: 'active',
    quotaMonthly: 1000,
    ...overrides,
  })
  return { rawKey, hashedKey, doc }
}

describe('EZPay validateApiKey middleware', () => {
  let ApiKey: Model<ApiKeyDocument>
  let Usage: Model<ApiKeyUsageDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ApiKey = await getApiKeyModel()
    Usage = await getApiKeyUsageModel()
    try {
      await ApiKey.collection.dropIndexes()
      await Usage.collection.dropIndexes()
    } catch {
      // ignore
    }
    await ApiKey.createIndexes()
    await Usage.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Promise.all([ApiKey.deleteMany({}), Usage.deleteMany({})])
    _resetUsageCacheForTests()
  })

  describe('Header parsing', () => {
    it('rejects requests without a key', async () => {
      const req = createMockReq({})
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)
      expect(res.statusCode).toBe(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('accepts key from `x-api-key` header', async () => {
      const { rawKey } = await seedKey(ApiKey)
      const req = createMockReq({ 'x-api-key': rawKey })
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)
      expect(next).toHaveBeenCalledOnce()
      expect(req.apiKeyId).toBeDefined()
    })

    it('accepts key from `Authorization: ApiKey <key>` header', async () => {
      const { rawKey } = await seedKey(ApiKey)
      const req = createMockReq({ authorization: `ApiKey ${rawKey}` })
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)
      expect(next).toHaveBeenCalledOnce()
    })
  })

  describe('Key validation', () => {
    it('rejects unknown keys (401)', async () => {
      const req = createMockReq({ 'x-api-key': 'ez_pk_live_nonexistent' })
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)
      expect(res.statusCode).toBe(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('rejects revoked keys (401)', async () => {
      const { rawKey } = await seedKey(ApiKey, { status: 'revoked' })
      const req = createMockReq({ 'x-api-key': rawKey })
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)
      expect(res.statusCode).toBe(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('rejects expired keys (401)', async () => {
      const past = new Date(Date.now() - 1000)
      const { rawKey } = await seedKey(ApiKey, { expiresAt: past })
      const req = createMockReq({ 'x-api-key': rawKey })
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)
      expect(res.statusCode).toBe(401)
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('Quota enforcement', () => {
    it('returns 429 when quota is exhausted', async () => {
      const { rawKey, doc } = await seedKey(ApiKey, { quotaMonthly: 5 })
      const monthPrefix = new Date().toISOString().slice(0, 7)
      await Usage.create({
        apiKeyId: doc._id.toString(),
        userId: 'user-1',
        date: `${monthPrefix}-15`,
        requestCount: 5,
      })

      const req = createMockReq({ 'x-api-key': rawKey })
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)

      expect(res.statusCode).toBe(429)
      expect(next).not.toHaveBeenCalled()
    })

    it('allows requests when quota is null (unlimited)', async () => {
      const { rawKey } = await seedKey(ApiKey, { quotaMonthly: null })
      const req = createMockReq({ 'x-api-key': rawKey })
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)
      expect(next).toHaveBeenCalledOnce()
    })
  })

  describe('Request augmentation', () => {
    it('populates apiKey fields on the request', async () => {
      const { rawKey, doc } = await seedKey(ApiKey, {
        applicationId: 'app-xyz',
        appSlug: 'acme',
        scope: 'admin',
      })
      const req = createMockReq({ 'x-api-key': rawKey })
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)

      expect(req.apiKeyId).toBe(doc._id.toString())
      expect(req.apiKeyUserId).toBe('user-1')
      expect(req.apiKeyApplicationId).toBe('app-xyz')
      expect(req.apiKeyAppSlug).toBe('acme')
      expect(req.apiKeyScope).toBe('admin')
    })
  })

  describe('Fire-and-forget tracking', () => {
    it('increments usage bucket after a successful request', async () => {
      const { rawKey, doc } = await seedKey(ApiKey)
      const req = createMockReq({ 'x-api-key': rawKey }, '/api/payments')
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)

      // Allow the fire-and-forget promise chain to settle.
      await new Promise(resolve => setImmediate(resolve))

      const today = new Date().toISOString().slice(0, 10)
      const bucket = await Usage.findOne({
        apiKeyId: doc._id.toString(),
        date: today,
      })
      expect(bucket?.requestCount).toBe(1)
    })

    it('bumps lastUsedAt on the key', async () => {
      const { rawKey, doc } = await seedKey(ApiKey, { lastUsedAt: null })
      const req = createMockReq({ 'x-api-key': rawKey })
      const res = createMockRes()
      const next = vi.fn()
      await validateApiKey(req, res as unknown as Response, next)

      await new Promise(resolve => setImmediate(resolve))

      const refreshed = await ApiKey.findById(doc._id)
      expect(refreshed?.lastUsedAt).toBeInstanceOf(Date)
    })
  })
})
