/**
 * Tests for POST /subscriptions/:subscriptionId/change-plan (P9-E).
 *
 * Exercises the owner gate, plan validation and Stripe interaction via
 * mocks. The handler is mounted on a minimal Express app so only the
 * subscription-change surface is under test.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import type { Model, Types } from 'mongoose'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'
import { getPlanModel, type PlanDocument } from '../../../models/Plan.js'

const subscriptionsRetrieveMock = vi.fn()
const subscriptionsUpdateMock = vi.fn()

vi.mock('../../../services/stripe-connect.js', () => ({
  getStripeInstance: () => ({
    subscriptions: {
      retrieve: subscriptionsRetrieveMock,
      update: subscriptionsUpdateMock,
    },
  }),
}))

let currentUserId: string | undefined = 'user-1'
let currentGlobalRoles: string[] = []
let currentAppRoles: Record<string, string[]> = {}

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
        appRoles: currentAppRoles,
      }
    }
    next()
  },
  isAdminUser: (req: express.Request): boolean => {
    const user = req.user as { globalRoles?: string[]; appRoles?: Record<string, string[]> }
    if (user?.globalRoles?.some(r => r === 'superadmin' || r === 'admin')) return true
    return Object.values(user?.appRoles ?? {}).some(roles => roles.includes('admin'))
  },
}))

// Tenant-ownership resolution forwards to ezauth's owner-scoped app list.
let ownedSlugs: string[] = []
vi.mock('../../../services/ezauth-client.js', () => ({
  listApplicationsByOwner: () => Promise.resolve(ownedSlugs.map(slug => ({ slug }))),
}))

const routeMod = await import('../../../routes/subscriptions/change-plan.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', routeMod.default)
  return app
}

interface TestResponse {
  status: number
  body: {
    success?: boolean
    data?: Record<string, unknown>
    error?: unknown
  }
}

async function postChangePlan(
  app: Express,
  subscriptionId: string,
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
      fetch(`http://127.0.0.1:${port}/subscriptions/${subscriptionId}/change-plan`, {
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

describe('POST /subscriptions/:subscriptionId/change-plan', () => {
  let app: Express
  let Payment: Model<PaymentDocument>
  let Plan: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    Payment = await getPaymentModel()
    Plan = await getPlanModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Payment.deleteMany({})
    await Plan.deleteMany({})
    subscriptionsRetrieveMock.mockReset()
    subscriptionsUpdateMock.mockReset()
    currentUserId = 'user-1'
    currentGlobalRoles = []
    currentAppRoles = {}
    ownedSlugs = []
  })

  async function seedSubscriptionAndPlans(): Promise<{
    subscriptionId: string
    newPlanId: Types.ObjectId
    newPriceId: string
  }> {
    await Payment.create({
      projectId: 'ezauth',
      projectName: 'EZAuth',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user-1',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_sub_1',
      status: 'completed',
      liveMode: false,
      metadata: {
        subscriptionId: 'sub_123',
        planId: 'plan-old',
        planName: 'Pro Monthly',
      },
    })

    const newPlan = await Plan.create({
      name: 'Pro Yearly',
      applicationId: 'app-ezauth',
      appName: 'ezauth',
      amount: 9999,
      currency: 'EUR',
      interval: 'year',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_new',
      stripePriceId: 'price_new',
    })

    return {
      subscriptionId: 'sub_123',
      newPlanId: newPlan._id as Types.ObjectId,
      newPriceId: 'price_new',
    }
  }

  it('changes the plan and reflects the update in the Payment metadata', async () => {
    const { subscriptionId, newPlanId, newPriceId } = await seedSubscriptionAndPlans()
    subscriptionsRetrieveMock.mockResolvedValue({
      id: subscriptionId,
      items: { data: [{ id: 'si_1' }] },
    })
    subscriptionsUpdateMock.mockResolvedValue({
      id: subscriptionId,
      status: 'active',
      items: { data: [{ id: 'si_1', current_period_end: 2000000000 }] },
    })

    const res = await postChangePlan(app, subscriptionId, {
      newPlanId: String(newPlanId),
      prorationBehavior: 'always_invoice',
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const data = res.body.data as Record<string, unknown>
    expect(data.subscriptionId).toBe(subscriptionId)
    expect(data.newPlanId).toBe(String(newPlanId))
    expect(data.newStripePriceId).toBe(newPriceId)

    expect(subscriptionsUpdateMock).toHaveBeenCalledWith(subscriptionId, {
      items: [{ id: 'si_1', price: newPriceId }],
      proration_behavior: 'always_invoice',
    })

    const payment = await Payment.findOne({ 'metadata.subscriptionId': subscriptionId })
    expect(payment?.metadata?.planId).toBe(String(newPlanId))
    expect(payment?.metadata?.planName).toBe('Pro Yearly')
  })

  it('defaults to create_prorations when prorationBehavior is omitted', async () => {
    const { subscriptionId, newPlanId } = await seedSubscriptionAndPlans()
    subscriptionsRetrieveMock.mockResolvedValue({
      id: subscriptionId,
      items: { data: [{ id: 'si_1' }] },
    })
    subscriptionsUpdateMock.mockResolvedValue({
      id: subscriptionId,
      status: 'active',
      items: { data: [{ id: 'si_1', current_period_end: 1999999999 }] },
    })

    const res = await postChangePlan(app, subscriptionId, { newPlanId: String(newPlanId) })
    expect(res.status).toBe(200)
    expect(subscriptionsUpdateMock).toHaveBeenCalledWith(subscriptionId, {
      items: [{ id: 'si_1', price: 'price_new' }],
      proration_behavior: 'create_prorations',
    })
  })

  it('returns 401 when caller is not authenticated', async () => {
    currentUserId = undefined
    const res = await postChangePlan(app, 'sub_123', { newPlanId: 'whatever' })
    expect(res.status).toBe(401)
    expect(subscriptionsUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the subscription is not found locally', async () => {
    const plan = await Plan.create({
      name: 'Pro Yearly',
      applicationId: 'app-1',
      appName: 'ezauth',
      amount: 9999,
      currency: 'EUR',
      interval: 'year',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_new',
      stripePriceId: 'price_new',
    })

    const res = await postChangePlan(app, 'sub_missing', {
      newPlanId: String(plan._id),
    })
    expect(res.status).toBe(404)
  })

  it('returns 403 when a non-admin tries to change someone else’s subscription', async () => {
    const { subscriptionId, newPlanId } = await seedSubscriptionAndPlans()
    currentUserId = 'attacker'

    const res = await postChangePlan(app, subscriptionId, { newPlanId: String(newPlanId) })
    expect(res.status).toBe(403)
    expect(subscriptionsUpdateMock).not.toHaveBeenCalled()
  })

  it('allows a superadmin to change another user’s subscription', async () => {
    const { subscriptionId, newPlanId } = await seedSubscriptionAndPlans()
    currentUserId = 'admin'
    currentGlobalRoles = ['superadmin']
    subscriptionsRetrieveMock.mockResolvedValue({
      id: subscriptionId,
      items: { data: [{ id: 'si_1' }] },
    })
    subscriptionsUpdateMock.mockResolvedValue({
      id: subscriptionId,
      status: 'active',
      items: { data: [{ id: 'si_1', current_period_end: 1999999999 }] },
    })

    const res = await postChangePlan(app, subscriptionId, { newPlanId: String(newPlanId) })
    expect(res.status).toBe(200)
  })

  it('refuses (403) an app admin changing ANOTHER tenant’s subscription — cross-tenant', async () => {
    // Subscription belongs to the `ezauth` tenant (see seedSubscriptionAndPlans).
    const { subscriptionId, newPlanId } = await seedSubscriptionAndPlans()
    currentUserId = 'admin-other'
    currentAppRoles = { 'other-app': ['admin'] }
    ownedSlugs = ['other-app'] // owns a DIFFERENT tenant

    const res = await postChangePlan(app, subscriptionId, { newPlanId: String(newPlanId) })

    expect(res.status).toBe(403)
    expect(subscriptionsUpdateMock).not.toHaveBeenCalled()
  })

  it('allows an app admin to change a subscription of an Application they own', async () => {
    const { subscriptionId, newPlanId, newPriceId } = await seedSubscriptionAndPlans()
    currentUserId = 'admin-ezauth'
    currentAppRoles = { ezauth: ['admin'] }
    ownedSlugs = ['ezauth'] // owns the matching tenant
    subscriptionsRetrieveMock.mockResolvedValue({
      id: subscriptionId,
      items: { data: [{ id: 'si_1' }] },
    })
    subscriptionsUpdateMock.mockResolvedValue({
      id: subscriptionId,
      status: 'active',
      items: { data: [{ id: 'si_1', current_period_end: 1999999999 }] },
    })

    const res = await postChangePlan(app, subscriptionId, { newPlanId: String(newPlanId) })

    expect(res.status).toBe(200)
    expect(subscriptionsUpdateMock).toHaveBeenCalledWith(subscriptionId, {
      items: [{ id: 'si_1', price: newPriceId }],
      proration_behavior: 'create_prorations',
    })
  })

  it('returns 404 (generic) when the target plan belongs to ANOTHER tenant — arbitrage closed (HIGH-1)', async () => {
    // Subscription belongs to the `ezauth` tenant. The caller owns it, but
    // tries to re-price onto a cheaper Plan from a DIFFERENT tenant.
    const { subscriptionId } = await seedSubscriptionAndPlans()
    const foreignPlan = await Plan.create({
      name: 'Cheap Foreign Plan',
      applicationId: 'app-other',
      appName: 'otherapp', // slug of a DIFFERENT tenant
      amount: 100, // €1.00 — much cheaper than the ezauth plan
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_foreign',
      stripePriceId: 'price_foreign',
    })

    const res = await postChangePlan(app, subscriptionId, {
      newPlanId: String(foreignPlan._id),
    })

    // Generic 404 — never reveals the foreign plan exists. No Stripe call.
    expect(res.status).toBe(404)
    expect(subscriptionsRetrieveMock).not.toHaveBeenCalled()
    expect(subscriptionsUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 404 (fail-closed) when the target plan has no tenant slug snapshot (HIGH-1)', async () => {
    const { subscriptionId } = await seedSubscriptionAndPlans()
    // A plan WITHOUT `appName` cannot be bound to the subscription's tenant —
    // fail-closed rather than allow an unattributable plan.
    const orphanPlan = await Plan.create({
      name: 'Orphan Plan',
      applicationId: 'app-ezauth',
      // no appName
      amount: 9999,
      currency: 'EUR',
      interval: 'year',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_orphan',
      stripePriceId: 'price_orphan',
    })

    const res = await postChangePlan(app, subscriptionId, {
      newPlanId: String(orphanPlan._id),
    })

    expect(res.status).toBe(404)
    expect(subscriptionsUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when the target plan is inactive', async () => {
    const { subscriptionId } = await seedSubscriptionAndPlans()
    const inactive = await Plan.create({
      name: 'Old',
      applicationId: 'app-1',
      appName: 'ezauth',
      amount: 9999,
      currency: 'EUR',
      interval: 'year',
      intervalCount: 1,
      active: false,
      stripeProductId: 'prod_x',
      stripePriceId: 'price_x',
    })

    const res = await postChangePlan(app, subscriptionId, {
      newPlanId: String(inactive._id),
    })
    expect(res.status).toBe(400)
    expect(subscriptionsUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when the target plan has no stripePriceId', async () => {
    const { subscriptionId } = await seedSubscriptionAndPlans()
    const unlinkedPlan = await Plan.create({
      name: 'Unlinked',
      applicationId: 'app-1',
      appName: 'ezauth',
      amount: 9999,
      currency: 'EUR',
      interval: 'year',
      intervalCount: 1,
      active: true,
    })

    const res = await postChangePlan(app, subscriptionId, {
      newPlanId: String(unlinkedPlan._id),
    })
    expect(res.status).toBe(400)
    expect(subscriptionsUpdateMock).not.toHaveBeenCalled()
  })
})
