/**
 * Tests for DELETE /plans/:id — owner-scoped soft delete + Stripe archive.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { getPlanModel, type PlanDocument } from '../../../models/Plan.js'
import type { Model } from 'mongoose'
import type { EzauthApplication } from '../../../services/ezauth-client.js'

const getApplicationMock =
  vi.fn<(id: string, opts?: unknown) => Promise<EzauthApplication | null>>()

vi.mock('../../../services/ezauth-client.js', () => ({
  getApplication: getApplicationMock,
}))

const archiveMock = vi.fn<(plan: PlanDocument) => Promise<void>>()

vi.mock('../../../services/stripe-plan-sync.js', () => ({
  archivePlanInStripe: archiveMock,
  syncPlanToStripe: vi.fn(),
  repriceStripePlan: vi.fn(),
}))

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
  isAdminUser: (req: express.Request): boolean =>
    (req.user?.globalRoles as string[] | undefined)?.includes('superadmin') ?? false,
}))

const deleteRouteMod = await import('../../../routes/plans/deletePlan.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', deleteRouteMod.default)
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

async function deletePlanRequest(app: Express, id: string): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      fetch(`http://127.0.0.1:${port}/plans/${id}`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer fake-jwt',
        },
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

describe('DELETE /plans/:id — soft delete + Stripe archive', () => {
  let app: Express
  let Plan: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    Plan = await getPlanModel()
    try {
      await Plan.collection.dropIndexes()
    } catch {
      // ignore
    }
    await Plan.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Plan.deleteMany({})
    getApplicationMock.mockReset()
    archiveMock.mockReset()
    currentUserId = 'user-1'
    currentGlobalRoles = []
  })

  it('soft-deletes the plan and calls archivePlanInStripe', async () => {
    const plan = await Plan.create({
      name: 'Pro',
      applicationId: 'app-1',
      appName: 'ezbill',
      amount: 999,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      stripeProductId: 'prod_1',
      stripePriceId: 'price_1',
    })

    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'ezbill',
      name: 'EZBill',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })
    archiveMock.mockResolvedValue()

    const res = await deletePlanRequest(app, String(plan._id))

    expect(res.status).toBe(200)
    expect(archiveMock).toHaveBeenCalledOnce()

    const stored = await Plan.findById(plan._id)
    expect(stored?.active).toBe(false)
    expect(stored?.deletedAt).toBeInstanceOf(Date)
  })

  it('returns 403 when caller is not owner', async () => {
    const plan = await Plan.create({
      name: 'Pro',
      applicationId: 'app-1',
      amount: 999,
      interval: 'month',
      intervalCount: 1,
    })

    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'ezbill',
      name: 'EZBill',
      ownerId: 'user-other',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const res = await deletePlanRequest(app, String(plan._id))
    expect(res.status).toBe(403)
    expect(archiveMock).not.toHaveBeenCalled()

    const stored = await Plan.findById(plan._id)
    expect(stored?.active).toBe(true)
    expect(stored?.deletedAt).toBeNull()
  })

  it('returns 404 for an unknown plan id', async () => {
    const res = await deletePlanRequest(app, '507f1f77bcf86cd799439011')
    expect(res.status).toBe(404)
    expect(archiveMock).not.toHaveBeenCalled()
  })

  it('returns 401 without userId', async () => {
    currentUserId = undefined
    const res = await deletePlanRequest(app, '507f1f77bcf86cd799439011')
    expect(res.status).toBe(401)
  })
})
