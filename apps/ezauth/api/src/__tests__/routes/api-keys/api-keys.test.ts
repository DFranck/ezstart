import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { verifyTokenMiddleware } from '../../../middleware/auth.js'
import { sendSuccess, sendError, sendValidationError } from '@ezstart/api-core'
import { getApiKeyModel } from '../../../models/api-key.js'
import { getApiKeyUsageModel } from '../../../models/api-key-usage.js'
import { getAuthUserModel } from '../../../models/auth-user.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../../utils/api-key.js'
import type { ApiKeyType, ApiKeyEnv } from '../../../utils/api-key.js'
import type { ApiKeyScope } from '../../../models/api-key.js'
import {
  createUser,
  createAdminUser,
  createApiKey,
  generateAccessToken,
  cleanAllCollections,
} from '../../helpers/setup.js'

const MAX_KEYS_PER_USER = 25

/**
 * Build a minimal Express app that mirrors the API key route handlers
 * without rate limiting.
 */
/**
 * Middleware bridge: verifyTokenMiddleware sets req.user but not req.userId.
 * The actual routes use req.userId! which is normally set by api-core's
 * createAuthMiddleware. This bridges the gap for tests.
 */
function bridgeUserId(req: express.Request, _res: express.Response, next: express.NextFunction) {
  if (req.user?._id && !req.userId) {
    req.userId = req.user._id
  }
  next()
}

function createApiKeysTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())

  // POST /keys — create
  app.post('/keys', verifyTokenMiddleware, bridgeUserId, async (req, res) => {
    const userId = req.userId!
    const { name, appName, expiresAt, type: rawType, env: rawEnv, scope: rawScope } = req.body || {}
    if (!name) return sendValidationError(res, 'name is required', [])

    const type: ApiKeyType = rawType || 'publishable'
    const env: ApiKeyEnv = rawEnv || 'live'
    const scope: ApiKeyScope = rawScope || 'user'
    const effectiveAppName: string = appName || '*'

    // Cross-app keys require superadmin
    if (effectiveAppName === '*') {
      const AuthUser = await getAuthUserModel()
      const user = await AuthUser.findById(userId).lean()
      const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false
      if (!isSuperadmin) {
        return sendError(res, 'Platform-wide keys (appName="*") require superadmin', 403)
      }
    }

    const ApiKey = await getApiKeyModel()
    const activeCount = await ApiKey.countDocuments({ userId, status: 'active' })
    if (activeCount >= MAX_KEYS_PER_USER) {
      return sendError(res, `Maximum ${MAX_KEYS_PER_USER} active API keys allowed`, 400)
    }

    const rawKey = generateRawApiKey({ type, env })
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = extractKeyPrefix(rawKey)

    const apiKey = await ApiKey.create({
      key: hashedKey,
      keyPrefix,
      name,
      userId,
      appName: effectiveAppName,
      type,
      env,
      scope,
      permissions: ['*'],
      status: 'active',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })

    sendSuccess(res, {
      id: apiKey._id.toString(),
      key: rawKey,
      keyPrefix,
      name: apiKey.name,
      type,
      env,
      scope,
    })
  })

  // GET /keys — list
  app.get('/keys', verifyTokenMiddleware, bridgeUserId, async (req, res) => {
    const userId = req.userId!
    const ApiKey = await getApiKeyModel()
    const keys = await ApiKey.find({ userId }).select('-key').sort({ createdAt: -1 }).lean()

    const data = keys.map(k => ({
      id: k._id.toString(),
      keyPrefix: k.keyPrefix,
      name: k.name,
      appName: k.appName,
      status: k.status,
      createdAt: k.createdAt.toISOString(),
    }))

    sendSuccess(res, data)
  })

  // DELETE /keys/:id — revoke
  app.delete('/keys/:id', verifyTokenMiddleware, bridgeUserId, async (req, res) => {
    const userId = req.userId!
    const ApiKey = await getApiKeyModel()
    const apiKey = await ApiKey.findOne({ _id: req.params.id, userId })

    if (!apiKey) return sendError(res, 'API key not found', 404)
    if (apiKey.status === 'revoked') return sendError(res, 'API key is already revoked', 400)

    apiKey.status = 'revoked'
    apiKey.revokedAt = new Date()
    await apiKey.save()

    sendSuccess(res, { message: 'API key revoked' })
  })

  // POST /keys/:id/rotate — rotate
  app.post('/keys/:id/rotate', verifyTokenMiddleware, bridgeUserId, async (req, res) => {
    const userId = req.userId!
    const ApiKey = await getApiKeyModel()
    const oldKey = await ApiKey.findOne({ _id: req.params.id, userId })

    if (!oldKey) return sendError(res, 'API key not found', 404)
    if (oldKey.status === 'revoked') return sendError(res, 'Cannot rotate a revoked API key', 400)

    // Revoke old
    oldKey.status = 'revoked'
    oldKey.revokedAt = new Date()
    await oldKey.save()

    // Create new (preserve type/env/scope)
    const type: ApiKeyType = oldKey.type ?? 'publishable'
    const env: ApiKeyEnv = oldKey.env ?? 'live'
    const scope: ApiKeyScope = oldKey.scope ?? 'user'
    const rawKey = generateRawApiKey({ type, env })
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = extractKeyPrefix(rawKey)

    const newKey = await ApiKey.create({
      key: hashedKey,
      keyPrefix,
      name: oldKey.name,
      userId,
      appName: oldKey.appName,
      type,
      env,
      scope,
      permissions: oldKey.permissions,
      status: 'active',
      expiresAt: oldKey.expiresAt,
    })

    sendSuccess(res, {
      id: newKey._id.toString(),
      key: rawKey,
      keyPrefix,
      name: newKey.name,
      type,
      env,
      scope,
    })
  })

  // GET /keys/:id/usage — usage stats
  app.get('/keys/:id/usage', verifyTokenMiddleware, bridgeUserId, async (req, res) => {
    const userId = req.userId!
    const ApiKey = await getApiKeyModel()
    const apiKey = await ApiKey.findOne({ _id: req.params.id, userId }).lean()

    if (!apiKey) return sendError(res, 'API key not found', 404)

    const ApiKeyUsage = await getApiKeyUsageModel()
    const monthPrefix = new Date().toISOString().slice(0, 7)

    const monthlyAgg = await ApiKeyUsage.aggregate([
      { $match: { apiKeyId: req.params.id, date: { $regex: `^${monthPrefix}` } } },
      { $group: { _id: null, totalRequests: { $sum: '$requestCount' } } },
    ])

    const totalRequests = monthlyAgg[0]?.totalRequests ?? 0
    const quota = apiKey.quotaMonthly
    const remaining = quota != null ? Math.max(0, quota - totalRequests) : null

    sendSuccess(res, {
      currentMonth: { requestCount: totalRequests },
      quota: { limit: quota ?? null, used: totalRequests, remaining },
    })
  })

  return app
}

describe('API Keys Routes', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApiKeysTestApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
  })

  describe('POST /keys — create', () => {
    it('should create a new API key (default publishable/live)', async () => {
      const user = await createUser({ email: 'keys@test.com', username: 'keysuser' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Test Key', appName: 'myapp' })

      expect(res.status).toBe(200)
      expect(res.body.data.key).toMatch(/^ez_pk_live_/)
      expect(res.body.data.keyPrefix).toBeTruthy()
      expect(res.body.data.name).toBe('My Test Key')
      expect(res.body.data.type).toBe('publishable')
      expect(res.body.data.env).toBe('live')
      expect(res.body.data.scope).toBe('user')
      expect(res.body.data.id).toBeTruthy()
    })

    it('should create a publishable test key (ez_pk_test_*)', async () => {
      const user = await createUser({ email: 'pktestcreate@test.com', username: 'pktestcreate' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Key', appName: 'myapp', type: 'publishable', env: 'test' })

      expect(res.status).toBe(200)
      expect(res.body.data.key).toMatch(/^ez_pk_test_/)
    })

    it('should create a secret live key for superadmin with platform scope', async () => {
      const admin = await createAdminUser({ email: 'sk-admin@test.com', username: 'skadmin' })
      const token = generateAccessToken(admin)

      const res = await request(app)
        .post('/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Platform Secret',
          appName: '*',
          type: 'secret',
          env: 'live',
          scope: 'admin',
        })

      expect(res.status).toBe(200)
      expect(res.body.data.key).toMatch(/^ez_sk_live_/)
      expect(res.body.data.type).toBe('secret')
      expect(res.body.data.scope).toBe('admin')
    })

    it('should reject platform-wide (appName="*") key creation for non-superadmin', async () => {
      const user = await createUser({ email: 'platform@test.com', username: 'platformuser' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Platform Key', appName: '*', type: 'secret', env: 'live', scope: 'admin' })

      expect(res.status).toBe(403)
      expect(res.body.error.message).toContain('superadmin')
    })

    it('should reject without auth', async () => {
      const res = await request(app).post('/keys').send({ name: 'Key' })
      expect(res.status).toBe(401)
    })

    it('should reject without name', async () => {
      const user = await createUser({ email: 'noname@test.com', username: 'nonameuser' })
      const token = generateAccessToken(user)

      const res = await request(app).post('/keys').set('Authorization', `Bearer ${token}`).send({})

      expect(res.status).toBe(422)
    })

    it('should enforce per-user key limit', async () => {
      const user = await createUser({ email: 'limit@test.com', username: 'limituser' })
      const token = generateAccessToken(user)

      // Create MAX_KEYS_PER_USER keys
      for (let i = 0; i < MAX_KEYS_PER_USER; i++) {
        await createApiKey(user._id!.toString(), { name: `Key ${i}` })
      }

      const res = await request(app)
        .post('/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'One More Key', appName: 'myapp' })

      expect(res.status).toBe(400)
      expect(res.body.error.message).toContain('Maximum')
    })
  })

  describe('GET /keys — list', () => {
    it('should list all keys for authenticated user', async () => {
      const user = await createUser({ email: 'list@test.com', username: 'listuser' })
      const token = generateAccessToken(user)

      await createApiKey(user._id!.toString(), { name: 'Key 1' })
      await createApiKey(user._id!.toString(), { name: 'Key 2' })

      const res = await request(app).get('/keys').set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })

    it('should not show keys from other users', async () => {
      const user1 = await createUser({ email: 'u1@test.com', username: 'u1' })
      const user2 = await createUser({ email: 'u2@test.com', username: 'u2' })
      const token = generateAccessToken(user1)

      await createApiKey(user1._id!.toString(), { name: 'My Key' })
      await createApiKey(user2._id!.toString(), { name: 'Their Key' })

      const res = await request(app).get('/keys').set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].name).toBe('My Key')
    })

    it('should not expose the hashed key', async () => {
      const user = await createUser({ email: 'nohash@test.com', username: 'nohashuser' })
      const token = generateAccessToken(user)

      await createApiKey(user._id!.toString())

      const res = await request(app).get('/keys').set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data[0]).not.toHaveProperty('key')
    })
  })

  describe('DELETE /keys/:id — revoke', () => {
    it('should revoke an active key', async () => {
      const user = await createUser({ email: 'revoke@test.com', username: 'revokeuser' })
      const token = generateAccessToken(user)
      const { doc } = await createApiKey(user._id!.toString())

      const res = await request(app)
        .delete(`/keys/${doc._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('API key revoked')

      // Verify in DB
      const ApiKey = await getApiKeyModel()
      const updated = await ApiKey.findById(doc._id)
      expect(updated?.status).toBe('revoked')
    })

    it('should reject revoking an already-revoked key', async () => {
      const user = await createUser({ email: 'dblrevoke@test.com', username: 'dblrevokeuser' })
      const token = generateAccessToken(user)
      const { doc } = await createApiKey(user._id!.toString(), { status: 'revoked' })

      const res = await request(app)
        .delete(`/keys/${doc._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(400)
    })

    it("should return 404 for another user's key", async () => {
      const user1 = await createUser({ email: 'owner@test.com', username: 'owner' })
      const user2 = await createUser({ email: 'thief@test.com', username: 'thief' })
      const token2 = generateAccessToken(user2)
      const { doc } = await createApiKey(user1._id!.toString())

      const res = await request(app)
        .delete(`/keys/${doc._id.toString()}`)
        .set('Authorization', `Bearer ${token2}`)

      expect(res.status).toBe(404)
    })
  })

  describe('POST /keys/:id/rotate — rotate', () => {
    it('should rotate an active key (revoke old + create new)', async () => {
      const user = await createUser({ email: 'rotate@test.com', username: 'rotateuser' })
      const token = generateAccessToken(user)
      const { doc: oldDoc } = await createApiKey(user._id!.toString(), {
        name: 'Original',
        type: 'publishable',
        env: 'live',
        scope: 'user',
      })

      const res = await request(app)
        .post(`/keys/${oldDoc._id.toString()}/rotate`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.key).toMatch(/^ez_pk_live_/)
      expect(res.body.data.id).not.toBe(oldDoc._id.toString()) // New ID
      expect(res.body.data.name).toBe('Original') // Same name

      // Old key should be revoked
      const ApiKey = await getApiKeyModel()
      const oldKey = await ApiKey.findById(oldDoc._id)
      expect(oldKey?.status).toBe('revoked')
    })

    it('should reject rotating a revoked key', async () => {
      const user = await createUser({ email: 'norotate@test.com', username: 'norotateuser' })
      const token = generateAccessToken(user)
      const { doc } = await createApiKey(user._id!.toString(), { status: 'revoked' })

      const res = await request(app)
        .post(`/keys/${doc._id.toString()}/rotate`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(400)
    })
  })

  describe('Type/env/scope — modern format + rotate preservation', () => {
    it('should allow superadmin to create a platform secret admin key', async () => {
      const admin = await createAdminUser({ email: 'scopeadmin@test.com', username: 'scopeadmin' })
      const token = generateAccessToken(admin)

      const res = await request(app)
        .post('/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Admin Key', appName: '*', type: 'secret', env: 'live', scope: 'admin' })

      expect(res.status).toBe(200)
      expect(res.body.data.key).toMatch(/^ez_sk_live_/)
      expect(res.body.data.scope).toBe('admin')
    })

    it('should reject platform-wide secret key creation for non-superadmin', async () => {
      const user = await createUser({ email: 'scopeuser@test.com', username: 'scopeuser' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .post('/keys')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Admin Key', appName: '*', type: 'secret', env: 'live', scope: 'admin' })

      expect(res.status).toBe(403)
      expect(res.body.error.message).toContain('superadmin')
    })

    it('should preserve type/env/scope after rotate', async () => {
      const user = await createUser({ email: 'scoperotate@test.com', username: 'scoperotate' })
      const token = generateAccessToken(user)

      // Create a publishable/test/user key directly in DB
      const { doc: testKeyDoc } = await createApiKey(user._id!.toString(), {
        name: 'Test Env Key',
        type: 'publishable',
        env: 'test',
        scope: 'user',
        appName: 'myapp',
      })

      // Rotate
      const res = await request(app)
        .post(`/keys/${testKeyDoc._id.toString()}/rotate`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.key).toMatch(/^ez_pk_test_/) // New key keeps publishable/test prefix
      expect(res.body.data.type).toBe('publishable')
      expect(res.body.data.env).toBe('test')
      expect(res.body.data.scope).toBe('user')

      // Verify in DB
      const ApiKey = await getApiKeyModel()
      const newKeyDoc = await ApiKey.findById(res.body.data.id)
      expect(newKeyDoc?.type).toBe('publishable')
      expect(newKeyDoc?.env).toBe('test')
      expect(newKeyDoc?.scope).toBe('user')
    })
  })

  describe('GET /keys/:id/usage — usage stats', () => {
    it('should return usage stats for a key', async () => {
      const user = await createUser({ email: 'usage@test.com', username: 'usageuser' })
      const token = generateAccessToken(user)
      const { doc } = await createApiKey(user._id!.toString(), { quotaMonthly: 1000 })

      // Seed some usage
      const ApiKeyUsage = await getApiKeyUsageModel()
      const today = new Date().toISOString().slice(0, 10)
      await ApiKeyUsage.create({
        apiKeyId: doc._id.toString(),
        userId: user._id!.toString(),
        date: today,
        requestCount: 42,
        endpoints: new Map([
          ['/api/auth/me', 30],
          ['/api/auth/verify', 12],
        ]),
      })

      const res = await request(app)
        .get(`/keys/${doc._id.toString()}/usage`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.currentMonth.requestCount).toBe(42)
      expect(res.body.data.quota.limit).toBe(1000)
      expect(res.body.data.quota.used).toBe(42)
      expect(res.body.data.quota.remaining).toBe(958)
    })

    it('should return 404 for non-existent key', async () => {
      const user = await createUser({ email: 'nokey@test.com', username: 'nokeyuser' })
      const token = generateAccessToken(user)

      const res = await request(app)
        .get('/keys/507f1f77bcf86cd799439011/usage')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(404)
    })

    it('should return zero usage for new key', async () => {
      const user = await createUser({ email: 'zerousage@test.com', username: 'zerousageuser' })
      const token = generateAccessToken(user)
      const { doc } = await createApiKey(user._id!.toString())

      const res = await request(app)
        .get(`/keys/${doc._id.toString()}/usage`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.data.currentMonth.requestCount).toBe(0)
      expect(res.body.data.quota.used).toBe(0)
    })
  })
})
