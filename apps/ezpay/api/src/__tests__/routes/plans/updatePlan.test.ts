/**
 * Tests for PATCH /plans/:id — owner-scoped Plan update with conditional
 * Stripe re-price.
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

const repriceMock = vi.fn<(plan: PlanDocument, prev: unknown) => Promise<string>>()

vi.mock('../../../services/stripe-plan-sync.js', () => ({
  repriceStripePlan: repriceMock,
  // unused by updatePlan but imported transitively in some TS setups
  syncPlanToStripe: vi.fn(),
  archivePlanInStripe: vi.fn(),
}))

const productUpdateMock = vi.fn()

vi.mock('../../../services/stripe-connect.js', () => ({
  getStripeInstanceForMode: () => ({
    products: { update: productUpdateMock },
    prices: { update: vi.fn(), create: vi.fn() },
  }),
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

const updateRouteMod = await import('../../../routes/plans/updatePlan.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', updateRouteMod.default)
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

async function patchPlan(
  app: Express,
  id: string,
  body: Record<string, unknown>
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
      fetch(`http://127.0.0.1:${port}/plans/${id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer fake-jwt',
        },
        body: httpBody,
      })
        .then(async r => {
          const resBody = (await r.json()) as TestResponse['body']
          server.close()
          resolve({ status: r.status, body: resBody })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

describe('PATCH /plans/:id — update', () => {
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
    repriceMock.mockReset()
    productUpdateMock.mockReset()
    currentUserId = 'user-1'
    currentGlobalRoles = []
  })

  async function seedPlan(): Promise<PlanDocument> {
    return Plan.create({
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
  }

  function okApp() {
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'ezbill',
      name: 'EZBill',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })
  }

  it('reprices on amount change and persists new stripePriceId', async () => {
    const plan = await seedPlan()
    okApp()
    repriceMock.mockResolvedValue('price_new')

    const res = await patchPlan(app, String(plan._id), { amount: 4900 })

    expect(res.status).toBe(200)
    expect(repriceMock).toHaveBeenCalledOnce()
    const stored = await Plan.findById(plan._id)
    expect(stored?.amount).toBe(4900)
    expect(stored?.stripePriceId).toBe('price_new')
    expect(productUpdateMock).not.toHaveBeenCalled()
  })

  it('updates product name/description via Stripe when only meta changes', async () => {
    const plan = await seedPlan()
    okApp()
    productUpdateMock.mockResolvedValue({ id: 'prod_1' })

    const res = await patchPlan(app, String(plan._id), {
      name: 'Pro Plus',
      description: 'Updated',
    })

    expect(res.status).toBe(200)
    expect(repriceMock).not.toHaveBeenCalled()
    expect(productUpdateMock).toHaveBeenCalledWith('prod_1', {
      name: 'Pro Plus',
      description: 'Updated',
    })

    const stored = await Plan.findById(plan._id)
    expect(stored?.name).toBe('Pro Plus')
    expect(stored?.description).toBe('Updated')
  })

  it('returns 403 when caller is not owner', async () => {
    const plan = await seedPlan()
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'ezbill',
      name: 'EZBill',
      ownerId: 'user-other',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const res = await patchPlan(app, String(plan._id), { amount: 4900 })
    expect(res.status).toBe(403)
    expect(repriceMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the plan does not exist', async () => {
    okApp()
    // Use a valid ObjectId-shaped id so mongoose doesn't throw a cast error.
    const res = await patchPlan(app, '507f1f77bcf86cd799439011', { amount: 4900 })
    expect(res.status).toBe(404)
  })

  it('returns 502 when reprice fails and leaves the row unchanged', async () => {
    const plan = await seedPlan()
    okApp()
    repriceMock.mockRejectedValue(new Error('stripe down'))

    const res = await patchPlan(app, String(plan._id), { amount: 4900 })
    expect(res.status).toBe(502)

    const stored = await Plan.findById(plan._id)
    // We didn't persist after the reprice error.
    expect(stored?.amount).toBe(999)
    expect(stored?.stripePriceId).toBe('price_1')
  })

  it('returns 401 without userId', async () => {
    currentUserId = undefined
    const res = await patchPlan(app, '507f1f77bcf86cd799439011', { amount: 4900 })
    expect(res.status).toBe(401)
  })

  it('updates trialDays and persists metadata.billingGroup without a reprice', async () => {
    const plan = await seedPlan()
    okApp()

    const res = await patchPlan(app, String(plan._id), {
      trialDays: 30,
      metadata: {
        billingGroup: 'ezauth-pro',
      },
    })

    expect(res.status).toBe(200)
    expect(repriceMock).not.toHaveBeenCalled()

    const stored = await Plan.findById(plan._id)
    expect(stored?.trialDays).toBe(30)
    expect(stored?.metadata?.billingGroup).toBe('ezauth-pro')
  })

  it('clears trialDays when null is sent', async () => {
    const plan = await seedPlan()
    plan.trialDays = 14
    await plan.save()
    okApp()

    const res = await patchPlan(app, String(plan._id), { trialDays: null })

    expect(res.status).toBe(200)
    const stored = await Plan.findById(plan._id)
    expect(stored?.trialDays).toBeUndefined()
  })

  it('rejects trialDays outside the 0-90 range', async () => {
    const plan = await seedPlan()
    okApp()

    const res = await patchPlan(app, String(plan._id), { trialDays: 100 })
    expect([400, 422]).toContain(res.status)

    const stored = await Plan.findById(plan._id)
    expect(stored?.trialDays).toBeUndefined()
  })
})
