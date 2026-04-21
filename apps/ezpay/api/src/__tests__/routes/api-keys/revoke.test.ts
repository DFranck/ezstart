/**
 * Tests for DELETE /api/keys/:id — revoke an EZPay API key.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { getApiKeyModel, type ApiKeyDocument } from '../../../models/api-key.js'
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

const revokeRouteMod = await import('../../../routes/api-keys/revoke.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', revokeRouteMod.default)
  return app
}

async function del(
  app: Express,
  id: string
): Promise<{ status: number; body: { success: boolean; data?: unknown } }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') return reject(new Error('no address'))
      const port = address.port
      fetch(`http://127.0.0.1:${port}/keys/${id}`, { method: 'DELETE' })
        .then(async r => {
          const body = (await r.json()) as { success: boolean; data?: unknown }
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

async function seedKey(ApiKey: Model<ApiKeyDocument>, overrides: Partial<ApiKeyDocument> = {}) {
  return ApiKey.create({
    key: `hash-${Math.random()}`,
    keyPrefix: 'ez_pk_live_abc123',
    name: 'k',
    userId: 'user-1',
    applicationId: 'app-1',
    appSlug: 'acme',
    type: 'publishable',
    env: 'live',
    scope: 'user',
    permissions: ['*'],
    status: 'active',
    ...overrides,
  })
}

describe('DELETE /keys/:id — revoke EZPay API key', () => {
  let app: Express
  let ApiKey: Model<ApiKeyDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    ApiKey = await getApiKeyModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ApiKey.deleteMany({})
    currentUserId = 'user-1'
  })

  it('revokes an active key owned by the caller', async () => {
    const doc = await seedKey(ApiKey)
    const res = await del(app, doc._id.toString())
    expect(res.status).toBe(200)

    const refreshed = await ApiKey.findById(doc._id)
    expect(refreshed?.status).toBe('revoked')
    expect(refreshed?.revokedAt).toBeInstanceOf(Date)
  })

  it('returns 404 if the key is not owned by the caller', async () => {
    const doc = await seedKey(ApiKey, { userId: 'user-other' })
    const res = await del(app, doc._id.toString())
    expect(res.status).toBe(404)
  })

  it('returns 400 if the key is already revoked', async () => {
    const doc = await seedKey(ApiKey, { status: 'revoked', revokedAt: new Date() })
    const res = await del(app, doc._id.toString())
    expect(res.status).toBe(400)
  })

  it('returns 404 for malformed ObjectId', async () => {
    const res = await del(app, 'not-a-valid-id')
    expect(res.status).toBe(404)
  })

  it('returns 401 when caller has no userId', async () => {
    currentUserId = undefined
    const res = await del(app, '507f1f77bcf86cd799439011')
    expect(res.status).toBe(401)
  })
})
