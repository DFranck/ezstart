/**
 * Tests for POST /api/keys — create an EZPay API key with cross-service
 * Application validation against ezauth.
 *
 * Mocks the ezauth-client module so no real network call is made. Exercises
 * the route directly via a minimal Express app — no full stack needed.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { getApiKeyModel, type ApiKeyDocument } from '../../../models/api-key.js'
import type { Model } from 'mongoose'
import type { EzauthApplication } from '../../../services/ezauth-client.js'

// Mock ezauth-client BEFORE importing the route so the route binds the spy.
const getApplicationMock =
  vi.fn<(id: string, opts?: unknown) => Promise<EzauthApplication | null>>()

vi.mock('../../../services/ezauth-client.js', () => ({
  getApplication: getApplicationMock,
}))

// Mock auth middleware to skip JWT verification — inject userId manually.
let currentUserId: string | undefined = 'user-1'
let currentGlobalRoles: string[] = []

vi.mock('../../../middleware/auth.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.userId = currentUserId
    next()
  },
  populateUserFromToken: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => {
    if (req.userId) {
      ;(req as unknown as { user: Record<string, unknown> }).user = {
        userId: req.userId,
        globalRoles: currentGlobalRoles,
      }
    }
    next()
  },
  isAdminUser: (req: express.Request): boolean => {
    return (req.user?.globalRoles as string[] | undefined)?.includes('superadmin') ?? false
  },
}))

// Dynamic import AFTER mocks.
const createRouteMod = await import('../../../routes/api-keys/create.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', createRouteMod.default)
  return app
}

interface TestResponse {
  status: number
  body: {
    success: boolean
    data?: Record<string, unknown>
    error?: unknown
  }
}

async function postKeys(
  app: Express,
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const httpBody = JSON.stringify(body)
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      fetch(`http://127.0.0.1:${port}/keys`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer fake-jwt',
          ...headers,
        },
        body: httpBody,
      })
        .then(async r => {
          const body = (await r.json()) as TestResponse['body']
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

describe('POST /keys — EZPay create API key', () => {
  let app: Express
  let ApiKey: Model<ApiKeyDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    ApiKey = await getApiKeyModel()
    try {
      await ApiKey.collection.dropIndexes()
    } catch {
      // ignore
    }
    await ApiKey.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ApiKey.deleteMany({})
    getApplicationMock.mockReset()
    currentUserId = 'user-1'
    currentGlobalRoles = []
  })

  it('creates a key when the Application exists and is owned by the caller', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'acme',
      name: 'Acme',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const res = await postKeys(app, { name: 'Prod Key', applicationId: 'app-1' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data?.key).toMatch(/^ez_pk_live_/)
    expect(res.body.data?.applicationId).toBe('app-1')
    expect(res.body.data?.appSlug).toBe('acme')
    expect(res.body.data?.type).toBe('publishable')

    const stored = await ApiKey.findOne({ userId: 'user-1' })
    expect(stored?.applicationId).toBe('app-1')
    expect(stored?.appSlug).toBe('acme')
    expect(stored?.createdBy).toBe('user-1')
  })

  it('rejects when ezauth says Application is not found (400)', async () => {
    getApplicationMock.mockResolvedValue(null)

    const res = await postKeys(app, { name: 'x', applicationId: 'missing' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('rejects when Application is archived (400)', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-2',
      slug: 'old',
      name: 'Old',
      ownerId: 'user-1',
      status: 'archived',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const res = await postKeys(app, { name: 'x', applicationId: 'app-2' })
    expect(res.status).toBe(400)
  })

  it('rejects when caller is not the owner nor superadmin (403)', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-3',
      slug: 'other',
      name: 'Other',
      ownerId: 'user-other',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const res = await postKeys(app, { name: 'x', applicationId: 'app-3' })
    expect(res.status).toBe(403)
  })

  it('allows superadmin to create keys for any Application', async () => {
    currentGlobalRoles = ['superadmin']
    getApplicationMock.mockResolvedValue({
      id: 'app-4',
      slug: 'notmine',
      name: 'Not Mine',
      ownerId: 'user-other',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const res = await postKeys(app, { name: 'x', applicationId: 'app-4' })
    expect(res.status).toBe(200)
  })

  it('honours explicit type/env/scope overrides', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'acme',
      name: 'Acme',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const res = await postKeys(app, {
      name: 'Secret',
      applicationId: 'app-1',
      type: 'secret',
      env: 'test',
      scope: 'readonly',
    })

    expect(res.status).toBe(200)
    expect(res.body.data?.key).toMatch(/^ez_sk_test_/)
    expect(res.body.data?.type).toBe('secret')
    expect(res.body.data?.env).toBe('test')
    expect(res.body.data?.scope).toBe('readonly')
  })

  it('enforces the per-user active-key limit', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'acme',
      name: 'Acme',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    // Seed 25 active keys.
    for (let i = 0; i < 25; i++) {
      await ApiKey.create({
        key: `h${i}`,
        keyPrefix: `ez_pk_live_${i}`,
        name: `k${i}`,
        userId: 'user-1',
        applicationId: 'app-1',
        appSlug: 'acme',
        type: 'publishable',
        env: 'live',
        scope: 'user',
        permissions: ['*'],
        status: 'active',
      })
    }

    const res = await postKeys(app, { name: 'too-many', applicationId: 'app-1' })
    expect(res.status).toBe(400)
  })

  it('returns a validation error when body is missing name', async () => {
    const res = await postKeys(app, { applicationId: 'app-1' })
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })

  it('returns a validation error when body is missing applicationId', async () => {
    const res = await postKeys(app, { name: 'x' })
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 when caller has no userId (auth failed)', async () => {
    currentUserId = undefined
    const res = await postKeys(app, { name: 'x', applicationId: 'app-1' })
    expect(res.status).toBe(401)
  })
})
