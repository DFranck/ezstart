import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import { validateApiKey } from '../../middleware/api-key.js'
import { createUser, createApiKey, cleanAllCollections } from '../helpers/setup.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApiKeyUsageModel } from '../../models/api-key-usage.js'

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

    const res = await request(app)
      .get('/api-key-test')
      .set('X-API-Key', rawKey)

    expect(res.status).toBe(200)
    expect(res.body.data.apiKeyId).toBe(doc._id.toString())
    expect(res.body.data.apiKeyUserId).toBe(user._id!.toString())
  })

  it('should accept Authorization: ApiKey header', async () => {
    const user = await createUser({ email: 'apikey2@test.com', username: 'apikeytest2' })
    const { rawKey, doc } = await createApiKey(user._id!.toString())

    const res = await request(app)
      .get('/api-key-test')
      .set('Authorization', `ApiKey ${rawKey}`)

    expect(res.status).toBe(200)
    expect(res.body.data.apiKeyId).toBe(doc._id.toString())
  })

  it('should reject revoked API key', async () => {
    const user = await createUser({ email: 'revoked@test.com', username: 'revokedtest' })
    const { rawKey } = await createApiKey(user._id!.toString(), { status: 'revoked' })

    const res = await request(app)
      .get('/api-key-test')
      .set('X-API-Key', rawKey)

    expect(res.status).toBe(401)
    expect(res.body.error.message).toContain('revoked')
  })

  it('should reject expired API key', async () => {
    const user = await createUser({ email: 'expkey@test.com', username: 'expkeytest' })
    const { rawKey } = await createApiKey(user._id!.toString(), {
      expiresAt: new Date(Date.now() - 1000), // Already expired
    })

    const res = await request(app)
      .get('/api-key-test')
      .set('X-API-Key', rawKey)

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

    const res = await request(app)
      .get('/api-key-test')
      .set('X-API-Key', rawKey)

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

    const res = await request(app)
      .get('/api-key-test')
      .set('X-API-Key', rawKey)

    expect(res.status).toBe(200)
  })
})
