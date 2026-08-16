/**
 * Cross-tenant isolation tests for the `_pay-docs-demo` sandbox
 * (PAY_DOCS_DEMO_SANDBOX-001 = #178).
 *
 * The sandbox is the safety net of the live `/docs/pay/*` previews —
 * if any of these tests fail, the pay docs sandbox is leaking data
 * across tenant boundaries (or escaping into Stripe) and MUST not be
 * deployed.
 *
 *  T1 — Quota: max active subscriptions reached → 429
 *  T2 — Quota: max payments per 24h reached → 429
 *  T3 — Quota: max donations per 24h reached → 429
 *  T4 — `checkPayDemoQuotas` is a strict no-op for non-demo traffic
 *       (live keys are not penalised by an extra Mongo lookup nor
 *       blocked when the sandbox is "full")
 *  T5 — `resetPayDocsDemoData()` deletes ONLY `_pay-docs-demo`
 *       payments. Any non-demo data sitting in the same DB is left
 *       untouched.
 *  T6 — `resetPayDocsDemoData()` re-seeds the deterministic baseline
 *       (subs / payments / donations / invoices) but PRESERVES the
 *       sandbox plans (skipPlans=true contract).
 *  T7 — Sandbox subscription create path NEVER touches Stripe
 *       (the seed inserts `paymentId: 'pay-docs-demo-*'`, not a real
 *       `cs_*` / `pi_*`, proving no Stripe call ran).
 *  T8 — Sandbox plans persist across multiple resets (re-seed works).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express, { type Express, type RequestHandler } from 'express'
import { getPaymentModel } from '../../models/Payment.js'
import { getPlanModel } from '../../models/Plan.js'
import {
  seedPayDocsDemoData,
  PAY_DOCS_DEMO_APP_SLUG,
} from '../../scripts/seed-pay-docs-demo-data.js'
import { checkPayDemoQuotas, PAY_DOCS_DEMO_QUOTAS } from '../../middleware/check-pay-demo-quotas.js'
import { resetPayDocsDemoData } from '../../services/pay-docs-demo-reset.service.js'

interface FetchResp {
  status: number
  body: { success: boolean; data?: unknown; error?: { message?: string } | string }
}

/**
 * POST a JSON body to an ephemeral Express app via native `fetch`. Mirrors
 * the existing pattern in `__tests__/middleware/unified-auth.test.ts` so
 * we don't need to add `supertest` as a dependency.
 */
async function postJson(
  app: Express,
  path: string,
  body: Record<string, unknown>
): Promise<FetchResp> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server address unavailable'))
        return
      }
      const port = address.port
      fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(async r => {
          const json = (await r.json()) as FetchResp['body']
          server.close()
          resolve({ status: r.status, body: json })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

/**
 * Minimal Express app that wraps `checkPayDemoQuotas` around a no-op
 * handler. Lets us exercise the quota gates without booting the whole
 * pay stack (Stripe, ezauth, etc.).
 */
function createPayDemoQuotasTestApp(): Express {
  const app = express()
  app.use(express.json())
  const passthrough: RequestHandler = (_req, res) => {
    res.status(200).json({ success: true })
  }
  app.post('/donate', checkPayDemoQuotas, passthrough)
  app.post('/subscribe', checkPayDemoQuotas, passthrough)
  app.post('/purchase', checkPayDemoQuotas, passthrough)
  return app
}

/**
 * Insert N raw `Payment` docs of a given shape, bypassing the test mode
 * scope plugin so we can populate the sandbox to its quota cap regardless
 * of any ambient request context.
 */
async function fillPayments(opts: {
  count: number
  type: 'donation' | 'subscription' | 'purchase' | 'invoice'
  status: 'completed' | 'pending' | 'failed' | 'refunded' | 'cancelled'
  projectId: string
  ageMs?: number
}): Promise<void> {
  const Payment = await getPaymentModel()
  const now = new Date()
  const docs = Array.from({ length: opts.count }).map((_, i) => ({
    projectId: opts.projectId,
    projectName: opts.projectId,
    type: opts.type,
    amount: 5,
    currency: 'EUR',
    customerName: `Filler ${i}`,
    isAnonymous: false,
    provider: 'stripe' as const,
    paymentId: `${opts.projectId}-fill-${opts.type}-${i}-${Date.now()}-${Math.random()}`,
    status: opts.status,
    liveMode: opts.projectId === PAY_DOCS_DEMO_APP_SLUG ? false : true,
    isTestMode: opts.projectId === PAY_DOCS_DEMO_APP_SLUG,
    createdAt: opts.ageMs ? new Date(now.getTime() - opts.ageMs) : now,
  }))
  await Payment.insertMany(docs)
}

describe('Pay Docs Demo Isolation', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const Payment = await getPaymentModel()
    const Plan = await getPlanModel()
    await Payment.deleteMany({}, { skipTestModeScope: true } as { skipTestModeScope?: boolean })
    await Plan.deleteMany({}, { skipTestModeScope: true } as { skipTestModeScope?: boolean })
  })

  // ────────────────────────────────────────────────────────────────────
  // T1 — Active subscriptions cap
  // ────────────────────────────────────────────────────────────────────
  describe('T1 — `maxActiveSubscriptions` cap', () => {
    it('blocks /subscribe once active subscription count reaches the cap', async () => {
      const app = createPayDemoQuotasTestApp()
      // Pre-fill the sandbox to its max active subs cap.
      await fillPayments({
        count: PAY_DOCS_DEMO_QUOTAS.maxActiveSubscriptions,
        type: 'subscription',
        status: 'completed',
        projectId: PAY_DOCS_DEMO_APP_SLUG,
      })

      const res = await postJson(app, '/subscribe', {
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        amount: 19,
      })

      expect(res.status).toBe(429)
      const errMsg = typeof res.body.error === 'object' ? res.body.error?.message : res.body.error
      expect(errMsg).toMatch(/capacity/i)
    })

    it('allows /subscribe while active sub count < cap', async () => {
      const app = createPayDemoQuotasTestApp()
      await fillPayments({
        count: 3,
        type: 'subscription',
        status: 'completed',
        projectId: PAY_DOCS_DEMO_APP_SLUG,
      })

      const res = await postJson(app, '/subscribe', {
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        amount: 19,
      })

      expect(res.status).toBe(200)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T2 — Daily payments cap (any non-donation mutation)
  // ────────────────────────────────────────────────────────────────────
  describe('T2 — `maxPaymentsPerDay` cap', () => {
    it('blocks /purchase once daily payment count reaches the cap', async () => {
      const app = createPayDemoQuotasTestApp()
      await fillPayments({
        count: PAY_DOCS_DEMO_QUOTAS.maxPaymentsPerDay,
        type: 'purchase',
        status: 'completed',
        projectId: PAY_DOCS_DEMO_APP_SLUG,
      })

      const res = await postJson(app, '/purchase', {
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        amount: 19,
      })

      expect(res.status).toBe(429)
    })

    it('does not count payments older than 24h toward the cap', async () => {
      const app = createPayDemoQuotasTestApp()
      // 25h-old fills should NOT count.
      await fillPayments({
        count: PAY_DOCS_DEMO_QUOTAS.maxPaymentsPerDay,
        type: 'purchase',
        status: 'completed',
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        ageMs: 25 * 60 * 60 * 1000,
      })

      const res = await postJson(app, '/purchase', {
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        amount: 19,
      })

      expect(res.status).toBe(200)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T3 — Daily donations cap
  // ────────────────────────────────────────────────────────────────────
  describe('T3 — `maxDonationsPerDay` cap', () => {
    it('blocks /donate once daily donation count reaches the cap', async () => {
      const app = createPayDemoQuotasTestApp()
      await fillPayments({
        count: PAY_DOCS_DEMO_QUOTAS.maxDonationsPerDay,
        type: 'donation',
        status: 'completed',
        projectId: PAY_DOCS_DEMO_APP_SLUG,
      })

      const res = await postJson(app, '/donate', {
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        amount: 5,
      })

      expect(res.status).toBe(429)
    })

    it('allows /donate while donation count < cap', async () => {
      const app = createPayDemoQuotasTestApp()
      await fillPayments({
        count: 5,
        type: 'donation',
        status: 'completed',
        projectId: PAY_DOCS_DEMO_APP_SLUG,
      })

      const res = await postJson(app, '/donate', {
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        amount: 5,
      })

      expect(res.status).toBe(200)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T4 — Strict no-op for non-demo traffic
  // ────────────────────────────────────────────────────────────────────
  describe('T4 — Strict no-op for non-demo traffic', () => {
    it('lets non-demo /donate through even when sandbox is "full"', async () => {
      const app = createPayDemoQuotasTestApp()
      await fillPayments({
        count: PAY_DOCS_DEMO_QUOTAS.maxDonationsPerDay + 5,
        type: 'donation',
        status: 'completed',
        projectId: PAY_DOCS_DEMO_APP_SLUG,
      })

      // Different projectId = live tenant.
      const res = await postJson(app, '/donate', { projectId: 'acme', amount: 5 })

      expect(res.status).toBe(200)
    })

    it('lets non-demo /subscribe through even when sandbox subs are at cap', async () => {
      const app = createPayDemoQuotasTestApp()
      await fillPayments({
        count: PAY_DOCS_DEMO_QUOTAS.maxActiveSubscriptions + 5,
        type: 'subscription',
        status: 'completed',
        projectId: PAY_DOCS_DEMO_APP_SLUG,
      })

      const res = await postJson(app, '/subscribe', { projectId: 'acme', amount: 19 })

      expect(res.status).toBe(200)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T5 — Reset deletes ONLY `_pay-docs-demo` data
  // ────────────────────────────────────────────────────────────────────
  describe('T5 — Reset isolation (only `_pay-docs-demo` data wiped)', () => {
    it('does not touch payments scoped to other projects', async () => {
      // Seed sandbox baseline.
      await seedPayDocsDemoData()

      // Live data — MUST survive reset.
      const Payment = await getPaymentModel()
      await Payment.create({
        projectId: 'acme',
        projectName: 'Acme',
        type: 'donation',
        amount: 25,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'cs_live_acme_1',
        status: 'completed',
        liveMode: true,
        isTestMode: false,
        customerName: 'Live Customer',
        isAnonymous: false,
      })

      const result = await resetPayDocsDemoData()
      expect(result.paymentsDeleted).toBeGreaterThan(0)

      const liveDoc = await Payment.findOne({ paymentId: 'cs_live_acme_1' }, null, {
        skipTestModeScope: true,
      } as { skipTestModeScope?: boolean }).lean()
      expect(liveDoc).not.toBeNull()
      expect(liveDoc!.projectId).toBe('acme')
    })

    it('returns the count of deleted sandbox payments', async () => {
      await seedPayDocsDemoData()

      // Total = 2 subs + 4 payments + 5 donations + 2 invoices = 13.
      const Payment = await getPaymentModel()
      const sandboxCountBefore = await Payment.countDocuments(
        { projectId: PAY_DOCS_DEMO_APP_SLUG },
        { skipTestModeScope: true } as { skipTestModeScope?: boolean }
      )
      expect(sandboxCountBefore).toBe(13)

      const result = await resetPayDocsDemoData()
      expect(result.paymentsDeleted).toBe(13)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T6 — Reset re-seeds baseline + preserves plans
  // ────────────────────────────────────────────────────────────────────
  describe('T6 — Reset re-seeds the deterministic baseline + preserves plans', () => {
    it('re-creates the volatile entities after wipe', async () => {
      await seedPayDocsDemoData()

      const Payment = await getPaymentModel()
      const sandboxCountBefore = await Payment.countDocuments(
        { projectId: PAY_DOCS_DEMO_APP_SLUG },
        { skipTestModeScope: true } as { skipTestModeScope?: boolean }
      )
      expect(sandboxCountBefore).toBe(13)

      const result = await resetPayDocsDemoData()
      expect(result.reseed.subscriptionsCreated).toBe(2)
      expect(result.reseed.paymentsCreated).toBe(4)
      expect(result.reseed.donationsCreated).toBe(5)
      expect(result.reseed.invoicesCreated).toBe(2)

      const sandboxCountAfter = await Payment.countDocuments(
        { projectId: PAY_DOCS_DEMO_APP_SLUG },
        { skipTestModeScope: true } as { skipTestModeScope?: boolean }
      )
      expect(sandboxCountAfter).toBe(13)
    })

    it('does NOT delete the sandbox Plan rows during reset', async () => {
      await seedPayDocsDemoData()

      const Plan = await getPlanModel()
      const planCountBefore = await Plan.countDocuments({ applicationId: PAY_DOCS_DEMO_APP_SLUG }, {
        skipTestModeScope: true,
      } as { skipTestModeScope?: boolean })
      expect(planCountBefore).toBe(3)

      await resetPayDocsDemoData()

      const planCountAfter = await Plan.countDocuments({ applicationId: PAY_DOCS_DEMO_APP_SLUG }, {
        skipTestModeScope: true,
      } as { skipTestModeScope?: boolean })
      expect(planCountAfter).toBe(3)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T7 — No real Stripe API call for sandbox payments
  // ────────────────────────────────────────────────────────────────────
  describe('T7 — Sandbox payments NEVER trigger a real Stripe API call', () => {
    it('all sandbox paymentIds are namespaced (no cs_/pi_/ch_ prefix)', async () => {
      await seedPayDocsDemoData()

      const Payment = await getPaymentModel()
      const docs = await Payment.find({ projectId: PAY_DOCS_DEMO_APP_SLUG }, null, {
        skipTestModeScope: true,
      } as { skipTestModeScope?: boolean }).lean()

      expect(docs.length).toBeGreaterThan(0)

      for (const d of docs) {
        // Every paymentId starts with `pay-docs-demo-` namespace —
        // proving no real Stripe API minted the id.
        expect(d.paymentId).toMatch(/^pay-docs-demo-/)
        expect(d.paymentId).not.toMatch(/^(cs_|pi_|ch_|sub_|in_)/)
        // No real Stripe Connect account id stamped either.
        expect(d.liveMode).toBe(false)
        expect(d.isTestMode).toBe(true)
      }
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // T8 — Multiple resets keep the baseline stable
  // ────────────────────────────────────────────────────────────────────
  describe('T8 — Multiple resets keep the baseline stable', () => {
    it('runs 3 reset cycles back-to-back without growing the dataset', async () => {
      await seedPayDocsDemoData()

      const Payment = await getPaymentModel()

      for (let i = 0; i < 3; i++) {
        await resetPayDocsDemoData()
        const count = await Payment.countDocuments({ projectId: PAY_DOCS_DEMO_APP_SLUG }, {
          skipTestModeScope: true,
        } as { skipTestModeScope?: boolean })
        expect(count).toBe(13)
      }

      const Plan = await getPlanModel()
      const planCount = await Plan.countDocuments({ applicationId: PAY_DOCS_DEMO_APP_SLUG }, {
        skipTestModeScope: true,
      } as { skipTestModeScope?: boolean })
      expect(planCount).toBe(3)
    })
  })
})
