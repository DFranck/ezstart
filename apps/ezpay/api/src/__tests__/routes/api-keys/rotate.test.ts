/**
 * Tests for POST /api/keys/:id/rotate — rotate an EZPay API key.
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

const rotateRouteMod = await import('../../../routes/api-keys/rotate.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', rotateRouteMod.default)
  return app
}

async function rotate(
  app: Express,
  id: string
): Promise<{
  status: number
  body: { success: boolean; data?: Record<string, unknown> }
}> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') return reject(new Error('no address'))
      const port = address.port
      fetch(`http://127.0.0.1:${port}/keys/${id}/rotate`, { method: 'POST' })
        .then(async r => {
          const body = (await r.json()) as {
            success: boolean
            data?: Record<string, unknown>
          }
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

describe('POST /keys/:id/rotate — EZPay API key rotation', () => {
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

  it('revokes the old key and issues a new one with identical scope', async () => {
    const old = await ApiKey.create({
      key: 'old-hash',
      keyPrefix: 'ez_pk_live_old',
      name: 'rotate-me',
      userId: 'user-1',
      applicationId: 'app-xyz',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'admin',
      permissions: ['*'],
      status: 'active',
    })

    const res = await rotate(app, old._id.toString())
    expect(res.status).toBe(200)
    expect(res.body.data?.key).toMatch(/^ez_pk_live_/)
    expect(res.body.data?.applicationId).toBe('app-xyz')
    expect(res.body.data?.appSlug).toBe('acme')
    expect(res.body.data?.scope).toBe('admin')

    const refreshedOld = await ApiKey.findById(old._id)
    expect(refreshedOld?.status).toBe('revoked')
  })

  it('returns 404 when the key is not owned', async () => {
    const someoneElse = await ApiKey.create({
      key: 'x',
      keyPrefix: 'ez_pk_live_x',
      name: 'not-mine',
      userId: 'user-other',
      applicationId: 'app-1',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
    })
    const res = await rotate(app, someoneElse._id.toString())
    expect(res.status).toBe(404)
  })

  it('returns 400 when the key is already revoked', async () => {
    const doc = await ApiKey.create({
      key: 'y',
      keyPrefix: 'ez_pk_live_y',
      name: 'already-revoked',
      userId: 'user-1',
      applicationId: 'app-1',
      appSlug: 'acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'revoked',
      revokedAt: new Date(),
    })
    const res = await rotate(app, doc._id.toString())
    expect(res.status).toBe(400)
  })

  it('returns 401 when caller has no userId', async () => {
    currentUserId = undefined
    const res = await rotate(app, '507f1f77bcf86cd799439011')
    expect(res.status).toBe(401)
  })

  it('returns 404 for malformed ObjectId', async () => {
    const res = await rotate(app, 'not-a-valid-id')
    expect(res.status).toBe(404)
  })
})
