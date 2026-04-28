/**
 * Integration tests for GET /api/payments — focus on the `applicationId`
 * filter combined with the RBAC scope (prevents BillingDashboard cross-app
 * leaks).
 *
 * Strategy: mount the route with mocked auth middleware + mocked
 * ezauth-client.getApplication so the route resolves applicationId→slug
 * deterministically without network calls.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { getPaymentModel, type PaymentDocument } from '../../../models/Payment.js'
import type { Model } from 'mongoose'

// Mutable test state for the auth mock.
let currentUserId: string | undefined = 'user-1'
let currentGlobalRoles: string[] = []

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
      }
    }
    next()
  },
  isAdminUser: (req: express.Request): boolean => {
    return (req.user?.globalRoles as string[] | undefined)?.includes('superadmin') ?? false
  },
}))

// Mock ezauth-client so the route doesn't try to reach a real ezauth API.
const mockGetApplication = vi.fn()
const mockListApplicationsByOwner = vi.fn()
vi.mock('../../../services/ezauth-client.js', () => ({
  getApplication: (...args: unknown[]) => mockGetApplication(...args),
  listApplicationsByOwner: (...args: unknown[]) => mockListApplicationsByOwner(...args),
}))

// Dynamic import AFTER mocks so the route binds the mocked middleware.
const listRouteMod = await import('../../../routes/payments/list.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api', listRouteMod.default)
  return app
}

interface ListResponse {
  status: number
  body: {
    success: boolean
    data?: Array<{ _id: string; projectId: string; userId?: string }>
    meta?: { total: number; limit: number; offset: number }
    error?: string
  }
}

async function getList(app: Express, query: Record<string, string>): Promise<ListResponse> {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(query).toString()
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      fetch(`http://127.0.0.1:${port}/api/payments${qs ? `?${qs}` : ''}`, {
        headers: { 'content-type': 'application/json' },
      })
        .then(async res => {
          const body = (await res.json()) as ListResponse['body']
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

describe('GET /api/payments — applicationId × scope filter', () => {
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
    mockGetApplication.mockReset()
    mockListApplicationsByOwner.mockReset()
  })

  async function seedCrossAppPayments() {
    await Payment.create([
      {
        projectId: 'ezauth',
        projectName: 'ezauth',
        type: 'subscription',
        amount: 10,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_ezauth_u1_1',
        status: 'completed',
        userId: 'user-1',
        isAnonymous: false,
        liveMode: false,
      },
      {
        projectId: 'ezauth',
        projectName: 'ezauth',
        type: 'subscription',
        amount: 10,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_ezauth_u2',
        status: 'completed',
        userId: 'user-2',
        isAnonymous: false,
        liveMode: false,
      },
      {
        projectId: 'ezpay',
        projectName: 'ezpay',
        type: 'subscription',
        amount: 20,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_ezpay_u1_1',
        status: 'completed',
        userId: 'user-1',
        isAnonymous: false,
        liveMode: false,
      },
    ])
  }

  it('combines applicationId + scope=mine so user sees only their own payments on that app', async () => {
    await seedCrossAppPayments()
    // scope defaults to `mine` for non-admin. applicationId=app_ezauth resolves
    // to slug `ezauth`. Expected: only user-1's ezauth payment (not ezpay, not user-2).
    mockGetApplication.mockResolvedValueOnce({
      id: 'app_ezauth',
      slug: 'ezauth',
      name: 'EZAuth',
      ownerId: 'owner-1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    const res = await getList(app, { applicationId: 'app_ezauth' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data?.[0]?.projectId).toBe('ezauth')
    expect(res.body.data?.[0]?.userId).toBe('user-1')
  })

  it('keeps superadmin scoped to the requested applicationId (auto-derived scope=all does NOT widen past app)', async () => {
    await seedCrossAppPayments()
    currentGlobalRoles = ['superadmin']
    mockGetApplication.mockResolvedValueOnce({
      id: 'app_ezauth',
      slug: 'ezauth',
      name: 'EZAuth',
      ownerId: 'owner-1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    // No ?scope= passed — server auto-derives 'all' from superadmin role.
    const res = await getList(app, { applicationId: 'app_ezauth' })

    expect(res.status).toBe(200)
    // superadmin (auto-scoped to all) + applicationId filter → projectId=ezauth only
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data?.every(p => p.projectId === 'ezauth')).toBe(true)
  })

  it('fails closed (returns empty list) when ezauth cannot resolve the applicationId', async () => {
    await seedCrossAppPayments()
    mockGetApplication.mockResolvedValueOnce(null)

    const res = await getList(app, { applicationId: 'app_unknown' })

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta?.total).toBe(0)
  })

  it('returns empty list when applicationId and projectId contradict', async () => {
    await seedCrossAppPayments()
    mockGetApplication.mockResolvedValueOnce({
      id: 'app_ezauth',
      slug: 'ezauth',
      name: 'EZAuth',
      ownerId: 'owner-1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    const res = await getList(app, {
      applicationId: 'app_ezauth',
      projectId: 'ezpay', // contradicts the resolved slug `ezauth`
    })

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('preserves legacy behaviour when no applicationId is provided (scope=mine returns user-1 across apps)', async () => {
    await seedCrossAppPayments()

    const res = await getList(app, {})

    expect(res.status).toBe(200)
    // scope=mine by default for non-admin → all payments for user-1 across any app
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data?.every(p => p.userId === 'user-1')).toBe(true)
  })
})
