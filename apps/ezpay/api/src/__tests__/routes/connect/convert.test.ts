/**
 * Tests for PATCH /api/connect/accounts/:applicationId — switchability route.
 *
 * The route is superadmin-only and writes audit metadata
 * (previousStripeAccountId, transitionedAt, transitionedBy) on every transition.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../../models/ConnectedAccount.js'
import type { Model } from 'mongoose'

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

// Dynamic import AFTER mocks so the route binds the mocked middleware.
const convertRouteMod = await import('../../../routes/connect/convert.js')

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api', convertRouteMod.default)
  return app
}

interface TestResponse {
  status: number
  body: { success: boolean; data?: Record<string, unknown>; error?: unknown }
}

async function patchConvert(
  app: Express,
  applicationId: string,
  body: Record<string, unknown>
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
      fetch(`http://127.0.0.1:${port}/api/connect/accounts/${encodeURIComponent(applicationId)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer fake-jwt',
        },
        body: httpBody,
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

describe('PATCH /api/connect/accounts/:applicationId — convert', () => {
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
  })

  beforeEach(async () => {
    await ConnectedAccount.deleteMany({})
    currentUserId = 'user-1'
    currentGlobalRoles = []
  })

  it('returns 401 when caller is not authenticated', async () => {
    currentUserId = undefined
    const res = await patchConvert(app, 'app-1', {
      stripeAccountId: 'acct_new',
      isPlatformAccount: false,
    })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('returns 403 when caller is not superadmin', async () => {
    currentGlobalRoles = ['admin']
    const res = await patchConvert(app, 'app-1', {
      stripeAccountId: 'acct_new',
      isPlatformAccount: false,
    })
    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  it('returns 404 when the applicationId does not exist', async () => {
    currentGlobalRoles = ['superadmin']
    const res = await patchConvert(app, 'app-missing', {
      stripeAccountId: 'acct_new',
      isPlatformAccount: false,
    })
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('returns 422 (validation) when body is invalid — missing stripeAccountId', async () => {
    currentGlobalRoles = ['superadmin']
    const res = await patchConvert(app, 'app-x', { isPlatformAccount: false })
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })

  it('returns 422 (validation) when stripeAccountId does not start with acct_', async () => {
    currentGlobalRoles = ['superadmin']
    const res = await patchConvert(app, 'app-x', {
      stripeAccountId: 'invalid_prefix',
      isPlatformAccount: false,
    })
    expect([400, 422]).toContain(res.status)
  })

  it('returns 422 (validation) when isPlatformAccount is missing', async () => {
    currentGlobalRoles = ['superadmin']
    const res = await patchConvert(app, 'app-x', { stripeAccountId: 'acct_new' })
    expect([400, 422]).toContain(res.status)
  })

  it('superadmin: converts a platform account to external and persists audit metadata', async () => {
    currentGlobalRoles = ['superadmin']

    await ConnectedAccount.create({
      applicationId: 'app-convert-1',
      userId: 'system',
      isPlatformAccount: true,
      stripeAccountId: 'acct_platform_shared',
      email: 'platform@ezstart.dev',
      businessName: 'Platform',
      accountType: 'standard',
      status: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
      defaultFeePercent: 0,
    })

    const res = await patchConvert(app, 'app-convert-1', {
      stripeAccountId: 'acct_new_external',
      isPlatformAccount: false,
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const updated = await ConnectedAccount.findOne({ applicationId: 'app-convert-1' }).lean()
    expect(updated?.stripeAccountId).toBe('acct_new_external')
    expect(updated?.isPlatformAccount).toBe(false)
    expect(updated?.metadata?.previousStripeAccountId).toBe('acct_platform_shared')
    expect(updated?.metadata?.transitionedBy).toBe('user-1')
    expect(updated?.metadata?.transitionedAt).toBeInstanceOf(Date)
  })

  it('superadmin: converts an external account back to platform', async () => {
    currentGlobalRoles = ['superadmin']

    await ConnectedAccount.create({
      applicationId: 'app-convert-2',
      userId: 'owner-x',
      isPlatformAccount: false,
      stripeAccountId: 'acct_external_x',
      email: 'x@example.com',
      businessName: 'X',
      accountType: 'standard',
      status: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
    })

    const res = await patchConvert(app, 'app-convert-2', {
      stripeAccountId: 'acct_platform_shared',
      isPlatformAccount: true,
    })

    expect(res.status).toBe(200)

    const updated = await ConnectedAccount.findOne({ applicationId: 'app-convert-2' }).lean()
    expect(updated?.isPlatformAccount).toBe(true)
    expect(updated?.stripeAccountId).toBe('acct_platform_shared')
    expect(updated?.metadata?.previousStripeAccountId).toBe('acct_external_x')
  })
})
