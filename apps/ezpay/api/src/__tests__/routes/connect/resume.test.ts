/**
 * Tests for POST /api/connect/onboarding/resume.
 *
 * Cover the full happy + ACL + lifecycle matrix:
 * - Unauthenticated request rejected (401)
 * - Owner mismatch rejected (403, superadmin bypass works)
 * - Account not found rejected (404)
 * - Non-pending status rejected (409)
 * - Expired (>7d) rejected (410, fail-closed before Stripe call)
 * - Happy path mints accountLinks.create URL + bumps lastResumedAt + audits
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../../models/ConnectedAccount.js'
import type { Model } from 'mongoose'

// Provide JWT_SECRET for connect-state generation.
const TEST_SECRET = 'test-jwt-secret-for-resume-12345'
const originalSecret = process.env.JWT_SECRET
process.env.JWT_SECRET = TEST_SECRET

// Mutable test state for the auth mock.
let currentUserId: string | undefined = 'user-1'
let currentGlobalRoles: string[] = []

vi.mock('../../../middleware/auth.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!currentUserId) {
      _res.status(401).json({ success: false, error: 'Authentication required' })
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

// Mock Stripe so we never make a real network call. Track the call to assert
// the URL was minted with the existing stripeAccountId.
const accountLinksCreateMock = vi.fn()
vi.mock('../../../services/stripe-connect.js', () => ({
  getStripeInstance: () => ({
    accountLinks: {
      create: accountLinksCreateMock,
    },
  }),
}))

// Dynamic import AFTER mocks so the route binds the mocked deps.
const resumeRouteMod = await import('../../../routes/connect/resume.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api', resumeRouteMod.default)
  return app
}

interface TestResponse {
  status: number
  body: {
    success: boolean
    data?: { accountLinkUrl?: string; expiresInMs?: number }
    error?: unknown
  }
}

async function postResume(
  app: Express,
  body: Record<string, unknown>,
  opts?: { skipAuth?: boolean }
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (!opts?.skipAuth) headers.authorization = 'Bearer fake-jwt'
      fetch(`http://127.0.0.1:${port}/api/connect/onboarding/resume`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

describe('POST /api/connect/onboarding/resume', () => {
  let app: Express
  let ConnectedAccount: Model<ConnectedAccountDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    ConnectedAccount = await getConnectedAccountModel()
    try {
      await ConnectedAccount.collection.dropIndexes()
    } catch {
      // ignore
    }
    await ConnectedAccount.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET
    } else {
      process.env.JWT_SECRET = originalSecret
    }
  })

  beforeEach(async () => {
    await ConnectedAccount.deleteMany({})
    currentUserId = 'user-1'
    currentGlobalRoles = []
    accountLinksCreateMock.mockReset()
    accountLinksCreateMock.mockResolvedValue({
      url: 'https://connect.stripe.com/setup/e/acct_pending/test_link',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects unauthenticated request (401)', async () => {
    currentUserId = undefined
    const res = await postResume(app, { connectedAccountId: 'whatever' }, { skipAuth: true })
    expect(res.status).toBe(401)
    expect(accountLinksCreateMock).not.toHaveBeenCalled()
  })

  it('rejects when payload is invalid (422)', async () => {
    const res = await postResume(app, {})
    expect(res.status).toBe(422)
    expect(accountLinksCreateMock).not.toHaveBeenCalled()
  })

  it('rejects when ConnectedAccount does not exist (404)', async () => {
    // Valid 24-char ObjectId-ish but no row exists.
    const res = await postResume(app, { connectedAccountId: '507f1f77bcf86cd799439011' })
    expect(res.status).toBe(404)
    expect(accountLinksCreateMock).not.toHaveBeenCalled()
  })

  it('rejects when caller is not the owner and not superadmin (403)', async () => {
    const acc = await ConnectedAccount.create({
      applicationId: 'app-1',
      userId: 'someone-else',
      isPlatformAccount: false,
      stripeAccountId: 'acct_other',
      email: 'a@example.com',
      businessName: 'A',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    const res = await postResume(app, { connectedAccountId: String(acc._id) })
    expect(res.status).toBe(403)
    expect(accountLinksCreateMock).not.toHaveBeenCalled()
  })

  it('superadmin bypasses ownership check', async () => {
    currentGlobalRoles = ['superadmin']
    const acc = await ConnectedAccount.create({
      applicationId: 'app-1',
      userId: 'someone-else',
      isPlatformAccount: false,
      stripeAccountId: 'acct_other',
      email: 'a@example.com',
      businessName: 'A',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    const res = await postResume(app, { connectedAccountId: String(acc._id) })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data?.accountLinkUrl).toContain('connect.stripe.com')
    expect(accountLinksCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ account: 'acct_other', type: 'account_onboarding' })
    )
  })

  it('rejects when account status !== "pending" (409)', async () => {
    const acc = await ConnectedAccount.create({
      applicationId: 'app-1',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_active',
      email: 'a@example.com',
      businessName: 'A',
      accountType: 'standard',
      status: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
    })
    const res = await postResume(app, { connectedAccountId: String(acc._id) })
    expect(res.status).toBe(409)
    expect(accountLinksCreateMock).not.toHaveBeenCalled()
  })

  it('rejects when row is older than 7 days (410, fail-closed before Stripe)', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-1',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_old',
      email: 'a@example.com',
      businessName: 'A',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    // Force createdAt to a past date — Mongoose timestamps are auto so we
    // override post-create.
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: eightDaysAgo } }
    )

    const res = await postResume(app, { connectedAccountId: String(acc._id) })
    expect(res.status).toBe(410)
    expect(accountLinksCreateMock).not.toHaveBeenCalled()
  })

  it('happy path: mints fresh accountLink + bumps lastResumedAt + returns expiresInMs', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const acc = await ConnectedAccount.create({
      applicationId: 'app-1',
      userId: 'user-1',
      isPlatformAccount: false,
      stripeAccountId: 'acct_pending',
      email: 'a@example.com',
      businessName: 'A',
      accountType: 'standard',
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
    })
    await ConnectedAccount.collection.updateOne(
      { _id: acc._id },
      { $set: { createdAt: threeDaysAgo } }
    )

    const res = await postResume(app, {
      connectedAccountId: String(acc._id),
      locale: 'fr',
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data?.accountLinkUrl).toBe(
      'https://connect.stripe.com/setup/e/acct_pending/test_link'
    )
    expect(res.body.data?.expiresInMs).toBeGreaterThan(0)
    // ~4 days remaining (within 1h tolerance for setup time).
    const expected = SEVEN_DAYS_MS - 3 * 24 * 60 * 60 * 1000
    expect(Math.abs((res.body.data!.expiresInMs as number) - expected)).toBeLessThan(60 * 60 * 1000)

    // Stripe was called with the EXISTING stripeAccountId (not a new one).
    expect(accountLinksCreateMock).toHaveBeenCalledTimes(1)
    expect(accountLinksCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'acct_pending',
        type: 'account_onboarding',
      })
    )
    const callArgs = accountLinksCreateMock.mock.calls[0]?.[0] as {
      refresh_url: string
      return_url: string
    }
    expect(callArgs.refresh_url).toContain('locale=fr')
    expect(callArgs.refresh_url).toContain('account_id=acct_pending')

    // Persistence: lastResumedAt is now set.
    const reloaded = await ConnectedAccount.findById(acc._id).lean()
    expect(reloaded?.lastResumedAt).toBeInstanceOf(Date)
  })
})
