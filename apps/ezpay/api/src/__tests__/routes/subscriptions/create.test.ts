/**
 * Wave E Lot 1A — security tests for POST /subscribe.
 *
 * Covers:
 *  - C-1 price authority: a client-supplied `amount` is IGNORED; the Stripe
 *    checkout uses the server-resolved price from the linked Plan.
 *  - C-3 tenant ownership: a Bearer caller cannot subscribe against an
 *    Application they do not own → 403.
 *  - Plan validation: missing / inactive / unlinked plan → 404 / 400.
 *
 * The provider, ezauth-client, connect-fee and auth middleware are mocked so
 * only the route's authority logic is under test (no real Stripe call).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import type { Model, Types } from 'mongoose'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'
import { getPlanModel, type PlanDocument } from '../../../models/Plan.js'
import type { EzauthApplication } from '../../../services/ezauth-client.js'

// --- Provider mock -----------------------------------------------------------
const createSubscriptionCheckoutMock = vi.fn()
vi.mock('../../../services/stripe.js', () => ({
  getProviderForRequest: () => ({
    createSubscriptionCheckout: createSubscriptionCheckoutMock,
  }),
  resolveRequestMode: (req: { derivedMode?: string }) =>
    req.derivedMode === 'test' ? 'test' : 'live',
  isStripeModeUnavailableError: () => false,
}))

// --- ezauth-client mock (ownership source-of-truth) --------------------------
let mockApplication: EzauthApplication | null = null
const getApplicationMock = vi.fn(async () => mockApplication)
// PII-free by design ({ exists, isDeleted } only) — never returns an email.
const verifyUserExistsMock = vi.fn(async () => true)
vi.mock('../../../services/ezauth-client.js', () => ({
  getApplication: getApplicationMock,
  verifyUserExists: verifyUserExistsMock,
}))

// --- connect-fee mock (no Connect routing in these tests) --------------------
vi.mock('../../../services/connect-fee.js', () => ({
  resolveConnectFee: vi.fn(async () => ({ isConnect: false })),
}))

// --- auth mocks --------------------------------------------------------------
let currentUserId: string | undefined = 'user-1'
let currentGlobalRoles: string[] = []
let currentApiKeyApplicationId: string | undefined
// Email carried by the verified JWT identity (`req.user.email`). `undefined`
// models a token with no email claim.
let currentEmail: string | undefined
// API-key context stamped by the real `api-key` middleware. `secret` + `admin`
// makes `isSecretAdminKey` true → the S2S caller may supply `customerEmail`.
let currentApiKeyType: 'publishable' | 'secret' | undefined
let currentApiKeyScope: 'admin' | 'user' | 'readonly' | undefined

vi.mock('../../../middleware/auth.js', () => ({
  isAdminUser: (req: express.Request): boolean =>
    (req.user?.globalRoles as string[] | undefined)?.includes('superadmin') ?? false,
}))

vi.mock('../../../middleware/unified-auth.js', () => ({
  authJwtOrKey: () => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (currentApiKeyType) req.apiKeyType = currentApiKeyType
    if (currentApiKeyScope) req.apiKeyScope = currentApiKeyScope
    if (currentApiKeyApplicationId) {
      req.apiKeyApplicationId = currentApiKeyApplicationId
      req.userId = currentUserId
      next()
      return
    }
    if (!currentUserId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }
    req.userId = currentUserId
    ;(req as unknown as { user: Record<string, unknown> }).user = {
      userId: currentUserId,
      email: currentEmail,
      globalRoles: currentGlobalRoles,
    }
    next()
  },
}))

const routeMod = await import('../../../routes/subscriptions/create.js')

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
    data?: {
      payment?: { amount?: number; currency?: string; metadata?: Record<string, unknown> }
      checkoutUrl?: string | null
    }
    error?: unknown
  }
}

async function postSubscribe(app: Express, body: Record<string, unknown>): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    // Provide a returnUrl so the route never calls getWebUrl() with a test
    // projectId that isn't a known platform AppName (which would throw).
    const httpBody = JSON.stringify({ returnUrl: 'https://consumer.example.com', ...body })
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      fetch(`http://127.0.0.1:${port}/subscribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer fake-jwt' },
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

describe('POST /subscribe — price authority + tenant ownership (Wave E 1A)', () => {
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
    createSubscriptionCheckoutMock.mockReset()
    createSubscriptionCheckoutMock.mockResolvedValue({
      sessionId: 'cs_sub_test',
      url: 'https://stripe.test/cs',
    })
    getApplicationMock.mockClear()
    verifyUserExistsMock.mockClear()
    verifyUserExistsMock.mockResolvedValue(true)
    currentUserId = 'user-1'
    currentGlobalRoles = []
    currentApiKeyApplicationId = undefined
    currentEmail = undefined
    currentApiKeyType = undefined
    currentApiKeyScope = undefined
    mockApplication = {
      id: 'app-1',
      slug: 'myapp',
      name: 'My App',
      ownerId: 'user-1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
  })

  async function seedPlan(): Promise<Types.ObjectId> {
    const plan = await Plan.create({
      name: 'Pro Monthly',
      applicationId: 'app-1',
      appName: 'myapp',
      amount: 4900, // €49.00 in cents
      currency: 'eur',
      interval: 'month',
      intervalCount: 1,
      active: true,
      features: ['feature-a'],
      stripeProductId: 'prod_pro',
      stripePriceId: 'price_pro',
    })
    return plan._id as Types.ObjectId
  }

  it('IGNORES a tampered client amount and charges the server-resolved plan price', async () => {
    const planId = await seedPlan()

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(planId),
      planName: 'Hacked Name',
      amount: 0.01, // attacker tries €0.01 for a €49 plan
      currency: 'usd', // valid ISO code but different from the plan's EUR
      intervalCount: 12, // valid but different from the plan's monthly cadence
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    // Provider was called with the plan price (49.00 major units), NOT 0.01.
    expect(createSubscriptionCheckoutMock).toHaveBeenCalledTimes(1)
    const firstCall = createSubscriptionCheckoutMock.mock.calls[0]
    if (!firstCall) throw new Error('provider was not called')
    const opts = firstCall[0] as {
      amount: number
      currency: string
      intervalCount: number
    }
    expect(opts.amount).toBe(49)
    expect(opts.currency).toBe('eur')
    expect(opts.intervalCount).toBe(1)
    // Persisted payment reflects the server price too.
    expect(res.body.data?.payment?.amount).toBe(49)
  })

  it('returns 404 when the plan does not exist', async () => {
    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: '507f1f77bcf86cd799439011',
      amount: 49,
    })
    expect(res.status).toBe(404)
    expect(createSubscriptionCheckoutMock).not.toHaveBeenCalled()
  })

  it('returns 400 when the plan is inactive', async () => {
    const plan = await Plan.create({
      name: 'Old',
      applicationId: 'app-1',
      appName: 'myapp',
      amount: 4900,
      currency: 'eur',
      interval: 'month',
      intervalCount: 1,
      active: false,
      stripePriceId: 'price_old',
    })
    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(plan._id),
    })
    expect(res.status).toBe(400)
    expect(createSubscriptionCheckoutMock).not.toHaveBeenCalled()
  })

  it('returns 400 when the plan is not linked to a Stripe price', async () => {
    const plan = await Plan.create({
      name: 'Unlinked',
      applicationId: 'app-1',
      appName: 'myapp',
      amount: 4900,
      currency: 'eur',
      interval: 'month',
      intervalCount: 1,
      active: true,
    })
    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(plan._id),
    })
    expect(res.status).toBe(400)
    expect(createSubscriptionCheckoutMock).not.toHaveBeenCalled()
  })

  it('returns 404 (generic) when the plan belongs to ANOTHER tenant — price arbitrage closed (HIGH-1)', async () => {
    // Attacker owns app-1 (mockApplication.ownerId === 'user-1') and is fully
    // authorised for it, but references a cheaper Plan that belongs to app-2.
    const foreignPlan = await Plan.create({
      name: 'Cheap Foreign Plan',
      applicationId: 'app-2', // a DIFFERENT tenant
      appName: 'otherapp',
      amount: 100, // €1.00 in cents — much cheaper than the caller's own plan
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_foreign',
      stripePriceId: 'price_foreign',
    })

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1', // the tenant the caller actually owns
      planId: String(foreignPlan._id),
    })

    // Generic 404 — never reveals that the foreign plan exists.
    expect(res.status).toBe(404)
    expect(createSubscriptionCheckoutMock).not.toHaveBeenCalled()
  })

  it('charges the caller’s OWN plan price (no arbitrage) when the plan is in the same tenant', async () => {
    const planId = await seedPlan() // applicationId 'app-1', €49 eur

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(planId),
    })

    expect(res.status).toBe(200)
    expect(createSubscriptionCheckoutMock).toHaveBeenCalledTimes(1)
    const firstCall = createSubscriptionCheckoutMock.mock.calls[0]
    if (!firstCall) throw new Error('provider was not called')
    const opts = firstCall[0] as { amount: number; currency: string }
    expect(opts.amount).toBe(49)
    expect(opts.currency).toBe('eur')
  })

  it('rejects an API-key caller referencing a plan from another tenant — key binding (HIGH-1)', async () => {
    // The key is bound to app-1; the referenced plan belongs to app-2.
    currentApiKeyApplicationId = 'app-1'
    currentUserId = 'key-owner'
    const foreignPlan = await Plan.create({
      name: 'Cross-tenant Plan',
      applicationId: 'app-2',
      appName: 'otherapp',
      amount: 100,
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_foreign',
      stripePriceId: 'price_foreign',
    })

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      planId: String(foreignPlan._id),
    })

    expect(res.status).toBe(404)
    expect(createSubscriptionCheckoutMock).not.toHaveBeenCalled()
  })

  it('returns 403 when the caller does not own the target Application', async () => {
    const planId = await seedPlan()
    mockApplication = {
      id: 'app-1',
      slug: 'myapp',
      name: 'My App',
      ownerId: 'someone-else', // owned by another user
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(planId),
    })
    expect(res.status).toBe(403)
    expect(createSubscriptionCheckoutMock).not.toHaveBeenCalled()
  })

  it('allows a superadmin to subscribe for any Application', async () => {
    const planId = await seedPlan()
    currentGlobalRoles = ['superadmin']
    mockApplication = {
      id: 'app-1',
      slug: 'myapp',
      name: 'My App',
      ownerId: 'someone-else',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(planId),
    })
    expect(res.status).toBe(200)
    expect(createSubscriptionCheckoutMock).toHaveBeenCalledTimes(1)
  })

  it('trusts the API-key-bound Application without an ownership round-trip', async () => {
    const planId = await seedPlan()
    currentApiKeyApplicationId = 'app-1'
    currentUserId = 'key-owner'

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      // No applicationId in body — comes from the key binding.
      planId: String(planId),
    })
    expect(res.status).toBe(200)
    expect(getApplicationMock).not.toHaveBeenCalled()
    expect(createSubscriptionCheckoutMock).toHaveBeenCalledTimes(1)
  })

  // --- customerEmail trust boundary (anti dunning-spam) ----------------------
  // Persisted `Payment.customerEmail` feeds handlePastDue → dunning emails, so
  // a JWT user MUST NOT be able to steer it to an arbitrary address.

  async function persistedPayment(): Promise<PaymentDocument | null> {
    return Payment.findOne({ paymentId: 'cs_sub_test' })
  }

  it('JWT path — IGNORES body.customerEmail and persists the verified identity email', async () => {
    const planId = await seedPlan()
    currentEmail = 'verified@example.com'

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(planId),
      customerEmail: 'attacker@evil.com', // attacker-controlled, must be dropped
    })

    expect(res.status).toBe(200)
    const payment = await persistedPayment()
    expect(payment?.customerEmail).toBe('verified@example.com')
    expect(payment?.customerEmail).not.toBe('attacker@evil.com')
  })

  it('JWT path with no email claim — persists NO email (never the body)', async () => {
    const planId = await seedPlan()
    currentEmail = undefined // token carries no email claim

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(planId),
      customerEmail: 'attacker@evil.com', // must NOT be persisted
    })

    expect(res.status).toBe(200)
    const payment = await persistedPayment()
    expect(payment?.customerEmail).toBeUndefined()
  })

  it('secret admin S2S key — HONOURS body.customerEmail (only email signal available)', async () => {
    const planId = await seedPlan()
    // Secret admin key bound to app-1 → authority passes via the binding.
    currentApiKeyApplicationId = 'app-1'
    currentApiKeyType = 'secret'
    currentApiKeyScope = 'admin'
    currentUserId = 'key-owner'

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      planId: String(planId),
      customerEmail: 'admin-supplied@example.com',
    })

    expect(res.status).toBe(200)
    const payment = await persistedPayment()
    expect(payment?.customerEmail).toBe('admin-supplied@example.com')
  })

  it('user-scoped (non-admin) key — IGNORES body.customerEmail', async () => {
    const planId = await seedPlan()
    currentApiKeyApplicationId = 'app-1'
    currentApiKeyType = 'publishable'
    currentApiKeyScope = 'user'
    currentUserId = 'key-owner'

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      planId: String(planId),
      customerEmail: 'attacker@evil.com',
    })

    expect(res.status).toBe(200)
    const payment = await persistedPayment()
    expect(payment?.customerEmail).toBeUndefined()
  })
})
