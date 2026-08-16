/**
 * Tests for GET /api/keys — list the current user's EZPay API keys.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { getApiKeyModel, type ApiKeyDocument } from '../../../models/api-key.js'
import { getApiKeyUsageModel, type ApiKeyUsageDocument } from '../../../models/api-key-usage.js'
import type { Model } from 'mongoose'

let currentUserId: string | undefined = 'user-1'

vi.mock('../../../middleware/auth.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.userId = currentUserId
    next()
  },
  populateUserFromToken: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => {
    next()
  },
  isAdminUser: () => false,
}))

const listRouteMod = await import('../../../routes/api-keys/list.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', listRouteMod.default)
  return app
}

async function getKeys(
  app: Express,
  query = ''
): Promise<{ status: number; body: { success: boolean; data?: unknown[] } }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') return reject(new Error('no address'))
      const port = address.port
      fetch(`http://127.0.0.1:${port}/keys${query}`)
        .then(async r => {
          const body = (await r.json()) as { success: boolean; data?: unknown[] }
          server.close()
          resolve({ status: r.status, body })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

describe('GET /keys — list EZPay API keys', () => {
  let app: Express
  let ApiKey: Model<ApiKeyDocument>
  let Usage: Model<ApiKeyUsageDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    ApiKey = await getApiKeyModel()
    Usage = await getApiKeyUsageModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Promise.all([ApiKey.deleteMany({}), Usage.deleteMany({})])
    currentUserId = 'user-1'
  })

  it('returns only the caller own keys', async () => {
    await ApiKey.create({
      key: 'h1',
      keyPrefix: 'ez_pk_live_a',
      name: 'mine',
      userId: 'user-1',
      applicationId: 'app-1',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
    })
    await ApiKey.create({
      key: 'h2',
      keyPrefix: 'ez_pk_live_b',
      name: 'somebody else',
      userId: 'user-2',
      applicationId: 'app-1',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
    })

    const res = await getKeys(app)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    const first = res.body.data?.[0] as Record<string, unknown>
    expect(first?.name).toBe('mine')
  })

  it('never exposes the hashed key field', async () => {
    await ApiKey.create({
      key: 'secret-hash',
      keyPrefix: 'ez_pk_live_a',
      name: 'k',
      userId: 'user-1',
      applicationId: 'app-1',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
    })

    const res = await getKeys(app)
    const first = res.body.data?.[0] as Record<string, unknown>
    expect(first?.key).toBeUndefined()
  })

  it('filters by applicationId when query is present', async () => {
    await ApiKey.create({
      key: 'h1',
      keyPrefix: 'ez_pk_live_a',
      name: 'a',
      userId: 'user-1',
      applicationId: 'app-1',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
    })
    await ApiKey.create({
      key: 'h2',
      keyPrefix: 'ez_pk_live_b',
      name: 'b',
      userId: 'user-1',
      applicationId: 'app-2',
      appSlug: 'other',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
    })

    const res = await getKeys(app, '?applicationId=app-1')
    expect(res.body.data).toHaveLength(1)
    const first = res.body.data?.[0] as Record<string, unknown>
    expect(first?.applicationId).toBe('app-1')
  })

  it('includes usageThisMonth aggregated from ApiKeyUsage', async () => {
    const doc = await ApiKey.create({
      key: 'h1',
      keyPrefix: 'ez_pk_live_a',
      name: 'k',
      userId: 'user-1',
      applicationId: 'app-1',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
    })

    const monthPrefix = new Date().toISOString().slice(0, 7)
    await Usage.create({
      apiKeyId: doc._id.toString(),
      userId: 'user-1',
      date: `${monthPrefix}-15`,
      requestCount: 42,
    })

    const res = await getKeys(app)
    const first = res.body.data?.[0] as Record<string, unknown>
    expect(first?.usageThisMonth).toBe(42)
  })

  it('returns 401 when caller has no userId', async () => {
    currentUserId = undefined
    const res = await getKeys(app)
    expect(res.status).toBe(401)
  })
})
