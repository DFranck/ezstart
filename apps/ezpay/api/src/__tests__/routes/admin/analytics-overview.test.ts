/**
 * Integration tests for GET /api/admin/analytics/overview — pay-side
 * analytics with auto-derived RBAC scoping.
 *
 * Strategy mirrors `routes/payments/list.test.ts`: mock auth middleware +
 * ezauth-client so the route resolves scope/owned-apps deterministically
 * without network calls.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'
import type { Model } from 'mongoose'

let currentUserId: string | undefined = 'user-1'
let currentGlobalRoles: string[] = []
let currentAppRoles: Record<string, string[]> = {}

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
        globalRoles: currentGlobalRoles,
        appRoles: currentAppRoles,
      }
    }
    next()
  },
  isAdminUser: (req: express.Request): boolean => {
    return (req.user?.globalRoles as string[] | undefined)?.includes('superadmin') ?? false
  },
}))

const mockListApplicationsByOwner = vi.fn()
vi.mock('../../../services/ezauth-client.js', () => ({
  getApplication: vi.fn(),
  listApplicationsByOwner: (...args: unknown[]) => mockListApplicationsByOwner(...args),
}))

// Dynamic import AFTER mocks so the route binds them.
const adminRouteMod = await import('../../../routes/admin/analytics-overview.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api', adminRouteMod.default)
  return app
}

interface OverviewResponse {
  status: number
  body: {
    success: boolean
    data?: {
      totalRevenueByCurrency: { currency: string; amount: number }[]
      totalPayments: number
      activeSubscriptions: number
      mrrProxy: number
      revenueTrend: { date: string; amount: number; count: number }[]
      topAppsByRevenue: { projectId: string; amount: number; count: number }[]
    }
    error?: string
  }
}

async function getOverview(app: Express): Promise<OverviewResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      fetch(`http://127.0.0.1:${port}/api/admin/analytics/overview`, {
        headers: { 'content-type': 'application/json' },
      })
        .then(async res => {
          const body = (await res.json()) as OverviewResponse['body']
          server.close()
          resolve({ status: res.status, body })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

describe('GET /api/admin/analytics/overview — pay analytics auto-scoping', () => {
  let Payment: Model<PaymentDocument>
  let app: Express

  beforeAll(async () => {
    await setupTestDatabase()
    Payment = await getPaymentModel()
    app = createApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Payment.deleteMany({})
    currentUserId = 'user-1'
    currentGlobalRoles = []
    currentAppRoles = {}
    mockListApplicationsByOwner.mockReset()
  })

  async function seedPayments() {
    await Payment.create([
      // ezauth — 2 completed payments (10 EUR + 10 EUR), 1 monthly sub.
      {
        projectId: 'ezauth',
        projectName: 'ezauth',
        type: 'subscription',
        amount: 10,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_ezauth_1',
        status: 'completed',
        userId: 'user-1',
        isAnonymous: false,
        liveMode: false,
        metadata: { interval: 'month' },
      },
      {
        projectId: 'ezauth',
        projectName: 'ezauth',
        type: 'donation',
        amount: 10,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_ezauth_2',
        status: 'completed',
        userId: 'user-2',
        isAnonymous: false,
        liveMode: false,
      },
      // ezpay — 1 completed sub.
      {
        projectId: 'ezpay',
        projectName: 'ezpay',
        type: 'subscription',
        amount: 20,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_ezpay_1',
        status: 'completed',
        userId: 'user-1',
        isAnonymous: false,
        liveMode: false,
        metadata: { interval: 'month' },
      },
      // green-pulse — 1 pending (excluded), 1 completed in USD.
      {
        projectId: 'green-pulse',
        projectName: 'green-pulse',
        type: 'purchase',
        amount: 50,
        currency: 'USD',
        provider: 'stripe',
        paymentId: 'pi_gp_1',
        status: 'completed',
        userId: 'user-3',
        isAnonymous: false,
        liveMode: true,
      },
      {
        projectId: 'green-pulse',
        projectName: 'green-pulse',
        type: 'purchase',
        amount: 99,
        currency: 'USD',
        provider: 'stripe',
        paymentId: 'pi_gp_2',
        status: 'pending',
        userId: 'user-3',
        isAnonymous: false,
        liveMode: true,
      },
    ])
  }

  it('rejects unauthenticated requests with 401', async () => {
    currentUserId = undefined
    const res = await getOverview(app)
    expect(res.status).toBe(401)
  })

  it('rejects regular users with 403 (requireAdmin gate)', async () => {
    const res = await getOverview(app)
    expect(res.status).toBe(403)
  })

  it('superadmin (auto-derived "all") sees platform-wide stats', async () => {
    await seedPayments()
    currentGlobalRoles = ['superadmin']

    const res = await getOverview(app)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const data = res.body.data!

    // 4 completed payments total (1 pending excluded).
    expect(data.totalPayments).toBe(4)
    // EUR: 10+10+20=40 ; USD: 50.
    const eur = data.totalRevenueByCurrency.find(c => c.currency === 'EUR')
    const usd = data.totalRevenueByCurrency.find(c => c.currency === 'USD')
    expect(eur?.amount).toBe(40)
    expect(usd?.amount).toBe(50)
    // 2 active subscriptions (ezauth + ezpay).
    expect(data.activeSubscriptions).toBe(2)
    // MRR proxy: 10 + 20 = 30.
    expect(data.mrrProxy).toBe(30)
    // Trend: 30 contiguous days.
    expect(data.revenueTrend).toHaveLength(30)
    // Top apps: 3 apps with revenue.
    const slugs = data.topAppsByRevenue.map(a => a.projectId)
    expect(slugs).toContain('ezauth')
    expect(slugs).toContain('ezpay')
    expect(slugs).toContain('green-pulse')
  })

  it('app-admin (auto-derived "myApps") sees only their owned apps', async () => {
    await seedPayments()
    currentAppRoles = { ezauth: ['admin'] }
    mockListApplicationsByOwner.mockResolvedValueOnce([
      { id: 'app_ezauth', slug: 'ezauth', name: 'ezauth' },
    ])

    const res = await getOverview(app)
    expect(res.status).toBe(200)
    const data = res.body.data!

    // Only ezauth payments (2 completed) — ezpay/green-pulse hidden.
    expect(data.totalPayments).toBe(2)
    // EUR: 10+10=20 only ; no USD.
    const eur = data.totalRevenueByCurrency.find(c => c.currency === 'EUR')
    expect(eur?.amount).toBe(20)
    expect(data.totalRevenueByCurrency.find(c => c.currency === 'USD')).toBeUndefined()
    // 1 active sub (ezauth only).
    expect(data.activeSubscriptions).toBe(1)
    expect(data.mrrProxy).toBe(10)
    // topAppsByRevenue restricted to ezauth.
    expect(data.topAppsByRevenue.map(a => a.projectId)).toEqual(['ezauth'])
  })

  it('app-admin without owned apps returns zero snapshot', async () => {
    await seedPayments()
    currentAppRoles = { ezauth: ['admin'] }
    mockListApplicationsByOwner.mockResolvedValueOnce([])

    const res = await getOverview(app)
    expect(res.status).toBe(200)
    const data = res.body.data!

    expect(data.totalPayments).toBe(0)
    expect(data.totalRevenueByCurrency).toEqual([])
    expect(data.activeSubscriptions).toBe(0)
    expect(data.mrrProxy).toBe(0)
    expect(data.revenueTrend).toHaveLength(30)
    expect(data.topAppsByRevenue).toEqual([])
  })
})
