/**
 * Tests for POST /api/verify-payment/:sessionId.
 *
 * Focus: IDOR + PII exposure (Wave E finding). The route is intentionally
 * anonymous (it is hit on the post-checkout browser redirect, which may carry
 * no session for an anonymous donor). The fix scopes the response: only the
 * payment owner / app admin / superadmin receives the full document; everyone
 * else (anonymous, unrelated user) receives a minimal, non-PII projection.
 *
 * Stripe + the tenant-ownership lookup are mocked; MongoMemoryServer backs the
 * Payment model.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import type { Model } from 'mongoose'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'

const verifyPaymentMock = vi.fn()

vi.mock('../../../services/stripe.js', () => ({
  getProvider: () => ({ verifyPayment: verifyPaymentMock }),
}))

// Auth state — undefined userId simulates an anonymous post-checkout redirect.
let currentUserId: string | undefined
let currentGlobalRoles: string[] = []
let currentAppRoles: Record<string, string[]> = {}

vi.mock('../../../middleware/auth.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (currentUserId) req.userId = currentUserId
    next()
  },
  optionalAuthMiddleware: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => {
    if (currentUserId) req.userId = currentUserId
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
  isAdminUser: () => false,
}))

let ownedSlugs: string[] = []
vi.mock('../../../services/ezauth-client.js', () => ({
  listApplicationsByOwner: () => Promise.resolve(ownedSlugs.map(slug => ({ slug }))),
}))

const routeMod = await import('../../../routes/donations/verify.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', routeMod.default)
  return app
}

interface TestResponse {
  status: number
  body: { success?: boolean; data?: Record<string, unknown>; error?: unknown }
}

async function postVerify(
  app: Express,
  sessionId: string,
  authenticated: boolean
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      // Only attach a JWT when we want the optional-auth path to authenticate.
      if (authenticated) headers.authorization = 'Bearer fake-jwt'
      fetch(`http://127.0.0.1:${address.port}/verify-payment/${sessionId}`, {
        method: 'POST',
        headers,
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

describe('POST /verify-payment/:sessionId — IDOR / PII scoping', () => {
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
    verifyPaymentMock.mockReset()
    currentUserId = undefined
    currentGlobalRoles = []
    currentAppRoles = {}
    ownedSlugs = []
  })

  async function seedDonation(opts: { status: 'pending' | 'completed'; userId?: string }) {
    return Payment.create({
      projectId: 'tenant-x',
      projectName: 'tenant-x',
      type: 'donation',
      amount: 50,
      currency: 'EUR',
      userId: opts.userId,
      customerName: 'Alice Victim',
      customerEmail: 'alice.victim@example.com',
      isAnonymous: !opts.userId,
      provider: 'stripe',
      paymentId: 'cs_session_1',
      status: opts.status,
      liveMode: false,
      metadata: { message: 'Private donor note', isPublic: false },
    })
  }

  it('returns ONLY a non-PII projection to an anonymous caller (already completed)', async () => {
    await seedDonation({ status: 'completed' })

    const res = await postVerify(app, 'cs_session_1', false)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const data = res.body.data ?? {}
    // Non-PII fields only.
    expect(data.status).toBe('completed')
    expect(data.completed).toBe(true)
    expect(data.paymentId).toBe('cs_session_1')
    // PII must NEVER be present.
    expect(data.customerEmail).toBeUndefined()
    expect(data.customerName).toBeUndefined()
    expect(data.amount).toBeUndefined()
    expect(data.metadata).toBeUndefined()
  })

  it('does not leak PII to an unrelated authenticated user', async () => {
    await seedDonation({ status: 'completed', userId: 'owner-1' })
    currentUserId = 'someone-else'

    const res = await postVerify(app, 'cs_session_1', true)

    expect(res.status).toBe(200)
    const data = res.body.data ?? {}
    expect(data.customerEmail).toBeUndefined()
    expect(data.customerName).toBeUndefined()
    expect(data.metadata).toBeUndefined()
    expect(data.status).toBe('completed')
  })

  it('returns the FULL payment document to the owner', async () => {
    await seedDonation({ status: 'completed', userId: 'owner-1' })
    currentUserId = 'owner-1'

    const res = await postVerify(app, 'cs_session_1', true)

    expect(res.status).toBe(200)
    const data = res.body.data ?? {}
    expect(data.customerEmail).toBe('alice.victim@example.com')
    expect(data.customerName).toBe('Alice Victim')
    expect(data.amount).toBe(50)
  })

  it('returns the FULL payment document to an app admin who owns the tenant', async () => {
    await seedDonation({ status: 'completed', userId: 'owner-1' })
    currentUserId = 'admin-x'
    currentAppRoles = { 'tenant-x': ['admin'] }
    ownedSlugs = ['tenant-x']

    const res = await postVerify(app, 'cs_session_1', true)

    expect(res.status).toBe(200)
    const data = res.body.data ?? {}
    expect(data.customerEmail).toBe('alice.victim@example.com')
  })

  it('verifies a pending payment and still scopes the response for an anonymous caller', async () => {
    await seedDonation({ status: 'pending' })
    verifyPaymentMock.mockResolvedValue({
      paid: true,
      status: 'paid',
      paymentMethod: 'card',
    })

    const res = await postVerify(app, 'cs_session_1', false)

    expect(res.status).toBe(200)
    const data = res.body.data ?? {}
    expect(data.status).toBe('completed')
    expect(data.completed).toBe(true)
    expect(data.customerEmail).toBeUndefined()
    expect(verifyPaymentMock).toHaveBeenCalledWith('cs_session_1')
  })

  it('returns 404 when the payment does not exist', async () => {
    const res = await postVerify(app, 'cs_unknown', false)
    expect(res.status).toBe(404)
  })

  it('returns 400 when the provider does not confirm the payment', async () => {
    await seedDonation({ status: 'pending' })
    verifyPaymentMock.mockResolvedValue({ paid: false, status: 'unpaid' })

    const res = await postVerify(app, 'cs_session_1', false)
    expect(res.status).toBe(400)
  })
})
