/**
 * Tests for POST /plans — owner-scoped Plan creation with Stripe sync.
 *
 * Mocks `ezauth-client.getApplication` and `stripe-plan-sync.syncPlanToStripe`
 * so no real network call is made. Exercises the route via a minimal Express
 * app (no full stack).
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

const syncPlanToStripeMock =
  vi.fn<(plan: PlanDocument) => Promise<{ stripeProductId: string; stripePriceId: string }>>()

vi.mock('../../../services/stripe-plan-sync.js', () => ({
  syncPlanToStripe: syncPlanToStripeMock,
}))

// Mock auth middleware — inject userId / roles manually.
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

const createRouteMod = await import('../../../routes/plans/createPlan.js')

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

async function postPlans(app: Express, body: Record<string, unknown>): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const httpBody = JSON.stringify(body)
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      fetch(`http://127.0.0.1:${port}/plans`, {
        method: 'POST',
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

describe('POST /plans — create', () => {
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
    syncPlanToStripeMock.mockReset()
    currentUserId = 'user-1'
    currentGlobalRoles = []
  })

  it('creates a Plan when the caller owns the Application and Stripe sync succeeds', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'ezbill',
      name: 'EZBill',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })
    syncPlanToStripeMock.mockResolvedValue({
      stripeProductId: 'prod_1',
      stripePriceId: 'price_1',
    })

    const res = await postPlans(app, {
      name: 'Pro',
      applicationId: 'app-1',
      amount: 999,
      interval: 'month',
    })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    const created = res.body.data as { plan: Record<string, unknown> }
    expect(created.plan.name).toBe('Pro')
    expect(created.plan.applicationId).toBe('app-1')
    expect(created.plan.appName).toBe('ezbill')
    expect(created.plan.stripeProductId).toBe('prod_1')
    expect(created.plan.stripePriceId).toBe('price_1')

    const stored = await Plan.findOne({ applicationId: 'app-1' })
    expect(stored?.stripePriceId).toBe('price_1')
    expect(syncPlanToStripeMock).toHaveBeenCalledOnce()
  })

  it('returns 422 when applicationId is missing', async () => {
    const res = await postPlans(app, {
      name: 'No app',
      amount: 999,
      interval: 'month',
    })
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
    expect(getApplicationMock).not.toHaveBeenCalled()
  })

  it('returns 404 when ezauth says Application does not exist', async () => {
    getApplicationMock.mockResolvedValue(null)

    const res = await postPlans(app, {
      name: 'Ghost',
      applicationId: 'missing',
      amount: 999,
      interval: 'month',
    })

    expect(res.status).toBe(404)
    expect(syncPlanToStripeMock).not.toHaveBeenCalled()
  })

  it('returns 403 when caller is not the owner and not superadmin', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-2',
      slug: 'other',
      name: 'Other',
      ownerId: 'user-other',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const res = await postPlans(app, {
      name: 'Not mine',
      applicationId: 'app-2',
      amount: 999,
      interval: 'month',
    })

    expect(res.status).toBe(403)
    expect(syncPlanToStripeMock).not.toHaveBeenCalled()
  })

  it('allows superadmin to create a Plan for any Application', async () => {
    currentGlobalRoles = ['superadmin']
    getApplicationMock.mockResolvedValue({
      id: 'app-3',
      slug: 'notmine',
      name: 'Not Mine',
      ownerId: 'user-other',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })
    syncPlanToStripeMock.mockResolvedValue({
      stripeProductId: 'prod_x',
      stripePriceId: 'price_x',
    })

    const res = await postPlans(app, {
      name: 'Admin-created',
      applicationId: 'app-3',
      amount: 0,
      interval: 'month',
    })

    expect(res.status).toBe(201)
  })

  it('rolls back the Plan when Stripe sync fails and returns 502', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'ezbill',
      name: 'EZBill',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })
    syncPlanToStripeMock.mockRejectedValue(new Error('stripe down'))

    const res = await postPlans(app, {
      name: 'Fail',
      applicationId: 'app-1',
      amount: 999,
      interval: 'month',
    })

    expect(res.status).toBe(502)
    const stored = await Plan.findOne({ applicationId: 'app-1', name: 'Fail' })
    expect(stored).toBeNull()
  })

  it('returns 401 when caller has no userId', async () => {
    currentUserId = undefined
    const res = await postPlans(app, {
      name: 'Pro',
      applicationId: 'app-1',
      amount: 999,
      interval: 'month',
    })
    expect(res.status).toBe(401)
  })

  it('persists trialDays, billingGroup and discountVsMonthly when provided', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'ezauth',
      name: 'EZAuth',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })
    syncPlanToStripeMock.mockResolvedValue({
      stripeProductId: 'prod_y',
      stripePriceId: 'price_y',
    })

    const res = await postPlans(app, {
      name: 'Pro Yearly',
      applicationId: 'app-1',
      amount: 9900,
      interval: 'year',
      trialDays: 14,
      metadata: {
        billingGroup: 'ezauth-pro',
        discountVsMonthly: 20,
      },
    })

    expect(res.status).toBe(201)
    const stored = await Plan.findOne({ applicationId: 'app-1', name: 'Pro Yearly' })
    expect(stored?.trialDays).toBe(14)
    expect(stored?.metadata?.billingGroup).toBe('ezauth-pro')
    expect(stored?.metadata?.discountVsMonthly).toBe(20)
  })

  it('rejects trialDays outside the 0-90 range', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'ezbill',
      name: 'EZBill',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const tooMany = await postPlans(app, {
      name: 'Bad trial',
      applicationId: 'app-1',
      amount: 100,
      interval: 'month',
      trialDays: 91,
    })
    expect([400, 422]).toContain(tooMany.status)

    const negative = await postPlans(app, {
      name: 'Neg trial',
      applicationId: 'app-1',
      amount: 100,
      interval: 'month',
      trialDays: -1,
    })
    expect([400, 422]).toContain(negative.status)

    expect(syncPlanToStripeMock).not.toHaveBeenCalled()
  })

  it('rejects archived Applications with 400', async () => {
    getApplicationMock.mockResolvedValue({
      id: 'app-1',
      slug: 'archived',
      name: 'Archived',
      ownerId: 'user-1',
      status: 'archived',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
    })

    const res = await postPlans(app, {
      name: 'Pro',
      applicationId: 'app-1',
      amount: 999,
      interval: 'month',
    })

    expect(res.status).toBe(400)
  })
})
