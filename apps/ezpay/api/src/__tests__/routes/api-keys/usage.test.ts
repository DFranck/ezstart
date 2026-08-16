/**
 * Tests for GET /api/keys/:id/usage — per-key usage stats.
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

const usageRouteMod = await import('../../../routes/api-keys/usage.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', usageRouteMod.default)
  return app
}

interface UsageResponse {
  status: number
  body: {
    success: boolean
    data?: {
      currentMonth: { requestCount: number; topEndpoints: unknown[] }
      daily: unknown[]
      quota: { limit: number | null; used: number; remaining: number | null }
    }
  }
}

async function getUsage(app: Express, id: string): Promise<UsageResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') return reject(new Error('no address'))
      const port = address.port
      fetch(`http://127.0.0.1:${port}/keys/${id}/usage`)
        .then(async r => {
          const body = (await r.json()) as UsageResponse['body']
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

describe('GET /keys/:id/usage — EZPay key usage stats', () => {
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

  it('returns aggregated usage for an owned key', async () => {
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
      quotaMonthly: 1000,
    })

    const monthPrefix = new Date().toISOString().slice(0, 7)
    const endpoints = new Map<string, number>()
    endpoints.set('/payments', 3)

    await Usage.create({
      apiKeyId: doc._id.toString(),
      userId: 'user-1',
      date: `${monthPrefix}-15`,
      requestCount: 7,
      endpoints,
    })

    const res = await getUsage(app, doc._id.toString())
    expect(res.status).toBe(200)
    expect(res.body.data?.currentMonth.requestCount).toBe(7)
    expect(res.body.data?.quota.limit).toBe(1000)
    expect(res.body.data?.quota.used).toBe(7)
    expect(res.body.data?.quota.remaining).toBe(993)
    const ep = res.body.data?.currentMonth.topEndpoints as Array<{
      endpoint: string
      count: number
    }>
    expect(ep.find(e => e.endpoint === '/payments')?.count).toBe(3)
  })

  it('returns 404 if the key is not owned', async () => {
    const doc = await ApiKey.create({
      key: 'h2',
      keyPrefix: 'ez_pk_live_b',
      name: 'k',
      userId: 'user-other',
      applicationId: 'app-1',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
    })

    const res = await getUsage(app, doc._id.toString())
    expect(res.status).toBe(404)
  })

  it('handles keys with null quota', async () => {
    const doc = await ApiKey.create({
      key: 'h3',
      keyPrefix: 'ez_pk_live_c',
      name: 'k',
      userId: 'user-1',
      applicationId: 'app-1',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
      quotaMonthly: null,
    })

    const res = await getUsage(app, doc._id.toString())
    expect(res.status).toBe(200)
    expect(res.body.data?.quota.limit).toBeNull()
    expect(res.body.data?.quota.remaining).toBeNull()
  })

  it('returns 401 when caller has no userId', async () => {
    currentUserId = undefined
    const res = await getUsage(app, '507f1f77bcf86cd799439011')
    expect(res.status).toBe(401)
  })

  it('returns 404 for malformed ObjectId', async () => {
    const res = await getUsage(app, 'not-a-valid-id')
    expect(res.status).toBe(404)
  })
})
