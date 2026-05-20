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
  getStripeInstanceForMode: () => ({
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
    oldPlanId: Types.ObjectId
  }> {
    // The subscription's CURRENT plan — a real Plan row whose immutable
    // `applicationId` anchors the tenant identity (id↔id binding).
    const oldPlan = await Plan.create({
      name: 'Pro Monthly',
      applicationId: 'app-ezauth',
      appName: 'ezauth',
      amount: 999,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_old',
      stripePriceId: 'price_old',
    })

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
        planId: String(oldPlan._id),
        planName: 'Pro Monthly',
      },
    })

    // The target plan — SAME Application (`app-ezauth`) as the current plan.
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
      oldPlanId: oldPlan._id as Types.ObjectId,
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

  it('returns 404 (generic) when the target plan belongs to ANOTHER tenant — arbitrage closed (HIGH-1 / LOW-1)', async () => {
    // Subscription's current plan belongs to the `app-ezauth` tenant (id↔id
    // binding). The caller owns the subscription, but tries to re-price onto a
    // cheaper Plan whose immutable `applicationId` is a DIFFERENT tenant.
    const { subscriptionId } = await seedSubscriptionAndPlans()
    const foreignPlan = await Plan.create({
      name: 'Cheap Foreign Plan',
      applicationId: 'app-other', // id of a DIFFERENT tenant
      appName: 'otherapp',
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

  it('still binds id↔id even when the foreign plan shares the OLD slug (appName ignored — LOW-1)', async () => {
    // Defends the symmetry fix: a foreign plan that mutated/forged its
    // deprecated `appName` to match the subscription's slug (`ezauth`) MUST
    // still be rejected — the binding is on the immutable `applicationId`, not
    // the slug snapshot.
    const { subscriptionId } = await seedSubscriptionAndPlans()
    const forgedSlugPlan = await Plan.create({
      name: 'Forged Slug Plan',
      applicationId: 'app-other', // DIFFERENT tenant id
      appName: 'ezauth', // same slug as the subscription — must be ignored
      amount: 100,
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_forged',
      stripePriceId: 'price_forged',
    })

    const res = await postChangePlan(app, subscriptionId, {
      newPlanId: String(forgedSlugPlan._id),
    })

    expect(res.status).toBe(404)
    expect(subscriptionsRetrieveMock).not.toHaveBeenCalled()
    expect(subscriptionsUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 404 (fail-closed) when the subscription has no resolvable current plan (LOW-1)', async () => {
    // The subscription's `metadata.planId` does not resolve to any Plan row —
    // the tenant identity cannot be anchored, so we MUST fail-closed rather
    // than fall back to the deprecated `Payment.projectId` slug.
    await Payment.create({
      projectId: 'ezauth',
      projectName: 'EZAuth',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user-1',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_sub_orphan',
      status: 'completed',
      liveMode: false,
      metadata: {
        subscriptionId: 'sub_orphan',
        planId: '5f9f1b9b1c9d440000000000', // valid ObjectId, no matching Plan
        planName: 'Pro Monthly',
      },
    })

    // A perfectly valid same-tenant target plan exists — irrelevant, the
    // current plan cannot be resolved.
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

    const res = await postChangePlan(app, 'sub_orphan', {
      newPlanId: String(newPlan._id),
    })

    expect(res.status).toBe(404)
    expect(subscriptionsRetrieveMock).not.toHaveBeenCalled()
    expect(subscriptionsUpdateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when the target plan is inactive', async () => {
    const { subscriptionId } = await seedSubscriptionAndPlans()
    // Same tenant (`app-ezauth`) so the binding passes and we reach the
    // active check.
    const inactive = await Plan.create({
      name: 'Old',
      applicationId: 'app-ezauth',
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
    // Same tenant (`app-ezauth`) so the binding passes and we reach the
    // stripePriceId check.
    const unlinkedPlan = await Plan.create({
      name: 'Unlinked',
      applicationId: 'app-ezauth',
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
