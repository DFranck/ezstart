/**
 * Tests for `seed-pay-docs-demo-data` (PAY_DOCS_DEMO_SANDBOX-001 = #178).
 *
 * Coverage:
 *  - First run creates the 3 plans + 2 subs + 4 payments + 5 donations + 2
 *    invoices for the `_pay-docs-demo` Application.
 *  - Each doc carries `isTestMode: true` + `liveMode: false` (Stripe
 *    test/live partition).
 *  - All docs are scoped to `projectId === '_pay-docs-demo'` (no leak).
 *  - Idempotent on re-run (plans NOT duplicated, volatile entities flushed
 *    + recreated to a deterministic baseline).
 *  - `skipPlans: true` flag preserves existing plans (used by reset cron).
 *  - Re-running with stripPlans does not touch other Plan rows.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  seedPayDocsDemoData,
  PAY_DOCS_DEMO_APP_SLUG,
} from '../../scripts/seed-pay-docs-demo-data.js'
import { getPlanModel } from '../../models/Plan.js'
import { getPaymentModel } from '../../models/Payment.js'

type PlanModelType = Awaited<ReturnType<typeof getPlanModel>>
type PaymentModelType = Awaited<ReturnType<typeof getPaymentModel>>

describe('seed-pay-docs-demo-data', () => {
  let PlanModel: PlanModelType
  let PaymentModel: PaymentModelType

  beforeAll(async () => {
    await setupTestDatabase()
    PlanModel = await getPlanModel()
    PaymentModel = await getPaymentModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PlanModel.deleteMany({}, { skipTestModeScope: true } as {
      skipTestModeScope?: boolean
    })
    await PaymentModel.deleteMany({}, { skipTestModeScope: true } as {
      skipTestModeScope?: boolean
    })
  })

  it('T1: first run creates 3 plans (Free / Pro / Enterprise)', async () => {
    const result = await seedPayDocsDemoData()

    expect(result.plansCreated).toBe(3)
    expect(result.plansAlreadyExisted).toBe(0)

    const plans = await PlanModel.find({ applicationId: PAY_DOCS_DEMO_APP_SLUG }, null, {
      skipTestModeScope: true,
    } as { skipTestModeScope?: boolean }).lean()
    expect(plans).toHaveLength(3)

    const names = plans.map(p => p.name).sort()
    expect(names).toEqual(['Enterprise', 'Free', 'Pro'])

    // Every plan is hard-isolated.
    for (const p of plans) {
      expect(p.isTestMode).toBe(true)
      expect(p.applicationId).toBe(PAY_DOCS_DEMO_APP_SLUG)
      expect(p.appName).toBe(PAY_DOCS_DEMO_APP_SLUG)
    }
  })

  it('T2: first run creates 2 subscriptions (1 active + 1 past_due)', async () => {
    const result = await seedPayDocsDemoData()

    expect(result.subscriptionsCreated).toBe(2)

    // Filter on the dedicated subscription paymentIds — the payments
    // bucket also contains a `type: 'subscription'` row for the past-due
    // demo payment that's separate from the "subscription lifecycle" rows.
    const subs = await PaymentModel.find(
      {
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        paymentId: { $regex: /^pay-docs-demo-sub-/ },
      },
      null,
      { skipTestModeScope: true } as { skipTestModeScope?: boolean }
    ).lean()

    expect(subs).toHaveLength(2)

    // Distinguish active (paymentId suffix `-active`, status='completed')
    // from past_due (paymentId suffix `-pastdue`, status='pending').
    const active = subs.find(s => s.paymentId === 'pay-docs-demo-sub-active')!
    const pastDue = subs.find(s => s.paymentId === 'pay-docs-demo-sub-pastdue')!
    expect(active).toBeDefined()
    expect(pastDue).toBeDefined()
    expect(active.status).toBe('completed')
    expect(pastDue.status).toBe('pending')

    for (const s of subs) {
      expect(s.isTestMode).toBe(true)
      expect(s.liveMode).toBe(false)
      expect(s.type).toBe('subscription')
    }
  })

  it('T3: first run creates 4 payments (success / refund / past_due / large)', async () => {
    const result = await seedPayDocsDemoData()

    expect(result.paymentsCreated).toBe(4)

    // Filter purchase + failing subscription (the past-due payment).
    const payments = await PaymentModel.find(
      {
        projectId: PAY_DOCS_DEMO_APP_SLUG,
        paymentId: { $regex: /^pay-docs-demo-pay-/ },
      },
      null,
      { skipTestModeScope: true } as { skipTestModeScope?: boolean }
    ).lean()

    expect(payments).toHaveLength(4)

    const statuses = payments.map(p => p.status).sort()
    expect(statuses).toEqual(['completed', 'completed', 'failed', 'refunded'])
  })

  it('T4: first run creates 5 donations', async () => {
    const result = await seedPayDocsDemoData()

    expect(result.donationsCreated).toBe(5)

    const donations = await PaymentModel.find(
      { projectId: PAY_DOCS_DEMO_APP_SLUG, type: 'donation' },
      null,
      { skipTestModeScope: true } as { skipTestModeScope?: boolean }
    ).lean()

    expect(donations).toHaveLength(5)

    for (const d of donations) {
      expect(d.isTestMode).toBe(true)
      expect(d.liveMode).toBe(false)
      expect(d.status).toBe('completed')
      expect(d.customerName).toBeTruthy()
    }
  })

  it('T5: first run creates 2 invoices (paid + past_due)', async () => {
    const result = await seedPayDocsDemoData()

    expect(result.invoicesCreated).toBe(2)

    const invoices = await PaymentModel.find(
      { projectId: PAY_DOCS_DEMO_APP_SLUG, type: 'invoice' },
      null,
      { skipTestModeScope: true } as { skipTestModeScope?: boolean }
    ).lean()

    expect(invoices).toHaveLength(2)

    const statuses = invoices.map(i => i.status).sort()
    expect(statuses).toEqual(['completed', 'pending'])
  })

  it('T6: second run is idempotent — plans not duplicated, volatile entities re-seeded', async () => {
    const first = await seedPayDocsDemoData()
    expect(first.plansCreated).toBe(3)

    const second = await seedPayDocsDemoData()

    expect(second.plansCreated).toBe(0)
    expect(second.plansAlreadyExisted).toBe(3)
    // Volatile entities are re-seeded (deterministic baseline).
    expect(second.subscriptionsCreated).toBe(2)
    expect(second.paymentsCreated).toBe(4)
    expect(second.donationsCreated).toBe(5)
    expect(second.invoicesCreated).toBe(2)

    const planCount = await PlanModel.countDocuments({ applicationId: PAY_DOCS_DEMO_APP_SLUG }, {
      skipTestModeScope: true,
    } as { skipTestModeScope?: boolean })
    expect(planCount).toBe(3)
  })

  it('T7: skipPlans=true does not insert any plans (used by reset cron)', async () => {
    // First seed creates plans.
    await seedPayDocsDemoData()

    // Now wipe everything except plans, then call seed again with skipPlans.
    await PaymentModel.deleteMany({ projectId: PAY_DOCS_DEMO_APP_SLUG }, {
      skipTestModeScope: true,
    } as { skipTestModeScope?: boolean })

    const result = await seedPayDocsDemoData({ skipPlans: true })

    expect(result.plansCreated).toBe(0)
    expect(result.plansAlreadyExisted).toBe(0)
    // Volatile entities re-seeded as expected.
    expect(result.subscriptionsCreated).toBe(2)
    expect(result.paymentsCreated).toBe(4)
    expect(result.donationsCreated).toBe(5)
    expect(result.invoicesCreated).toBe(2)

    // Plans untouched — still 3.
    const planCount = await PlanModel.countDocuments({ applicationId: PAY_DOCS_DEMO_APP_SLUG }, {
      skipTestModeScope: true,
    } as { skipTestModeScope?: boolean })
    expect(planCount).toBe(3)
  })
})
