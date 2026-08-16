/**
 * PAY-SUB-USERID-WEBHOOK-JOIN-001 — E2E chained subscription flow.
 *
 * Proves the four canonical subscription flows work end-to-end through the
 * real routers (not just direct `PaymentModel.updateOne` calls):
 *
 *   1. Happy path — `POST /subscribe` → `checkout.completed` webhook →
 *      `GET /subscriptions` returns a `completed` row with `metadata.subscriptionId`
 *      stamped and `stripeCustomerId` persisted.
 *
 *   2. Resilience — `customer.subscription.updated` arrives BEFORE
 *      `checkout.completed`. The webhook handler must fall back to the
 *      `stripeCustomerId + status: 'pending'` join and stamp
 *      `metadata.subscriptionId` inline, so subsequent lookups keep working.
 *
 *   3. Cancel chain — active subscription → `POST /cancel` → Stripe fires
 *      `customer.subscription.deleted` → row transitions to `cancelled`.
 *
 *   4. Refund chain — completed subscription with a `stripePaymentIntentId`
 *      → `POST /payments/:id/refund` → Stripe fires `charge.refunded` →
 *      row transitions to `refunded`.
 *
 * Uses `supertest` against the real Express routers with mocked
 * Stripe provider + ezauth-client + auth middleware — no external network.
 * Backed by MongoMemoryServer via `@ezstart/test-utils`.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { Types } from 'mongoose'
import type { Model } from 'mongoose'
import type { WebhookEvent } from '@ezstart/pay-sdk/providers'
import type { EzauthApplication } from '../../../services/ezauth-client.js'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'
import { getPlanModel, type PlanDocument } from '../../../models/Plan.js'

// ---------------------------------------------------------------------------
// Provider mock — the Stripe SDK is never touched. Every route calls
// `getProviderForRequest(req)`; we return a hand-rolled fake with just the
// methods needed for this test set.
// ---------------------------------------------------------------------------

const createSubscriptionCheckoutMock = vi.fn()
const cancelSubscriptionProviderMock = vi.fn()
const refundPaymentProviderMock = vi.fn()

vi.mock('../../../services/stripe.js', () => ({
  getProviderForRequest: () => ({
    createSubscriptionCheckout: createSubscriptionCheckoutMock,
    cancelSubscription: cancelSubscriptionProviderMock,
    refundPayment: refundPaymentProviderMock,
  }),
  verifyStripeWebhook:
    vi.fn<(payload: unknown, sig: string) => { event: WebhookEvent; mode: 'test' | 'live' }>(),
  resolveRequestMode: (req: { derivedMode?: string }) =>
    req.derivedMode === 'test' ? 'test' : 'live',
  isStripeModeUnavailableError: () => false,
}))

// ---------------------------------------------------------------------------
// ezauth-client mock — `getApplication` for tenant ownership, `getUser`
// for the Fix A body.userId existence check, `listApplicationsByOwner` for
// the RBAC scope filter.
// ---------------------------------------------------------------------------

let mockApplication: EzauthApplication | null = null
let mockUserExists = true
let mockOwnedApps: EzauthApplication[] = []
const getApplicationMock = vi.fn(async () => mockApplication)
const verifyUserExistsMock = vi.fn(async () => mockUserExists)
const listApplicationsByOwnerMock = vi.fn(async () => mockOwnedApps)

vi.mock('../../../services/ezauth-client.js', () => ({
  getApplication: getApplicationMock,
  verifyUserExists: verifyUserExistsMock,
  listApplicationsByOwner: listApplicationsByOwnerMock,
}))

// No Connect fee in this test suite — always platform-native charges.
vi.mock('../../../services/connect-fee.js', () => ({
  resolveConnectFee: vi.fn(async () => ({ isConnect: false })),
}))

// ezauth notify is fire-and-forget in the webhook path — silence it.
vi.mock('../../../services/ezauth-subscription-webhook.js', () => ({
  notifyEzauthSubscription: vi.fn(async () => {}),
}))

// Dunning side-effects are covered by their own tests — silence them here.
vi.mock('../../../services/dunning.service.js', () => ({
  handlePastDue: vi.fn(async () => {}),
  handleRecovered: vi.fn(async () => {}),
  handleFinalCancellation: vi.fn(async () => {}),
}))

// ---------------------------------------------------------------------------
// Auth middleware mock — simulate the JWT-vs-key branches. `system` mimics
// the S2S self-key path (publishable-key caller from the pay-sdk client);
// a real ObjectId mimics an authenticated session cookie.
// ---------------------------------------------------------------------------

let currentUserId: string | undefined = 'system'
let currentGlobalRoles: string[] = []
let currentAppRoles: Record<string, string[]> = {}
let currentApiKeyApplicationId: string | undefined
let currentDerivedScope: 'mine' | 'myApps' | 'all' | undefined
let currentApiKeyType: 'publishable' | 'secret' | undefined
let currentApiKeyScope: string | undefined

vi.mock('../../../middleware/auth.js', () => ({
  isAdminUser: (req: express.Request): boolean => {
    const user = req.user as { globalRoles?: string[]; appRoles?: Record<string, string[]> }
    if (user?.globalRoles?.some(r => r === 'superadmin' || r === 'admin')) return true
    return Object.values(user?.appRoles ?? {}).some(roles => roles.includes('admin'))
  },
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
}))

vi.mock('../../../middleware/unified-auth.js', () => ({
  authJwtOrKey:
    () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      req.userId = currentUserId
      if (currentApiKeyApplicationId) {
        req.apiKeyApplicationId = currentApiKeyApplicationId
      }
      if (currentApiKeyType) {
        req.apiKeyType = currentApiKeyType
      }
      if (currentApiKeyScope) {
        req.apiKeyScope = currentApiKeyScope as 'admin' | 'user' | 'readonly'
      }
      ;(req as unknown as { user: Record<string, unknown> }).user = {
        userId: currentUserId,
        globalRoles: currentGlobalRoles,
        appRoles: currentAppRoles,
      }
      next()
    },
}))

// `attachDerivedScope` is a real middleware — swap it for a stub that
// respects the harness-controlled `currentDerivedScope`.
vi.mock('@ezstart/api-core', async () => {
  const actual = await vi.importActual<typeof import('@ezstart/api-core')>('@ezstart/api-core')
  return {
    ...actual,
    attachDerivedScope: (
      req: express.Request,
      _res: express.Response,
      next: express.NextFunction
    ) => {
      req.derivedScope = currentDerivedScope ?? 'mine'
      next()
    },
  }
})

// ---------------------------------------------------------------------------
// Route + webhook harness — mount everything on a single Express app so the
// tests can drive the full chain (`POST /subscribe` → webhook → list →
// cancel → refund) through supertest-style fetch calls.
// ---------------------------------------------------------------------------

import { verifyStripeWebhook } from '../../../services/stripe.js'
const verify = vi.mocked(verifyStripeWebhook)

const subscribeRoute = await import('../../../routes/subscriptions/create.js')
const listRoute = await import('../../../routes/subscriptions/list.js')
const cancelRoute = await import('../../../routes/subscriptions/cancel.js')
const refundRoute = await import('../../../routes/payments/refund.js')
const webhooksRoute = await import('../../../routes/webhooks.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', subscribeRoute.default)
  app.use('/', listRoute.default)
  app.use('/', cancelRoute.default)
  app.use('/', refundRoute.default)
  app.use('/', webhooksRoute.default)
  return app
}

interface HttpResponse<T = Record<string, unknown>> {
  status: number
  body: T & { success?: boolean; error?: unknown; data?: unknown }
}

async function httpJson<T = Record<string, unknown>>(
  app: Express,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      const init: RequestInit = {
        method,
        headers: { 'content-type': 'application/json', authorization: 'Bearer fake-jwt' },
      }
      if (body !== undefined) {
        init.body = JSON.stringify(body)
      }
      fetch(`http://127.0.0.1:${port}${path}`, init)
        .then(async r => {
          const parsed = (await r.json()) as HttpResponse<T>['body']
          server.close()
          resolve({ status: r.status, body: parsed })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

interface WebhookInvocation {
  statusCode: number
  body: unknown
}

async function invokeWebhook(event: WebhookEvent): Promise<WebhookInvocation> {
  // `verifyStripeWebhook` returns `{ event, mode }` — mirror the existing
  // stripe-webhook-mode.test.ts pattern so we drive the REAL handler.
  const mode = event.livemode ? 'live' : 'test'
  verify.mockReturnValueOnce({ event, mode })

  const app = createApp()
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      // The webhook route reads the raw body from `req.body` (post-json parse).
      // Because we mocked signature verification, the payload contents don't
      // matter — only the signature header presence does.
      fetch(`http://127.0.0.1:${address.port}/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'sig_fake',
        },
        body: JSON.stringify({ id: 'evt_placeholder' }),
      })
        .then(async r => {
          const parsed = (await r.json()) as unknown
          server.close()
          resolve({ statusCode: r.status, body: parsed })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

// Fixture builders — keep the individual tests focused on assertions.

const APP_ID = '507f1f77bcf86cd799439010'
const USER_ID = '507f1f77bcf86cd799439011'
const CUSTOMER_ID = 'cus_test_123'
const SUBSCRIPTION_ID = 'sub_test_123'
const CHECKOUT_SESSION_ID = 'cs_test_chain_1'
const PAYMENT_INTENT_ID = 'pi_test_chain_1'

function checkoutCompletedEvent(opts?: {
  sessionId?: string
  subscriptionId?: string
  customerId?: string
}): WebhookEvent {
  return {
    type: 'checkout.completed',
    livemode: true,
    raw: { id: `evt_checkout_${opts?.sessionId ?? CHECKOUT_SESSION_ID}` },
    data: {
      sessionId: opts?.sessionId ?? CHECKOUT_SESSION_ID,
      paymentIntentId: PAYMENT_INTENT_ID,
      subscriptionId: opts?.subscriptionId ?? SUBSCRIPTION_ID,
      customerId: opts?.customerId ?? CUSTOMER_ID,
      paymentMethod: 'card',
      mode: 'subscription',
      metadata: { userId: USER_ID },
    },
  } as WebhookEvent
}

function subscriptionUpdatedEvent(opts?: {
  subscriptionId?: string
  customerId?: string
  status?: string
}): WebhookEvent {
  return {
    type: 'subscription.updated',
    livemode: true,
    raw: { id: `evt_sub_updated_${opts?.subscriptionId ?? SUBSCRIPTION_ID}` },
    data: {
      subscriptionId: opts?.subscriptionId ?? SUBSCRIPTION_ID,
      status: opts?.status ?? 'active',
      customerId: opts?.customerId ?? CUSTOMER_ID,
    },
  } as WebhookEvent
}

function subscriptionDeletedEvent(opts?: {
  subscriptionId?: string
  customerId?: string
}): WebhookEvent {
  return {
    type: 'subscription.deleted',
    livemode: true,
    raw: { id: `evt_sub_deleted_${opts?.subscriptionId ?? SUBSCRIPTION_ID}` },
    data: {
      subscriptionId: opts?.subscriptionId ?? SUBSCRIPTION_ID,
      status: 'canceled',
      customerId: opts?.customerId ?? CUSTOMER_ID,
    },
  } as WebhookEvent
}

function refundedEvent(): WebhookEvent {
  return {
    type: 'payment.refunded',
    livemode: true,
    raw: { id: `evt_refund_${PAYMENT_INTENT_ID}` },
    data: {
      paymentIntentId: PAYMENT_INTENT_ID,
    },
  } as WebhookEvent
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /subscribe → webhook → GET /subscriptions — E2E chain', () => {
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
    cancelSubscriptionProviderMock.mockReset()
    refundPaymentProviderMock.mockReset()
    createSubscriptionCheckoutMock.mockResolvedValue({
      sessionId: CHECKOUT_SESSION_ID,
      url: 'https://stripe.test/cs',
    })
    cancelSubscriptionProviderMock.mockResolvedValue(undefined)
    refundPaymentProviderMock.mockResolvedValue(undefined)
    getApplicationMock.mockClear()
    verifyUserExistsMock.mockClear()
    listApplicationsByOwnerMock.mockClear()

    mockApplication = {
      id: APP_ID,
      slug: 'myapp',
      name: 'My App',
      ownerId: USER_ID,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    mockUserExists = true
    mockOwnedApps = [mockApplication]

    // Default caller — secret S2S admin key context (self-key sentinel). This
    // is the only auth mode where `body.userId` is trusted alongside a
    // 'system' JWT sentinel — the pay-sdk client posts via the ezpay S2S key
    // when running server-side from a consumer.
    currentUserId = 'system'
    currentGlobalRoles = ['superadmin']
    currentAppRoles = {}
    currentApiKeyApplicationId = APP_ID
    currentDerivedScope = 'mine'
    currentApiKeyType = 'secret'
    currentApiKeyScope = 'admin'
  })

  async function seedPlan(): Promise<string> {
    const plan = await Plan.create({
      name: 'Pro Monthly',
      applicationId: APP_ID,
      appName: 'myapp',
      amount: 4900,
      currency: 'eur',
      interval: 'month',
      intervalCount: 1,
      active: true,
      features: ['feature-a'],
      stripeProductId: 'prod_pro',
      stripePriceId: 'price_pro',
    })
    return String(plan._id as Types.ObjectId)
  }

  it('happy path — subscribe → checkout.completed → subscription lists as completed with real userId', async () => {
    const planId = await seedPlan()

    // 1. POST /subscribe with body.userId — publishable-key caller path.
    const createRes = await httpJson(app, 'POST', '/subscribe', {
      projectId: 'myapp',
      applicationId: APP_ID,
      planId,
      userId: USER_ID,
      returnUrl: 'https://consumer.example.com',
    })
    expect(createRes.status).toBe(200)
    expect(createRes.body.success).toBe(true)

    // The Fix A trust check hit ezauth once to prove USER_ID exists.
    expect(verifyUserExistsMock).toHaveBeenCalledTimes(1)
    expect(verifyUserExistsMock).toHaveBeenCalledWith(USER_ID)

    // Payment row has the real userId (not the 'system' sentinel).
    const created = await Payment.findOne({ paymentId: CHECKOUT_SESSION_ID })
    expect(created).not.toBeNull()
    expect(created?.userId).toBe(USER_ID)
    expect(created?.status).toBe('pending')

    // 2. checkout.completed webhook — stamps subscriptionId + stripeCustomerId.
    const webhookRes = await invokeWebhook(checkoutCompletedEvent())
    expect(webhookRes.statusCode).toBe(200)

    const afterCheckout = await Payment.findOne({ paymentId: CHECKOUT_SESSION_ID })
    expect(afterCheckout?.status).toBe('completed')
    expect(afterCheckout?.metadata?.subscriptionId).toBe(SUBSCRIPTION_ID)
    expect(afterCheckout?.stripeCustomerId).toBe(CUSTOMER_ID)
    expect(afterCheckout?.stripePaymentIntentId).toBe(PAYMENT_INTENT_ID)

    // 3. GET /subscriptions returns the row scoped to USER_ID.
    currentUserId = USER_ID
    currentGlobalRoles = []
    currentApiKeyApplicationId = undefined
    currentDerivedScope = 'mine'

    const listRes = await httpJson<{
      data: Array<{ userId: string; status: string; metadata?: { subscriptionId?: string } }>
    }>(app, 'GET', '/subscriptions?limit=10&offset=0')
    expect(listRes.status).toBe(200)
    expect(listRes.body.success).toBe(true)
    const subs = listRes.body.data
    expect(subs).toHaveLength(1)
    expect(subs?.[0]?.userId).toBe(USER_ID)
    expect(subs?.[0]?.status).toBe('completed')
    expect(subs?.[0]?.metadata?.subscriptionId).toBe(SUBSCRIPTION_ID)
  })

  it('resilience — subscription.updated arrives BEFORE checkout.completed → fallback stamps subscriptionId via customer', async () => {
    const planId = await seedPlan()

    // POST /subscribe creates the pending Payment row.
    const createRes = await httpJson(app, 'POST', '/subscribe', {
      projectId: 'myapp',
      applicationId: APP_ID,
      planId,
      userId: USER_ID,
      returnUrl: 'https://consumer.example.com',
    })
    expect(createRes.status).toBe(200)

    // Simulate the checkout.completed handler stamping ONLY the customer id
    // (mimic partial delivery — imagine the row was upserted by an earlier
    // Payment-collection touch that captured `stripeCustomerId` on write).
    // We reproduce this state directly by patching the row: mark `stripeCustomerId`
    // as if the checkout event stamped it, but LEAVE `metadata.subscriptionId`
    // absent — this is the exact "webhook out-of-order" gap we're testing.
    await Payment.updateOne({ paymentId: CHECKOUT_SESSION_ID }, { stripeCustomerId: CUSTOMER_ID })

    const beforeFallback = await Payment.findOne({ paymentId: CHECKOUT_SESSION_ID })
    expect(beforeFallback?.metadata?.subscriptionId).toBeUndefined()
    expect(beforeFallback?.stripeCustomerId).toBe(CUSTOMER_ID)

    // The subscription.updated webhook fires — the initial join misses
    // (`metadata.subscriptionId` absent), the resilience fallback finds
    // the row via `stripeCustomerId + status: 'pending'` and inline-stamps
    // `metadata.subscriptionId`.
    const webhookRes = await invokeWebhook(subscriptionUpdatedEvent())
    expect(webhookRes.statusCode).toBe(200)

    const afterFallback = await Payment.findOne({ paymentId: CHECKOUT_SESSION_ID })
    expect(afterFallback?.metadata?.subscriptionId).toBe(SUBSCRIPTION_ID)
    expect(afterFallback?.status).toBe('completed')
  })

  it('cancel chain — POST /cancel → subscription.deleted webhook → status=cancelled', async () => {
    const planId = await seedPlan()

    // Seed a completed subscription directly.
    await Payment.create({
      projectId: 'myapp',
      projectName: 'myapp',
      type: 'subscription',
      amount: 49,
      currency: 'eur',
      userId: USER_ID,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: CHECKOUT_SESSION_ID,
      status: 'completed',
      liveMode: true,
      isTestMode: false,
      stripeCustomerId: CUSTOMER_ID,
      stripePaymentIntentId: PAYMENT_INTENT_ID,
      metadata: { subscriptionId: SUBSCRIPTION_ID, planId, planName: 'Pro Monthly' },
    })

    // POST /cancel — the caller owns the subscription so ownership passes.
    currentUserId = USER_ID
    currentGlobalRoles = []
    currentApiKeyApplicationId = undefined

    const cancelRes = await httpJson(app, 'POST', `/subscriptions/${SUBSCRIPTION_ID}/cancel`)
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.success).toBe(true)
    expect(cancelSubscriptionProviderMock).toHaveBeenCalledWith(SUBSCRIPTION_ID)

    // Cancel doesn't hit `status` synchronously — Stripe fires the deleted
    // webhook once the billing period ends.
    const afterCancel = await Payment.findOne({ paymentId: CHECKOUT_SESSION_ID })
    expect(afterCancel?.cancelAtPeriodEnd).toBe(true)
    expect(afterCancel?.status).toBe('completed')

    // subscription.deleted webhook completes the chain.
    const webhookRes = await invokeWebhook(subscriptionDeletedEvent())
    expect(webhookRes.statusCode).toBe(200)

    const afterDeleted = await Payment.findOne({ paymentId: CHECKOUT_SESSION_ID })
    expect(afterDeleted?.status).toBe('cancelled')
  })

  it('refund chain — POST /refund → payment.refunded webhook → status=refunded', async () => {
    const planId = await seedPlan()

    const seeded = await Payment.create({
      projectId: 'myapp',
      projectName: 'myapp',
      type: 'subscription',
      amount: 49,
      currency: 'eur',
      userId: USER_ID,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: CHECKOUT_SESSION_ID,
      status: 'completed',
      liveMode: true,
      isTestMode: false,
      stripeCustomerId: CUSTOMER_ID,
      stripePaymentIntentId: PAYMENT_INTENT_ID,
      metadata: { subscriptionId: SUBSCRIPTION_ID, planId, planName: 'Pro Monthly' },
    })
    // The refund route accepts either the Mongo `_id` OR the paymentId. When
    // paymentId is not a valid ObjectId the `$or` upstream will still match on
    // the `paymentId` branch, but mongoose 8 tightened cast semantics so pass
    // the real `_id` here to avoid a CastError even in the unmatched branch.
    const seededId = String(seeded._id as Types.ObjectId)

    // Admin scope required for refund — superadmin caller.
    currentUserId = USER_ID
    currentGlobalRoles = ['superadmin']
    currentApiKeyApplicationId = undefined

    const refundRes = await httpJson(app, 'POST', `/payments/${seededId}/refund`)
    expect(refundRes.status).toBe(200)
    expect(refundRes.body.success).toBe(true)
    expect(refundPaymentProviderMock).toHaveBeenCalledWith(PAYMENT_INTENT_ID)

    const afterRefundApi = await Payment.findOne({ paymentId: CHECKOUT_SESSION_ID })
    expect(afterRefundApi?.status).toBe('refunded')

    // payment.refunded webhook — reidempotent; the row is already refunded so
    // this proves the chain is convergent (webhook doesn't undo the API write).
    const webhookRes = await invokeWebhook(refundedEvent())
    expect(webhookRes.statusCode).toBe(200)

    const afterRefundWebhook = await Payment.findOne({ paymentId: CHECKOUT_SESSION_ID })
    expect(afterRefundWebhook?.status).toBe('refunded')
  })
})
