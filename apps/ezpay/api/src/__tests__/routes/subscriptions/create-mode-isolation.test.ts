/**
 * Wave E MED-2 — test/live WRITE isolation for POST /subscribe.
 *
 * Proves the core fix: the persisted `Payment.isTestMode` / `liveMode` and the
 * selected Stripe provider are driven by the CALLER's derived mode
 * (`req.derivedMode`), NOT by the process `STRIPE_SECRET_KEY` prefix.
 *
 * Scenarios:
 *  (a) test key (`derivedMode='test'`) → provider requested for 'test' mode +
 *      `isTestMode: true` persisted.
 *  (b) live key (`derivedMode='live'`) → provider requested for 'live' mode +
 *      `isTestMode: false` persisted.
 *  (c) test key whose mode has NO Stripe key → 503, no charge, no row.
 *
 * The REAL `resolveRequestMode` + `isStripeModeUnavailableError` are used (only
 * `getProviderForRequest` is stubbed) so the actual mode-derivation logic of
 * the route is under test.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import type { Model, Types } from 'mongoose'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'
import { getPlanModel, type PlanDocument } from '../../../models/Plan.js'
import type { EzauthApplication } from '../../../services/ezauth-client.js'
import { StripeModeUnavailableError } from '../../../services/stripe.js'

// --- Provider mock: real mode logic, stubbed provider selection -------------
const createSubscriptionCheckoutMock = vi.fn()
// When set, getProviderForRequest throws this for the matching mode (fail-safe).
let unavailableMode: 'test' | 'live' | null = null
// Records the mode the route resolved for the provider selection.
let lastRequestedMode: 'test' | 'live' | undefined

vi.mock('../../../services/stripe.js', async () => {
  const actual = await vi.importActual<typeof import('../../../services/stripe.js')>(
    '../../../services/stripe.js'
  )
  return {
    ...actual,
    getProviderForRequest: (req: { derivedMode?: string }) => {
      lastRequestedMode = req.derivedMode === 'test' ? 'test' : 'live'
      if (unavailableMode && lastRequestedMode === unavailableMode) {
        throw new StripeModeUnavailableError(unavailableMode, 'STRIPE_TEST_SECRET_KEY')
      }
      return { createSubscriptionCheckout: createSubscriptionCheckoutMock }
    },
  }
})

// --- ezauth-client mock (ownership source-of-truth) --------------------------
let mockApplication: EzauthApplication | null = null
vi.mock('../../../services/ezauth-client.js', () => ({
  getApplication: vi.fn(async () => mockApplication),
}))

// --- connect-fee mock --------------------------------------------------------
vi.mock('../../../services/connect-fee.js', () => ({
  resolveConnectFee: vi.fn(async () => ({ isConnect: false })),
}))

// --- auth mock — controls req.userId AND req.derivedMode ---------------------
let currentUserId: string | undefined = 'user-1'
let currentDerivedMode: 'test' | 'live' = 'live'

vi.mock('../../../middleware/auth.js', () => ({
  isAdminUser: () => false,
}))

vi.mock('../../../middleware/unified-auth.js', () => ({
  authJwtOrKey: () => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!currentUserId) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }
    req.userId = currentUserId
    // Simulate api-core `attachDerivedMode` stamping the mode from the key.
    req.derivedMode = currentDerivedMode
    ;(req as unknown as { user: Record<string, unknown> }).user = {
      userId: currentUserId,
      globalRoles: [],
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
    data?: { payment?: { isTestMode?: boolean; liveMode?: boolean } }
    error?: unknown
  }
}

async function postSubscribe(app: Express, body: Record<string, unknown>): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const httpBody = JSON.stringify({ returnUrl: 'https://consumer.example.com', ...body })
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      fetch(`http://127.0.0.1:${address.port}/subscribe`, {
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

describe('POST /subscribe — test/live WRITE isolation (Wave E MED-2)', () => {
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
      sessionId: 'cs_iso_test',
      url: 'https://stripe.test/cs',
    })
    currentUserId = 'user-1'
    currentDerivedMode = 'live'
    unavailableMode = null
    lastRequestedMode = undefined
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
      amount: 4900,
      currency: 'eur',
      interval: 'month',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_pro',
      stripePriceId: 'price_pro',
    })
    return plan._id as Types.ObjectId
  }

  it('(a) a TEST key persists isTestMode:true + selects the test provider', async () => {
    const planId = await seedPlan()
    currentDerivedMode = 'test'

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(planId),
    })

    expect(res.status).toBe(200)
    expect(lastRequestedMode).toBe('test')
    expect(res.body.data?.payment?.isTestMode).toBe(true)
    expect(res.body.data?.payment?.liveMode).toBe(false)

    // The persisted row carries the test partition flag. (No request context
    // is active during this assertion, so the scope plugin is a no-op.)
    const testRows = await Payment.find({ isTestMode: true })
    expect(testRows).toHaveLength(1)
    const liveRows = await Payment.find({ isTestMode: false })
    expect(liveRows).toHaveLength(0)
  })

  it('(b) a LIVE key persists isTestMode:false + selects the live provider', async () => {
    const planId = await seedPlan()
    currentDerivedMode = 'live'

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(planId),
    })

    expect(res.status).toBe(200)
    expect(lastRequestedMode).toBe('live')
    expect(res.body.data?.payment?.isTestMode).toBe(false)
    expect(res.body.data?.payment?.liveMode).toBe(true)
  })

  it('(c) a TEST key with NO test Stripe key → 503, no charge, no row', async () => {
    const planId = await seedPlan()
    currentDerivedMode = 'test'
    unavailableMode = 'test' // simulate STRIPE_TEST_SECRET_KEY missing

    const res = await postSubscribe(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      planId: String(planId),
    })

    // Fail-closed: 503, never a live charge, never a persisted row.
    expect(res.status).toBe(503)
    expect(createSubscriptionCheckoutMock).not.toHaveBeenCalled()
    const allRows = await Payment.find({})
    expect(allRows).toHaveLength(0)
  })
})
