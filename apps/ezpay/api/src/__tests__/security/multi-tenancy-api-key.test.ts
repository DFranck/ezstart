/**
 * P0 multi-tenancy regression test — admin API key scope leak (2026-05-01).
 *
 * **Bug context** (HACKER_V2 finding, `tmp/hack-pre-push-2026-05-01-V2.md`)
 *
 * When an admin API key (`ez_sk_live_*` with `scope='admin'`) bound to slug
 * `slug-acme` hit the WAVE4-wired routes (`/api/payments`, `/api/subscriptions`,
 * `/api/admin/analytics/overview`), the per-route `buildScopeFilter` (or its
 * inline equivalent in analytics) called
 * `listApplicationsByOwner({ bearerToken: undefined })`. There is no Bearer
 * token on the API-key path, so the helper silently fell back to
 * `EZPAY_SERVER_EZAUTH_KEY` (the platform superadmin S2S key). That key
 * resolved to slugs OWNED BY THE PLATFORM SERVER (typically `ezpay` plus
 * other internal apps), not by the actual key owner — so the resulting
 * `$or: [{ userId }, { projectId: { $in: ownedSlugs } }]` filter widened
 * the result set to slugs the API key had no business reading.
 *
 * **Fix** (this commit)
 *
 * Each scope-resolution site short-circuits BEFORE calling
 * `listApplicationsByOwner` when `req.apiKeyAppSlug` is set and not `'*'`.
 * The bound slug is used directly. JWT cookie path is unchanged (legitimate
 * cross-service owner lookup).
 *
 * **What this test proves**
 *
 * - Admin API key bound to `slug-acme` → list payments/subs returns ONLY
 *   `slug-acme` rows. ZERO rows from `slug-other` (or any other slug).
 * - Admin API key bound to `slug-acme` → analytics overview aggregates ONLY
 *   `slug-acme` data. ZERO contribution from `slug-other`.
 * - The `listApplicationsByOwner` helper is NEVER called on the API-key path
 *   (asserted via mock spy) — proving the short-circuit fired.
 * - JWT auth path is regression-tested too: a bearer token still triggers
 *   the legitimate cross-service lookup (mock returns slugs, handler honours
 *   them).
 *
 * **Test-mode mock rationale**
 *
 * The fallback `EZPAY_SERVER_EZAUTH_KEY` would, in production, return slugs
 * the platform server owns. We mock `listApplicationsByOwner` to return
 * `[slug-other, ezpay]` to SIMULATE that bug-trigger payload. If the fix
 * regresses, the handler will pick up `slug-other` (or `ezpay`) and the
 * assertions below will fail loudly. The mock receiving zero calls on the
 * API-key path is the canonical signal that the short-circuit fired.
 *
 * @module apps/ezpay/api/src/__tests__/security/multi-tenancy-api-key
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express, { type Express } from 'express'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import { getApiKeyModel, type ApiKeyDocument } from '../../models/api-key.js'
import { getApiKeyUsageModel, type ApiKeyUsageDocument } from '../../models/api-key-usage.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'
import type { Model } from 'mongoose'

// --- ezauth-client mock --------------------------------------------------
//
// Spy on `listApplicationsByOwner` to assert (a) it's NEVER called on the
// API-key path, and (b) when it IS called on the JWT path, the returned
// slugs are honoured. Default implementation returns the bug-trigger
// payload (`['slug-other', 'ezpay']`) — slugs the API key has no business
// reading. If the short-circuit regresses, the handler will pick these up
// and tests will fail.
type SlugRecord = { id: string; slug: string; name: string }
const mockListApplicationsByOwner = vi.fn<(...args: unknown[]) => Promise<SlugRecord[]>>(
  async () => [
    { id: 'app_other', slug: 'slug-other', name: 'Other Tenant' },
    { id: 'app_ezpay', slug: 'ezpay', name: 'EZPay Internal' },
  ]
)
const mockGetApplication = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('../../services/ezauth-client.js', () => ({
  listApplicationsByOwner: (...args: unknown[]) => mockListApplicationsByOwner(...args),
  getApplication: (...args: unknown[]) => mockGetApplication(...args),
}))

// --- JWT_SECRET bootstrap (required by unified-auth) ---------------------
// MUST match the secret used by other test files that exercise the same
// `createApiAuth()` module-level singleton (vitest may cache the auth module
// across test files in the same worker — using a stable secret is the safest
// pattern even when isolation is enabled).
const TEST_JWT_SECRET = 'unified-auth-test-secret-ezpay-2026'
const originalSecret = process.env.JWT_SECRET
process.env.JWT_SECRET = TEST_JWT_SECRET

// Dynamic imports AFTER the mock + env mutation so module-level evaluation
// reads the right secret + the mocked client.
const paymentsListMod = await import('../../routes/payments/list.js')
const subsListMod = await import('../../routes/subscriptions/list.js')
const analyticsOverviewMod = await import('../../routes/admin/analytics-overview.js')
const { _resetUsageCacheForTests } = await import('../../middleware/api-key.js')

interface SeedKeyOpts {
  userId?: string
  applicationId?: string
  appSlug?: string
  type?: 'publishable' | 'secret'
  env?: 'live' | 'test'
  scope?: 'admin' | 'user' | 'readonly'
}

async function seedKey(
  ApiKey: Model<ApiKeyDocument>,
  opts: SeedKeyOpts = {}
): Promise<{ rawKey: string; doc: ApiKeyDocument }> {
  const type = opts.type ?? 'secret'
  const env = opts.env ?? 'live'
  const rawKey = generateRawApiKey({ type, env })
  const doc = await ApiKey.create({
    key: hashApiKey(rawKey),
    keyPrefix: extractKeyPrefix(rawKey),
    name: 'multi-tenancy-test-key',
    userId: opts.userId ?? 'user-acme-owner',
    applicationId: opts.applicationId ?? 'app-acme',
    appSlug: opts.appSlug ?? 'slug-acme',
    type,
    env,
    scope: opts.scope ?? 'admin',
    permissions: ['*'],
    status: 'active',
    expiresAt: null,
  })
  return { rawKey, doc }
}

function buildApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api', paymentsListMod.default)
  app.use('/api', subsListMod.default)
  app.use('/api', analyticsOverviewMod.default)
  return app
}

interface FetchResp<T = unknown> {
  status: number
  body: {
    success: boolean
    data?: T
    meta?: { total: number; limit: number; offset: number }
    error?: unknown
  }
}

async function call<T = unknown>(
  app: Express,
  path: string,
  headers: Record<string, string> = {}
): Promise<FetchResp<T>> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      fetch(`http://127.0.0.1:${port}${path}`, { headers })
        .then(async r => {
          const body = (await r.json()) as FetchResp<T>['body']
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

describe('P0 multi-tenancy — admin API key cannot leak other slugs', () => {
  let Payment: Model<PaymentDocument>
  let ApiKey: Model<ApiKeyDocument>
  let Usage: Model<ApiKeyUsageDocument>
  let app: Express

  beforeAll(async () => {
    await setupTestDatabase()
    Payment = await getPaymentModel()
    ApiKey = await getApiKeyModel()
    Usage = await getApiKeyUsageModel()
    try {
      await ApiKey.collection.dropIndexes()
      await Usage.collection.dropIndexes()
    } catch {
      // ignore
    }
    await ApiKey.createIndexes()
    await Usage.createIndexes()
    app = buildApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  })

  beforeEach(async () => {
    await Promise.all([Payment.deleteMany({}), ApiKey.deleteMany({}), Usage.deleteMany({})])
    _resetUsageCacheForTests()
    mockListApplicationsByOwner.mockClear()
    mockGetApplication.mockClear()
  })

  // -------------------------------------------------------------------------
  // Shared seed: payments + subs across slug-acme + slug-other (+ ezpay).
  // The platform server key (if hit by the bug) would resolve to
  // ['slug-other', 'ezpay'] and leak BOTH into an admin-acme key's queries.
  // -------------------------------------------------------------------------
  async function seedCrossTenantData() {
    await Payment.create([
      // ---- slug-acme payments (the LEGITIMATE scope of the admin key) ----
      {
        projectId: 'slug-acme',
        projectName: 'Acme',
        type: 'donation',
        amount: 100,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_acme_donation_1',
        status: 'completed',
        userId: 'user-acme-customer',
        isAnonymous: false,
        liveMode: true,
      },
      {
        projectId: 'slug-acme',
        projectName: 'Acme',
        type: 'subscription',
        amount: 200,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_acme_sub_1',
        status: 'completed',
        userId: 'user-acme-customer-2',
        isAnonymous: false,
        liveMode: true,
        metadata: { interval: 'month' },
      },
      // ---- slug-other payments (MUST stay invisible) ----------------------
      {
        projectId: 'slug-other',
        projectName: 'Other Tenant',
        type: 'donation',
        amount: 999,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_other_donation_1',
        status: 'completed',
        userId: 'user-other-customer',
        isAnonymous: false,
        liveMode: true,
      },
      {
        projectId: 'slug-other',
        projectName: 'Other Tenant',
        type: 'subscription',
        amount: 1500,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_other_sub_1',
        status: 'completed',
        userId: 'user-other-customer-2',
        isAnonymous: false,
        liveMode: true,
        metadata: { interval: 'month' },
      },
      // ---- ezpay (platform-internal, MUST also stay invisible) ------------
      {
        projectId: 'ezpay',
        projectName: 'EZPay Internal',
        type: 'subscription',
        amount: 5000,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_ezpay_internal_1',
        status: 'completed',
        userId: 'user-platform',
        isAnonymous: false,
        liveMode: true,
        metadata: { interval: 'month' },
      },
    ])
  }

  // -------------------------------------------------------------------------
  // 1. /api/payments — admin API key for slug-acme sees ONLY slug-acme rows
  // -------------------------------------------------------------------------
  describe('GET /api/payments via admin API key', () => {
    it('returns ONLY the bound slug rows (zero leak from slug-other or ezpay)', async () => {
      await seedCrossTenantData()
      const { rawKey } = await seedKey(ApiKey, {
        scope: 'admin',
        appSlug: 'slug-acme',
        applicationId: 'app-acme',
        userId: 'user-acme-owner',
      })

      const res = await call<Array<{ projectId: string; paymentId: string }>>(
        app,
        '/api/payments',
        { 'x-api-key': rawKey }
      )

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      const rows = res.body.data ?? []

      // Every returned row MUST be slug-acme — never slug-other, never ezpay.
      const projectIds = new Set(rows.map(r => r.projectId))
      expect(Array.from(projectIds)).toEqual(['slug-acme'])
      expect(projectIds.has('slug-other')).toBe(false)
      expect(projectIds.has('ezpay')).toBe(false)
      // Concretely: 2 acme payments seeded, both visible.
      expect(rows).toHaveLength(2)

      // SHORT-CIRCUIT ASSERTION — listApplicationsByOwner must NEVER have
      // been called on the API-key path. If it was, the bug regressed and
      // the platform-server fallback would have widened the scope.
      expect(mockListApplicationsByOwner).not.toHaveBeenCalled()
    })

    it('still returns own-userId rows when ownerId matches (subscription on the bound slug counts)', async () => {
      // The owner of the key has their own subscription on the bound slug.
      // The $or filter still matches it via projectId === bound slug.
      await Payment.create({
        projectId: 'slug-acme',
        projectName: 'Acme',
        type: 'subscription',
        amount: 50,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'pi_acme_owner_sub',
        status: 'completed',
        userId: 'user-acme-owner', // matches key owner
        isAnonymous: false,
        liveMode: true,
      })
      const { rawKey } = await seedKey(ApiKey, {
        scope: 'admin',
        appSlug: 'slug-acme',
        userId: 'user-acme-owner',
      })

      const res = await call<Array<{ projectId: string }>>(app, '/api/payments', {
        'x-api-key': rawKey,
      })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data?.[0]?.projectId).toBe('slug-acme')
    })
  })

  // -------------------------------------------------------------------------
  // 2. /api/subscriptions — same scope guarantee
  // -------------------------------------------------------------------------
  describe('GET /api/subscriptions via admin API key', () => {
    it('returns ONLY the bound slug subscriptions', async () => {
      await seedCrossTenantData()
      const { rawKey } = await seedKey(ApiKey, {
        scope: 'admin',
        appSlug: 'slug-acme',
        userId: 'user-acme-owner',
      })

      const res = await call<Array<{ projectId: string; type: string }>>(
        app,
        '/api/subscriptions',
        { 'x-api-key': rawKey }
      )

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      const rows = res.body.data ?? []
      // Only slug-acme subs (1 in seed) — never slug-other or ezpay subs.
      expect(rows).toHaveLength(1)
      expect(rows[0]?.projectId).toBe('slug-acme')
      expect(rows[0]?.type).toBe('subscription')
      expect(rows.every(r => r.projectId === 'slug-acme')).toBe(true)

      expect(mockListApplicationsByOwner).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // 3. /api/admin/analytics/overview — aggregates restricted to bound slug
  // -------------------------------------------------------------------------
  describe('GET /api/admin/analytics/overview via admin API key', () => {
    it('aggregates ONLY the bound slug data (no contribution from other slugs)', async () => {
      await seedCrossTenantData()
      const { rawKey } = await seedKey(ApiKey, {
        scope: 'admin',
        appSlug: 'slug-acme',
        userId: 'user-acme-owner',
      })

      interface Overview {
        totalPayments: number
        completedPayments: number
        revenueByCurrency: Array<{ currency: string; total: number }>
        topAppsByRevenue: Array<{ appName: string; total: number }>
        activeSubscriptions: number
        mrrByCurrency: Array<{ currency: string; total: number }>
      }

      const res = await call<Overview>(app, '/api/admin/analytics/overview', {
        'x-api-key': rawKey,
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      const data = res.body.data!

      // 2 acme payments seeded, both completed.
      expect(data.totalPayments).toBe(2)
      expect(data.completedPayments).toBe(2)

      // Revenue: 100 + 200 = 300 EUR. Critically NOT 100 + 200 + 999 + 1500 + 5000.
      const eur = data.revenueByCurrency.find(c => c.currency === 'EUR')
      expect(eur?.total).toBe(300)

      // Top apps strictly = ['slug-acme']. Never includes slug-other / ezpay.
      const appNames = data.topAppsByRevenue.map(a => a.appName)
      expect(appNames).toEqual(['slug-acme'])
      expect(appNames).not.toContain('slug-other')
      expect(appNames).not.toContain('ezpay')

      // 1 acme subscription completed.
      expect(data.activeSubscriptions).toBe(1)
      const mrrEur = data.mrrByCurrency.find(c => c.currency === 'EUR')
      // Acme monthly sub = 200 EUR. NOT 200 + 1500 + 5000.
      expect(mrrEur?.total).toBe(200)

      expect(mockListApplicationsByOwner).not.toHaveBeenCalled()
    })

    it('returns empty snapshot when bound slug has zero payments', async () => {
      await seedCrossTenantData() // seeds slug-other + ezpay only relative to slug-empty
      const { rawKey } = await seedKey(ApiKey, {
        scope: 'admin',
        appSlug: 'slug-empty', // no payments seeded for this slug
        userId: 'user-empty-owner',
      })

      interface Overview {
        totalPayments: number
        completedPayments: number
        revenueByCurrency: Array<{ currency: string; total: number }>
        topAppsByRevenue: Array<{ appName: string }>
      }

      const res = await call<Overview>(app, '/api/admin/analytics/overview', {
        'x-api-key': rawKey,
      })

      expect(res.status).toBe(200)
      const data = res.body.data!
      // Critical: NOT widened to slug-other/ezpay payments via fallback.
      expect(data.totalPayments).toBe(0)
      expect(data.completedPayments).toBe(0)
      expect(data.revenueByCurrency).toEqual([])
      expect(data.topAppsByRevenue).toEqual([])

      expect(mockListApplicationsByOwner).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // 4. JWT path regression — listApplicationsByOwner IS still called
  // -------------------------------------------------------------------------
  describe('JWT path regression — fallback still works for legitimate cross-service lookup', () => {
    it('JWT-authenticated app-admin still triggers listApplicationsByOwner (with their bearer)', async () => {
      await seedCrossTenantData()

      // Mock returns a single owned slug for this user — different from the
      // bug-trigger default. The handler MUST honour the mocked return.
      mockListApplicationsByOwner.mockResolvedValueOnce([
        { id: 'app_acme', slug: 'slug-acme', name: 'Acme' },
      ])

      // Sign a JWT for an app-admin user (appRoles[slug-acme]=['admin']).
      // userId MUST match `OBJECT_ID_REGEX` (`/^[a-f\d]{24}$/i`) — the
      // `buildUserFromDecoded` helper in `@ezstart/api-core` rejects
      // non-ObjectId userIds with 401 before any handler runs.
      const jwt = await import('jsonwebtoken')
      const ADMIN_USER_OID = '507f1f77bcf86cd799439999'
      const token = jwt.default.sign(
        {
          userId: ADMIN_USER_OID,
          email: 'admin@acme.example',
          username: 'acme-admin',
          appRoles: { 'slug-acme': ['admin'] },
        },
        TEST_JWT_SECRET,
        {
          algorithm: 'HS256',
          expiresIn: '5m',
          // HAC-CRIT-2 — ezpay's verifier now enforces iss/aud; mint a
          // token shaped like a production ezauth-issued one.
          issuer: 'ezauth',
          audience: ['ezauth', 'ezpay', 'ezbill', 'green-pulse'],
        }
      )

      const res = await call<Array<{ projectId: string }>>(app, '/api/payments', {
        authorization: `Bearer ${token}`,
      })

      expect(res.status).toBe(200)
      const rows = res.body.data ?? []
      // Honoured the mocked owned slug → only slug-acme rows. The user's
      // own userId (ADMIN_USER_OID) doesn't match any seeded payment, so
      // the only matches come from `projectId IN ['slug-acme']`.
      expect(rows.every(r => r.projectId === 'slug-acme')).toBe(true)
      expect(rows).toHaveLength(2)

      // listApplicationsByOwner WAS called on the JWT path (legitimate
      // cross-service lookup) — proves the short-circuit is API-key only.
      expect(mockListApplicationsByOwner).toHaveBeenCalledTimes(1)
    })
  })
})
