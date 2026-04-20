import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import { validateApiKey } from '../../middleware/api-key.js'
import { createUser, createApiKey, cleanAllCollections } from '../helpers/setup.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApiKeyUsageModel } from '../../models/api-key-usage.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'

function createApiKeyTestApp() {
  const app = express()
  app.use(express.json())

  app.get('/api-key-test', validateApiKey, (req, res) => {
    res.json({
      success: true,
      data: { apiKeyId: req.apiKeyId, apiKeyUserId: req.apiKeyUserId },
    })
  })

  return app
}

describe('API Key Middleware', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApiKeyTestApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  it('should reject request with no API key', async () => {
    const res = await request(app).get('/api-key-test')

    expect(res.status).toBe(401)
    expect(res.body.error.message).toContain('API key required')
  })

  it('should reject invalid API key', async () => {
    const res = await request(app)
      .get('/api-key-test')
      .set('X-API-Key', 'ezk_invalid_key_that_does_not_exist')

    expect(res.status).toBe(401)
    expect(res.body.error.message).toContain('Invalid API key')
  })

  it('should accept valid X-API-Key header', async () => {
    const user = await createUser({ email: 'apikey@test.com', username: 'apikeytest' })
    const { rawKey, doc } = await createApiKey(user._id!.toString())

    const res = await request(app).get('/api-key-test').set('X-API-Key', rawKey)

    expect(res.status).toBe(200)
    expect(res.body.data.apiKeyId).toBe(doc._id.toString())
    expect(res.body.data.apiKeyUserId).toBe(user._id!.toString())
  })

  it('should accept Authorization: ApiKey header', async () => {
    const user = await createUser({ email: 'apikey2@test.com', username: 'apikeytest2' })
    const { rawKey, doc } = await createApiKey(user._id!.toString())

    const res = await request(app).get('/api-key-test').set('Authorization', `ApiKey ${rawKey}`)

    expect(res.status).toBe(200)
    expect(res.body.data.apiKeyId).toBe(doc._id.toString())
  })

  it('should reject revoked API key', async () => {
    const user = await createUser({ email: 'revoked@test.com', username: 'revokedtest' })
    const { rawKey } = await createApiKey(user._id!.toString(), { status: 'revoked' })

    const res = await request(app).get('/api-key-test').set('X-API-Key', rawKey)

    expect(res.status).toBe(401)
    expect(res.body.error.message).toContain('revoked')
  })

  it('should reject expired API key', async () => {
    const user = await createUser({ email: 'expkey@test.com', username: 'expkeytest' })
    const { rawKey } = await createApiKey(user._id!.toString(), {
      expiresAt: new Date(Date.now() - 1000), // Already expired
    })

    const res = await request(app).get('/api-key-test').set('X-API-Key', rawKey)

    expect(res.status).toBe(401)
    expect(res.body.error.message).toContain('expired')
  })

  it('should enforce monthly quota', async () => {
    const user = await createUser({ email: 'quota@test.com', username: 'quotatest' })
    const { rawKey, doc } = await createApiKey(user._id!.toString(), {
      quotaMonthly: 5,
    })

    // Seed usage up to the limit
    const ApiKeyUsage = await getApiKeyUsageModel()
    const today = new Date().toISOString().slice(0, 10)
    await ApiKeyUsage.create({
      apiKeyId: doc._id.toString(),
      userId: user._id!.toString(),
      date: today,
      requestCount: 5,
      endpoints: new Map(),
    })

    const res = await request(app).get('/api-key-test').set('X-API-Key', rawKey)

    expect(res.status).toBe(429)
    expect(res.body.error.message).toContain('quota exceeded')
  })

  it('should allow requests when under quota', async () => {
    const user = await createUser({ email: 'underquota@test.com', username: 'underquotatest' })
    const { rawKey, doc } = await createApiKey(user._id!.toString(), {
      quotaMonthly: 100,
    })

    // Seed some usage, but under limit
    const ApiKeyUsage = await getApiKeyUsageModel()
    const today = new Date().toISOString().slice(0, 10)
    await ApiKeyUsage.create({
      apiKeyId: doc._id.toString(),
      userId: user._id!.toString(),
      date: today,
      requestCount: 50,
      endpoints: new Map(),
    })

    const res = await request(app).get('/api-key-test').set('X-API-Key', rawKey)

    expect(res.status).toBe(200)
  })

  describe('Prefix format acceptance', () => {
    it('should accept modern publishable live key (ez_pk_live_*)', async () => {
      const user = await createUser({ email: 'pklive@test.com', username: 'pkliveuser' })
      const { rawKey, doc } = await createApiKey(user._id!.toString(), {
        type: 'publishable',
        env: 'live',
        scope: 'user',
      })

      expect(rawKey.startsWith('ez_pk_live_')).toBe(true)

      const res = await request(app).get('/api-key-test').set('X-API-Key', rawKey)

      expect(res.status).toBe(200)
      expect(res.body.data.apiKeyId).toBe(doc._id.toString())
    })

    it('should accept modern secret live key (ez_sk_live_*)', async () => {
      const user = await createUser({ email: 'sklive@test.com', username: 'skliveuser' })
      const { rawKey, doc } = await createApiKey(user._id!.toString(), {
        type: 'secret',
        env: 'live',
        scope: 'admin',
      })

      expect(rawKey.startsWith('ez_sk_live_')).toBe(true)

      const res = await request(app).get('/api-key-test').set('X-API-Key', rawKey)

      expect(res.status).toBe(200)
      expect(res.body.data.apiKeyId).toBe(doc._id.toString())
    })

    it('should accept modern publishable test key (ez_pk_test_*)', async () => {
      const user = await createUser({ email: 'pktest@test.com', username: 'pktestuser' })
      const { rawKey } = await createApiKey(user._id!.toString(), {
        type: 'publishable',
        env: 'test',
        scope: 'user',
      })

      expect(rawKey.startsWith('ez_pk_test_')).toBe(true)

      const res = await request(app).get('/api-key-test').set('X-API-Key', rawKey)

      expect(res.status).toBe(200)
    })

    it('should accept legacy ezk_live_* key (backwards compat)', async () => {
      // Seed a legacy-format key directly in DB (simulating a pre-refactor key).
      const user = await createUser({ email: 'legacy@test.com', username: 'legacyuser' })
      const ApiKey = await getApiKeyModel()
      const legacyRawKey = `ezk_live_${'a'.repeat(64)}`
      const hashed = hashApiKey(legacyRawKey)
      const prefix = extractKeyPrefix(legacyRawKey)

      await ApiKey.create({
        key: hashed,
        keyPrefix: prefix,
        name: 'Legacy key',
        userId: user._id!.toString(),
        appName: '*',
        scope: 'live',
        permissions: ['*'],
        status: 'active',
        quotaMonthly: 1000,
      })

      const res = await request(app).get('/api-key-test').set('X-API-Key', legacyRawKey)

      expect(res.status).toBe(200)
    })

    it('should reject a key with unknown/invalid format', async () => {
      const res = await request(app)
        .get('/api-key-test')
        .set('X-API-Key', 'invalid_format_xxxxxxxxxxxxxxxx')

      expect(res.status).toBe(401)
    })

    it('generateRawApiKey produces the expected prefixes', () => {
      expect(generateRawApiKey({ type: 'publishable', env: 'live' })).toMatch(
        /^ez_pk_live_[a-f0-9]{64}$/
      )
      expect(generateRawApiKey({ type: 'publishable', env: 'test' })).toMatch(
        /^ez_pk_test_[a-f0-9]{64}$/
      )
      expect(generateRawApiKey({ type: 'secret', env: 'live' })).toMatch(
        /^ez_sk_live_[a-f0-9]{64}$/
      )
      expect(generateRawApiKey({ type: 'secret', env: 'test' })).toMatch(
        /^ez_sk_test_[a-f0-9]{64}$/
      )
    })
  })
})
