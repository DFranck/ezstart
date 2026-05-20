/**
 * Tests for POST /api/payments/:paymentId/refund.
 *
 * Focus: the tenant-ownership gate (Wave E findings C-3 + LOW-a).
 *  - C-3: a binary `isAdminUser` check let an admin of app X refund a payment
 *    belonging to another tenant Y. The handler now resolves tenant access via
 *    `resolveTenantAccess` — an app admin is confined to the Applications they
 *    own, a superadmin keeps platform-wide access.
 *  - LOW-a: the binary `isAdminUser` gate also rejected app-admins BEFORE the
 *    tenant check ran, so an app-admin could not refund payments for their OWN
 *    tenant. The gate is removed; `resolveTenantAccess` is the sole authority.
 *
 * Stripe + the tenant-ownership lookup are mocked so the test is hermetic;
 * MongoMemoryServer backs the Payment model.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import type { Model } from 'mongoose'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the dynamic route import.
// ---------------------------------------------------------------------------

const refundPaymentMock = vi.fn()

vi.mock('../../../services/stripe.js', () => ({
  getProvider: () => ({ refundPayment: refundPaymentMock }),
}))

let currentUserId: string | undefined = 'owner-1'
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
  // `isAdminUser` is no longer consumed by the refund route (LOW-a removed the
  // binary gate). Kept on the mock for shape-completeness so any future
  // import of the auth module resolves; the route's authority is now
  // `resolveTenantAccess` alone.
  isAdminUser: (req: express.Request): boolean => {
    const user = req.user as { globalRoles?: string[]; appRoles?: Record<string, string[]> }
    if (user?.globalRoles?.some(r => r === 'superadmin' || r === 'admin')) return true
    return Object.values(user?.appRoles ?? {}).some(roles => roles.includes('admin'))
  },
}))

// Tenant-ownership resolution — the JWT path consults ezauth for owned apps.
// Mock the owned-app list so the test controls which tenants the caller owns.
let ownedSlugs: string[] = []
vi.mock('../../../services/ezauth-client.js', () => ({
  listApplicationsByOwner: () => Promise.resolve(ownedSlugs.map(slug => ({ slug }))),
}))

const routeMod = await import('../../../routes/payments/refund.js')

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

async function postRefund(app: Express, paymentId: string): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      fetch(`http://127.0.0.1:${address.port}/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer fake-jwt' },
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

describe('POST /payments/:paymentId/refund — tenant ownership', () => {
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
    refundPaymentMock.mockReset()
    refundPaymentMock.mockResolvedValue(undefined)
    currentUserId = 'owner-1'
    currentGlobalRoles = []
    currentAppRoles = {}
    ownedSlugs = []
  })

  async function seedPayment(projectId: string): Promise<PaymentDocument> {
    return Payment.create({
      projectId,
      projectName: projectId,
      type: 'donation',
      amount: 50,
      currency: 'EUR',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: `cs_${projectId}_1`,
      stripePaymentIntentId: `pi_${projectId}_1`,
      status: 'completed',
      liveMode: false,
    })
  }

  it('returns 403 for a plain user who owns no Application (tenant access denied)', async () => {
    const payment = await seedPayment('tenant-x')
    // Plain user: no superadmin, no app-admin role, owns no slug → denied by
    // `resolveTenantAccess` (the binary admin gate no longer exists).
    const res = await postRefund(app, String(payment._id))
    expect(res.status).toBe(403)
    expect(refundPaymentMock).not.toHaveBeenCalled()
  })

  it('refuses (403) an app admin refunding ANOTHER tenant’s payment — cross-tenant escalation', async () => {
    const payment = await seedPayment('tenant-y')
    // Admin of tenant-x (passes binary admin gate) but does NOT own tenant-y.
    currentAppRoles = { 'tenant-x': ['admin'] }
    ownedSlugs = ['tenant-x']

    const res = await postRefund(app, String(payment._id))

    expect(res.status).toBe(403)
    expect(refundPaymentMock).not.toHaveBeenCalled()
    const stillCompleted = await Payment.findById(payment._id)
    expect(stillCompleted?.status).toBe('completed')
  })

  it('allows an app admin to refund a payment of an Application they own', async () => {
    const payment = await seedPayment('tenant-x')
    currentAppRoles = { 'tenant-x': ['admin'] }
    ownedSlugs = ['tenant-x']

    const res = await postRefund(app, String(payment._id))

    expect(res.status).toBe(200)
    expect(refundPaymentMock).toHaveBeenCalledWith('pi_tenant-x_1')
    const refunded = await Payment.findById(payment._id)
    expect(refunded?.status).toBe('refunded')
  })

  it('allows a superadmin to refund any tenant’s payment', async () => {
    const payment = await seedPayment('tenant-y')
    currentGlobalRoles = ['superadmin']
    ownedSlugs = [] // owns nothing — superadmin bypasses tenant scoping

    const res = await postRefund(app, String(payment._id))

    expect(res.status).toBe(200)
    expect(refundPaymentMock).toHaveBeenCalledWith('pi_tenant-y_1')
    const refunded = await Payment.findById(payment._id)
    expect(refunded?.status).toBe('refunded')
  })

  it('returns 404 when the payment does not exist (admin caller)', async () => {
    currentGlobalRoles = ['superadmin']
    const res = await postRefund(app, '507f1f77bcf86cd799439011')
    expect(res.status).toBe(404)
    expect(refundPaymentMock).not.toHaveBeenCalled()
  })
})
