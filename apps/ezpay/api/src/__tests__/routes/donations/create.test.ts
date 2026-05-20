/**
 * Wave E Lot 1A — security tests for POST /donate.
 *
 * Covers:
 *  - C-1 (donation variant) bounded amount validation: negative / zero /
 *    over-max / non-finite / disallowed currency → rejected before Stripe.
 *  - C-3 tenant gate: a Bearer caller cannot donate "as" an Application they
 *    do not own → 403; an anonymous donor CAN donate to an existing + active
 *    Application.
 *  - Rate limit: the strict limiter mounted on the route triggers a 429 after
 *    the per-bucket budget is exhausted.
 *
 * Provider, ezauth-client, connect-fee and auth middleware are mocked.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { createStrictRateLimiter } from '@ezstart/api-core'
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
// Donations use authOptionalJwtOrKey — anonymous callers are allowed through.
let currentUserId: string | undefined
let currentGlobalRoles: string[] = []
let currentApiKeyApplicationId: string | undefined

vi.mock('../../../middleware/auth.js', () => ({
  isAdminUser: (req: express.Request): boolean =>
    (req.user?.globalRoles as string[] | undefined)?.includes('superadmin') ?? false,
}))

vi.mock('../../../middleware/unified-auth.js', () => ({
  authOptionalJwtOrKey:
    () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (currentApiKeyApplicationId) {
        req.apiKeyApplicationId = currentApiKeyApplicationId
        req.userId = currentUserId
      } else if (currentUserId) {
        req.userId = currentUserId
        ;(req as unknown as { user: Record<string, unknown> }).user = {
          userId: currentUserId,
          globalRoles: currentGlobalRoles,
        }
      }
      next()
    },
}))

const routeMod = await import('../../../routes/donations/create.js')

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

async function postDonate(
  app: Express,
  body: Record<string, unknown>,
  origin = 'https://consumer.example.com'
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
      fetch(`http://127.0.0.1:${port}/donate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
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

describe('POST /donate — bounded amount + tenant gate (Wave E 1A)', () => {
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
      sessionId: 'cs_donate_test',
      url: 'https://stripe.test/cs',
    })
    getApplicationMock.mockClear()
    currentUserId = undefined
    currentGlobalRoles = []
    currentApiKeyApplicationId = undefined
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

  // --- bounded amount --------------------------------------------------------

  // The bounded-amount rejections surface as 422 validation errors
  // (`sendValidationError`) — the route never forwards the request to Stripe.

  it('rejects a negative amount', async () => {
    const res = await postDonate(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      amount: -50,
    })
    expect(res.status).toBe(422)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('rejects an amount above the server ceiling', async () => {
    const res = await postDonate(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      amount: 1_000_000,
    })
    expect(res.status).toBe(422)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('rejects a sub-minimum amount', async () => {
    const res = await postDonate(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      amount: 0.5,
    })
    expect(res.status).toBe(422)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('rejects a disallowed currency', async () => {
    const res = await postDonate(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      amount: 10,
      currency: 'btc',
    })
    expect(res.status).toBe(422)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('rejects a non-finite amount at the Zod layer', async () => {
    // JSON cannot carry NaN, so we send the string "NaN" which fails z.number().
    const res = await postDonate(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      amount: 'NaN',
    })
    expect(res.status).toBe(422)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('accepts a valid bounded donation from an anonymous donor to an active app', async () => {
    const res = await postDonate(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      amount: 25,
      currency: 'EUR',
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const firstCall = createCheckoutSessionMock.mock.calls[0]
    if (!firstCall) throw new Error('provider was not called')
    const opts = firstCall[0] as { amount: number; currency: string }
    expect(opts.amount).toBe(25)
    expect(opts.currency).toBe('eur')
    expect(res.body.data?.payment?.amount).toBe(25)
  })

  // --- tenant gate -----------------------------------------------------------

  it('returns 404 when an anonymous donor targets a non-existent app', async () => {
    mockApplication = null
    const res = await postDonate(app, {
      projectId: 'myapp',
      applicationId: 'ghost-app',
      amount: 10,
    })
    expect(res.status).toBe(404)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('returns 403 when a Bearer caller donates against an app they do not own', async () => {
    currentUserId = 'attacker'
    mockApplication = {
      id: 'app-1',
      slug: 'myapp',
      name: 'My App',
      ownerId: 'real-owner',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const res = await postDonate(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      amount: 10,
    })
    expect(res.status).toBe(403)
    expect(createCheckoutSessionMock).not.toHaveBeenCalled()
  })

  it('allows the owner (Bearer) to donate against their own app', async () => {
    currentUserId = 'user-1' // matches mockApplication.ownerId
    const res = await postDonate(app, {
      projectId: 'myapp',
      applicationId: 'app-1',
      amount: 10,
    })
    expect(res.status).toBe(200)
    expect(createCheckoutSessionMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Rate limit — verified directly against the strict limiter the routes mount.
// The route-level limiter is disabled under NODE_ENV=test (shared loopback IP
// would self-throttle the suite), so we assert the limiter behaviour itself
// on a dedicated app instance with it enabled.
// ---------------------------------------------------------------------------
describe('strict checkout rate limiter (Wave E 1A)', () => {
  function createRateLimitedApp(): Express {
    const app = express()
    app.use(express.json())
    app.use(createStrictRateLimiter())
    app.post('/create', (_req, res) => {
      res.status(200).json({ success: true })
    })
    return app
  }

  async function hit(app: Express): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = app.listen(0, () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          reject(new Error('server address unavailable'))
          return
        }
        fetch(`http://127.0.0.1:${address.port}/create`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
          .then(r => {
            server.close()
            resolve(r.status)
          })
          .catch(err => {
            server.close()
            reject(err)
          })
      })
    })
  }

  it('returns 429 after the per-bucket budget (5 / min) is exhausted', async () => {
    const app = createRateLimitedApp()
    const statuses: number[] = []
    // 6 requests from the same loopback IP → first 5 pass, 6th is throttled.
    for (let i = 0; i < 6; i++) {
      statuses.push(await hit(app))
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(statuses[5]).toBe(429)
  })
})
