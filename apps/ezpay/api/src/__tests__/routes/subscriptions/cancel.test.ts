/**
 * Tests for POST /api/subscriptions/:subscriptionId/cancel.
 *
 * Focus: ownership + tenant scoping (Wave E finding C-3). The subscriber may
 * cancel their own subscription. Otherwise the caller must be a superadmin OR
 * an admin of the Application the subscription belongs to — a binary admin
 * gate previously let an admin of app X cancel a subscription of tenant Y.
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

const cancelSubscriptionMock = vi.fn()

vi.mock('../../../services/stripe.js', () => ({
  getProviderForRequest: () => ({ cancelSubscription: cancelSubscriptionMock }),
  resolveRequestMode: (req: { derivedMode?: string }) =>
    req.derivedMode === 'test' ? 'test' : 'live',
  isStripeModeUnavailableError: () => false,
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
  isAdminUser: (req: express.Request): boolean => {
    const user = req.user as { globalRoles?: string[]; appRoles?: Record<string, string[]> }
    if (user?.globalRoles?.some(r => r === 'superadmin' || r === 'admin')) return true
    return Object.values(user?.appRoles ?? {}).some(roles => roles.includes('admin'))
  },
}))

let ownedSlugs: string[] = []
vi.mock('../../../services/ezauth-client.js', () => ({
  listApplicationsByOwner: () => Promise.resolve(ownedSlugs.map(slug => ({ slug }))),
}))

const routeMod = await import('../../../routes/subscriptions/cancel.js')

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

async function postCancel(app: Express, subscriptionId: string): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      fetch(`http://127.0.0.1:${address.port}/subscriptions/${subscriptionId}/cancel`, {
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

describe('POST /subscriptions/:subscriptionId/cancel — ownership + tenant scoping', () => {
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
    cancelSubscriptionMock.mockReset()
    cancelSubscriptionMock.mockResolvedValue(undefined)
    currentUserId = 'owner-1'
    currentGlobalRoles = []
    currentAppRoles = {}
    ownedSlugs = []
  })

  async function seedSubscription(projectId: string, ownerUserId: string): Promise<string> {
    await Payment.create({
      projectId,
      projectName: projectId,
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: ownerUserId,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: `cs_${projectId}_sub`,
      status: 'completed',
      liveMode: false,
      metadata: { subscriptionId: `sub_${projectId}` },
    })
    return `sub_${projectId}`
  }

  it('lets the subscriber cancel their own subscription', async () => {
    const subId = await seedSubscription('tenant-x', 'owner-1')
    const res = await postCancel(app, subId)
    expect(res.status).toBe(200)
    expect(cancelSubscriptionMock).toHaveBeenCalledWith(subId)
  })

  it('returns 404 when the subscription is not found', async () => {
    const res = await postCancel(app, 'sub_missing')
    expect(res.status).toBe(404)
    expect(cancelSubscriptionMock).not.toHaveBeenCalled()
  })

  it('returns 403 when a plain user tries to cancel another user’s subscription', async () => {
    const subId = await seedSubscription('tenant-x', 'victim')
    currentUserId = 'attacker'
    const res = await postCancel(app, subId)
    expect(res.status).toBe(403)
    expect(cancelSubscriptionMock).not.toHaveBeenCalled()
  })

  it('refuses (403) an app admin cancelling ANOTHER tenant’s subscription — cross-tenant', async () => {
    const subId = await seedSubscription('tenant-y', 'victim')
    currentUserId = 'admin-x'
    currentAppRoles = { 'tenant-x': ['admin'] }
    ownedSlugs = ['tenant-x']

    const res = await postCancel(app, subId)

    expect(res.status).toBe(403)
    expect(cancelSubscriptionMock).not.toHaveBeenCalled()
  })

  it('allows an app admin to cancel a subscription of an Application they own', async () => {
    const subId = await seedSubscription('tenant-x', 'some-user')
    currentUserId = 'admin-x'
    currentAppRoles = { 'tenant-x': ['admin'] }
    ownedSlugs = ['tenant-x']

    const res = await postCancel(app, subId)

    expect(res.status).toBe(200)
    expect(cancelSubscriptionMock).toHaveBeenCalledWith(subId)
  })

  it('allows a superadmin to cancel any tenant’s subscription', async () => {
    const subId = await seedSubscription('tenant-y', 'some-user')
    currentUserId = 'root'
    currentGlobalRoles = ['superadmin']
    ownedSlugs = []

    const res = await postCancel(app, subId)

    expect(res.status).toBe(200)
    expect(cancelSubscriptionMock).toHaveBeenCalledWith(subId)
  })
})
