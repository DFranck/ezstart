/**
 * Wave E Lot 1A — security tests for POST /purchase.
 *
 * Covers:
 *  - C-1 price authority: a client-supplied `amount` is IGNORED; the Stripe
 *    checkout uses the server-resolved price from the product catalogue.
 *  - Unknown `productId` → 400.
 *  - C-3 tenant ownership: a Bearer caller cannot purchase against an
 *    Application they do not own → 403.
 *
 * Provider, ezauth-client, connect-fee and auth middleware are mocked.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import type { Model } from 'mongoose'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'
import type { EzauthApplication } from '../../../services/ezauth-client.js'

// --- Provider mock -----------------------------------------------------------
const createCheckoutSessionMock = vi.fn()
vi.mock('../../../services/stripe.js', () => ({
  getProviderForRequest: () => ({
    createCheckoutSession: createCheckoutSessionMock,
  }),
  resolveRequestMode: (req: { derivedMode?: string }) =>
    req.derivedMode === 'test' ? 'test' : 'live',
  isStripeModeUnavailableError: () => false,
}))

// --- ezauth-client mock ------------------------------------------------------
let mockApplication: EzauthApplication | null = null
const getApplicationMock = vi.fn(async () => mockApplication)
vi.mock('../../../services/ezauth-client.js', () => ({
  getApplication: getApplicationMock,
}))

// --- connect-fee mock --------------------------------------------------------
vi.mock('../../../services/connect-fee.js', () => ({
  resolveConnectFee: vi.fn(async () => ({ isConnect: false })),
}))

// --- auth mocks --------------------------------------------------------------
let currentUserId: string | undefined = 'user-1'
let currentGlobalRoles: string[] = []
let currentApiKeyApplicationId: string | undefined
// Email claim carried by the verified JWT (populateUserFromToken → req.user.email).
let currentUserEmail: string | undefined = 'verified@buyer.example.com'
// Email-verification claim (populateUserFromToken → req.user.isVerified).
// Defaults to a verified identity so existing tests persist the token email.
let currentUserIsVerified = true

vi.mock('../../../middleware/auth.js', () => ({
  authMiddleware: (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
        email: currentUserEmail,
        isVerified: currentUserIsVerified,
        globalRoles: currentGlobalRoles,
      }
    }
    next()
  },
  isAdminUser: (req: express.Request): boolean =>
    (req.user?.globalRoles as string[] | undefined)?.includes('superadmin') ?? false,
}))

const routeMod = await import('../../../routes/purchases/create.js')

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
    data?: { payment?: { amount?: number; currency?: string } }
    error?: unknown
  }
}

async function postPurchase(app: Express, body: Record<string, unknown>): Promise<TestResponse> {
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
      fetch(`http://127.0.0.1:${port}/purchase`, {
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

describe('POST /purchase — price authority + tenant ownership (Wave E 1A)', () => {
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
    createCheckoutSessionMock.mockReset()
    createCheckoutSessionMock.mockResolvedValue({
      sessionId: 'cs_purchase_test',
      url: 'https://stripe.test/cs',
    })
    getApplicationMock.mockClear()
    currentUserId = 'user-1'
    currentGlobalRoles = []
    currentApiKeyApplicationId = undefined
    currentUserEmail = 'verified@buyer.example.com'
    currentUserIsVerified = true
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

  it('IGNORES a tampered client amount and charges the catalogue price', async () => {
    // ezpay-test-item is €9.99 (999 cents) in the catalogue.
    const res = await postPurchase(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      productId: 'ezpay-test-item',
      productName: 'Hacked Name',
      amount: 0.01,
      currency: 'btc',
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(createCheckoutSessionMock).toHaveBeenCalledTimes(1)
    const firstCall = createCheckoutSessionMock.mock.calls[0]
    if (!firstCall) throw new Error('provider was not called')
    const opts = firstCall[0] as { amount: number; currency: string }
    expect(opts.amount).toBe(9.99)
    expect(opts.currency).toBe('eur')
    expect(res.body.data?.payment?.amount).toBe(9.99)
  })

  it('resolves the premium pass price independently of the client', async () => {
    const res = await postPurchase(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      productId: 'ezpay-premium-pass',
      amount: 1,
    })
    expect(res.status).toBe(200)
    const firstCall = createCheckoutSessionMock.mock.calls[0]
    if (!firstCall) throw new Error('provider was not called')
    const opts = firstCall[0] as { amount: number }
    expect(opts.amount).toBe(24.99)
  })

  it('returns 400 for an unknown productId', async () => {
    const res = await postPurchase(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      productId: 'does-not-exist',
      amount: 9.99,
    })
    expect(res.status).toBe(400)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('returns 403 when the caller does not own the target Application', async () => {
    mockApplication = {
      id: 'app-1',
      slug: 'myapp',
      name: 'My App',
      ownerId: 'someone-else',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const res = await postPurchase(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      productId: 'ezpay-test-item',
    })
    expect(res.status).toBe(403)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('trusts the API-key-bound Application without an ownership round-trip', async () => {
    currentApiKeyApplicationId = 'app-1'
    currentUserId = 'key-owner'

    const res = await postPurchase(app, {
      projectId: 'myapp',
      productId: 'ezpay-test-item',
    })
    expect(res.status).toBe(200)
    expect(getApplicationMock).not.toHaveBeenCalled()
    expect(createCheckoutSessionMock).toHaveBeenCalledTimes(1)
  })

  // --- Customer email trust boundary (anti dunning-spam) --------------------

  it('IGNORES a body customerEmail and persists the verified identity email (JWT path)', async () => {
    const res = await postPurchase(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      productId: 'ezpay-test-item',
      customerEmail: 'attacker-victim@evil.example.com',
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const payment = await Payment.findOne({ paymentId: 'cs_purchase_test' }).lean()
    expect(payment).not.toBeNull()
    // The verified identity email wins — the attacker-controlled body value
    // must NEVER reach the dunning-spam sink.
    expect(payment?.customerEmail).toBe('verified@buyer.example.com')
    expect(payment?.customerEmail).not.toBe('attacker-victim@evil.example.com')
  })

  it('persists NO email when the JWT carries no email claim (never the body)', async () => {
    currentUserEmail = undefined

    const res = await postPurchase(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      productId: 'ezpay-test-item',
      customerEmail: 'attacker-victim@evil.example.com',
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const payment = await Payment.findOne({ paymentId: 'cs_purchase_test' }).lean()
    expect(payment).not.toBeNull()
    // No email claim on the token → store nothing, never fall back to the body.
    expect(payment?.customerEmail == null).toBe(true)
  })

  it('persists NO email when the JWT email is UNVERIFIED (anti dunning-spam)', async () => {
    // Attacker registered with a victim's email — JWT carries it but
    // isVerified:false. Neither the token email nor the body may be stored.
    currentUserEmail = 'victim@example.com'
    currentUserIsVerified = false

    const res = await postPurchase(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      productId: 'ezpay-test-item',
      customerEmail: 'attacker-victim@evil.example.com',
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const payment = await Payment.findOne({ paymentId: 'cs_purchase_test' }).lean()
    expect(payment).not.toBeNull()
    // Unverified identity → store nothing. The victim must never be mailed.
    expect(payment?.customerEmail == null).toBe(true)
    expect(payment?.customerEmail).not.toBe('victim@example.com')
    expect(payment?.customerEmail).not.toBe('attacker-victim@evil.example.com')
  })
})
