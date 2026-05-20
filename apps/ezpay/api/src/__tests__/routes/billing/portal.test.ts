/**
 * Tests for POST /api/billing/portal — Stripe Customer Portal session.
 *
 * Mocks `getStripeInstance` so no real Stripe call is made. Exercises the
 * route via a minimal Express app — no full server stack needed.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'
import type { Model } from 'mongoose'

// ---------------------------------------------------------------------------
// Mocks — defined BEFORE importing the route so vi.mock bindings apply.
// ---------------------------------------------------------------------------

const billingPortalCreateMock = vi.fn()
const subscriptionsRetrieveMock = vi.fn()

vi.mock('../../../services/stripe-connect.js', () => ({
  getStripeInstance: () => ({
    billingPortal: {
      sessions: {
        create: billingPortalCreateMock,
      },
    },
    subscriptions: {
      retrieve: subscriptionsRetrieveMock,
    },
  }),
}))

let currentUserId: string | undefined = 'user-1'

vi.mock('../../../middleware/auth.js', () => ({
  authMiddleware: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!currentUserId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }
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
        globalRoles: [],
      }
    }
    next()
  },
  isAdminUser: () => false,
}))

// Dynamic import AFTER mocks.
const portalRouteMod = await import('../../../routes/billing/portal.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/billing', portalRouteMod.default)
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

async function postPortal(
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
      fetch(`http://127.0.0.1:${port}/billing/portal`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer fake-jwt',
          origin: 'https://app.example.com',
          ...headers,
        },
        body: httpBody,
      })
        .then(async r => {
          const responseBody = (await r.json()) as TestResponse['body']
          server.close()
          resolve({ status: r.status, body: responseBody })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

describe('POST /billing/portal — Stripe Customer Portal session', () => {
  let app: Express
  let Payment: Model<PaymentDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    Payment = await getPaymentModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Payment.deleteMany({})
    billingPortalCreateMock.mockReset()
    subscriptionsRetrieveMock.mockReset()
    currentUserId = 'user-1'
  })

  it('returns 401 when the caller is unauthenticated', async () => {
    currentUserId = undefined
    const res = await postPortal(app, {})
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
    expect(billingPortalCreateMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the user has no subscription', async () => {
    const res = await postPortal(app, {})
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(billingPortalCreateMock).not.toHaveBeenCalled()
  })

  it('returns 400 when returnUrl is not a valid URL', async () => {
    const res = await postPortal(app, { returnUrl: 'not-a-url' })
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
    expect(billingPortalCreateMock).not.toHaveBeenCalled()
  })

  it('honours an explicit customerId ONLY when it belongs to the authenticated user', async () => {
    // The user owns a subscription whose Stripe customer is cus_owned_123.
    await Payment.create({
      projectId: 'ezbill',
      projectName: 'EZBill',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user-1',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_sub_owned',
      status: 'completed',
      metadata: { subscriptionId: 'sub_owned' },
    })
    subscriptionsRetrieveMock.mockResolvedValue({ id: 'sub_owned', customer: 'cus_owned_123' })
    billingPortalCreateMock.mockResolvedValue({
      url: 'https://billing.stripe.com/session/explicit',
    })

    const res = await postPortal(app, {
      customerId: 'cus_owned_123',
      returnUrl: 'https://app.example.com/account',
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data?.url).toBe('https://billing.stripe.com/session/explicit')

    expect(billingPortalCreateMock).toHaveBeenCalledTimes(1)
    expect(billingPortalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_owned_123',
      return_url: 'https://app.example.com/account',
    })

    // Platform call — no Stripe-Account header / options passed as second arg
    const stripeCallArgs = billingPortalCreateMock.mock.calls[0]
    expect(stripeCallArgs).toHaveLength(1)
  })

  it('rejects (403) a customerId that does NOT belong to the authenticated user — portal hijack', async () => {
    // The attacker (user-1) owns a subscription mapping to their OWN customer,
    // but tries to open the VICTIM's portal by passing the victim customerId.
    await Payment.create({
      projectId: 'ezbill',
      projectName: 'EZBill',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user-1',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_sub_attacker',
      status: 'completed',
      metadata: { subscriptionId: 'sub_attacker' },
    })
    subscriptionsRetrieveMock.mockResolvedValue({ id: 'sub_attacker', customer: 'cus_attacker' })

    const res = await postPortal(app, { customerId: 'cus_victim_999' })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    // The hijack must NEVER reach Stripe's portal creation.
    expect(billingPortalCreateMock).not.toHaveBeenCalled()
  })

  it('rejects (404) an explicit customerId when the user owns no subscription at all', async () => {
    const res = await postPortal(app, { customerId: 'cus_victim_999' })

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(billingPortalCreateMock).not.toHaveBeenCalled()
  })

  it('auto-resolves the Stripe customerId from the latest subscription Payment', async () => {
    // Two subscription payments — latest should win.
    await Payment.create({
      projectId: 'ezbill',
      projectName: 'EZBill',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user-1',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_sub_old',
      status: 'completed',
      metadata: { subscriptionId: 'sub_old' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    await Payment.create({
      projectId: 'ezbill',
      projectName: 'EZBill',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user-1',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_sub_new',
      status: 'completed',
      metadata: { subscriptionId: 'sub_latest' },
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    })

    // The latest subscription (sub_latest) is checked FIRST and maps to the
    // user's primary customer. The older one resolves to a different customer.
    subscriptionsRetrieveMock.mockImplementation((subscriptionId: string) =>
      Promise.resolve(
        subscriptionId === 'sub_latest'
          ? { id: 'sub_latest', customer: 'cus_auto_456' }
          : { id: 'sub_old', customer: 'cus_old_000' }
      )
    )
    billingPortalCreateMock.mockResolvedValue({ url: 'https://billing.stripe.com/session/auto' })

    const res = await postPortal(app, {})

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data?.url).toBe('https://billing.stripe.com/session/auto')

    // The latest subscription is consulted; its customer is used.
    expect(subscriptionsRetrieveMock).toHaveBeenCalledWith('sub_latest')

    expect(billingPortalCreateMock).toHaveBeenCalledTimes(1)
    expect(billingPortalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_auto_456',
      return_url: 'https://app.example.com',
    })

    // Platform call — no Stripe-Account options argument
    const stripeCallArgs = billingPortalCreateMock.mock.calls[0]
    expect(stripeCallArgs).toHaveLength(1)
  })

  it('handles expanded customer objects returned by Stripe', async () => {
    await Payment.create({
      projectId: 'ezbill',
      projectName: 'EZBill',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user-1',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_sub_expanded',
      status: 'completed',
      metadata: { subscriptionId: 'sub_expanded' },
    })

    subscriptionsRetrieveMock.mockResolvedValue({
      id: 'sub_expanded',
      customer: { id: 'cus_from_object', object: 'customer' },
    })
    billingPortalCreateMock.mockResolvedValue({ url: 'https://billing.stripe.com/session/exp' })

    const res = await postPortal(app, {})

    expect(res.status).toBe(200)
    expect(billingPortalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_from_object',
      return_url: 'https://app.example.com',
    })
  })

  it('returns 404 when the Stripe subscription cannot be retrieved', async () => {
    await Payment.create({
      projectId: 'ezbill',
      projectName: 'EZBill',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user-1',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_sub_gone',
      status: 'completed',
      metadata: { subscriptionId: 'sub_gone' },
    })

    subscriptionsRetrieveMock.mockRejectedValue(new Error('No such subscription'))

    const res = await postPortal(app, {})
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(billingPortalCreateMock).not.toHaveBeenCalled()
  })

  it('returns 500 when Stripe billing portal creation fails', async () => {
    await Payment.create({
      projectId: 'ezbill',
      projectName: 'EZBill',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user-1',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_sub_err',
      status: 'completed',
      metadata: { subscriptionId: 'sub_err' },
    })
    subscriptionsRetrieveMock.mockResolvedValue({ id: 'sub_err', customer: 'cus_err_1' })
    billingPortalCreateMock.mockRejectedValue(new Error('Stripe down'))

    const res = await postPortal(app, { customerId: 'cus_err_1' })
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
  })
})
