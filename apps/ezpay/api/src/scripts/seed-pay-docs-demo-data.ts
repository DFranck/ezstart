/**
 * Seed script — bootstrap the `_pay-docs-demo` sandbox DATA in ezpay
 * (PAY_DOCS_DEMO_SANDBOX-001 = #178, mirror of #163).
 *
 * Companion to `apps/ezauth/api/src/scripts/seed-pay-docs-demo-app.ts`
 * (creates the Application doc + reserved keys in ezauth). This script
 * populates the ezpay-side sandbox DATA used by `/docs/pay/*` live
 * previews:
 *
 *  - **3 sandbox Plans** (Free / Pro €19 / Enterprise €99) — drive
 *    `<PricingPage>` + `<PricingCard>` previews. No real Stripe Product /
 *    Price is created; `stripeProductId` / `stripePriceId` stay undefined
 *    so a curious visitor cannot accidentally trigger a live checkout.
 *  - **2 sandbox Subscriptions** — 1 active (Pro tier) + 1 past_due (Pro
 *    tier). Power `<SubscriptionCard>` + `<PastDueBanner>` previews.
 *  - **4 sandbox Payments** — success / refund / past_due / large success
 *    cover every status the `<PaymentHistoryCard>` renders.
 *  - **5 sandbox Donations** — random names + amounts $5..$50 — drive the
 *    `<DonationWall>` preview.
 *  - **2 sandbox Invoices** (paid + past_due) — drive
 *    `<InvoiceHistoryCard>` preview.
 *
 * Hard isolation guarantees:
 *
 *  - Every doc written by this seed has `applicationId = '_pay-docs-demo'`
 *    AND `isTestMode: true` AND `liveMode: false` (Payment) — the
 *    `testModeScopePlugin` partitions every read so live keys NEVER see
 *    sandbox docs and vice-versa.
 *  - `paymentId` is namespaced `pay-docs-demo-<type>-<n>` so the unique
 *    index never collides with a real Stripe paymentId (`pi_...` /
 *    `cs_...`).
 *  - No real Stripe API call. `provider: 'stripe'` for shape consistency
 *    only — the sandbox payment IS the source of truth.
 *
 * Idempotent: re-running with the existing sandbox docs is a no-op (each
 * collection scoped to the sandbox `applicationId` is wiped via a
 * delete-then-recreate to guarantee a deterministic baseline; this is
 * cheap because there are at most ~14 docs total). Plans are upserted by
 * `(applicationId, name)` so re-runs preserve any custom fields admins
 * may have tweaked from the dashboard.
 *
 * Usage:
 *   pnpm --filter api-ezpay seed:pay-docs-demo
 *
 * Preconditions:
 *   - `pnpm --filter api-ezauth seed:pay-docs-demo` must have run FIRST
 *     so the `_pay-docs-demo` Application exists in the ezauth DB.
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §4 (Bootstrap)
 * + `.claude/rules/standard-saas-data.md` §4 (test mode isolation).
 *
 * @module apps/ezpay/api/src/scripts/seed-pay-docs-demo-data
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { logger } from '@ezstart/logger/server'
import { getPlanModel, type PlanDocument } from '../models/Plan.js'
import { getPaymentModel, type PaymentDocument } from '../models/Payment.js'

/** Marker used to identify the pay-docs-demo seed entities for idempotence. */
export const PAY_DOCS_DEMO_SEED_MARKER = 'system-seed-pay-docs-demo'

/** Reserved slug for the pay documentation sandbox Application. */
export const PAY_DOCS_DEMO_APP_SLUG = '_pay-docs-demo'

/**
 * Plan template — describes ONE of the 3 sandbox plans (Free / Pro /
 * Enterprise). The seed inserts these via `Plan.create` keyed on
 * `(applicationId, name)` so re-runs are idempotent.
 *
 * @internal
 */
interface PlanTemplate {
  name: string
  description: string
  amount: number
  currency: string
  features: string[]
  sortOrder: number
}

const PAY_DOCS_DEMO_PLAN_TEMPLATES: readonly PlanTemplate[] = [
  {
    name: 'Free',
    description: 'Sandbox tier — no charge, basic features',
    amount: 0,
    currency: 'EUR',
    features: ['1 project', 'Community support'],
    sortOrder: 1,
  },
  {
    name: 'Pro',
    description: 'Sandbox tier — typical paid plan demo',
    amount: 1900,
    currency: 'EUR',
    features: ['Unlimited projects', 'Priority email support', 'Analytics'],
    sortOrder: 2,
  },
  {
    name: 'Enterprise',
    description: 'Sandbox tier — top-of-funnel premium demo',
    amount: 9900,
    currency: 'EUR',
    features: ['Everything in Pro', 'SSO + SAML', 'Dedicated CSM'],
    sortOrder: 3,
  },
] as const

/** Demo donation roster — names + amounts shown by `<DonationWall>`. */
const PAY_DOCS_DEMO_DONATIONS: ReadonlyArray<{ name: string; amount: number; message?: string }> = [
  { name: 'Alice', amount: 5, message: 'Keep up the great work!' },
  { name: 'Bob', amount: 10 },
  { name: 'Camille', amount: 25, message: 'Loving the docs.' },
  { name: 'Dimitri', amount: 15 },
  { name: 'Eve', amount: 50, message: 'Worth every euro.' },
]

/** Aggregate result returned by {@link seedPayDocsDemoData}. */
export interface SeedPayDocsDemoDataResult {
  plansCreated: number
  plansAlreadyExisted: number
  subscriptionsCreated: number
  paymentsCreated: number
  donationsCreated: number
  invoicesCreated: number
}

/** Options for {@link seedPayDocsDemoData}. */
export interface SeedPayDocsDemoDataOptions {
  /**
   * When true, skip plan re-seeding and only refresh the volatile entities
   * (subscriptions / payments / donations / invoices). Used by the 24h
   * reset cron — plans are the stable baseline, only the surrounding data
   * gets wiped + re-seeded each cycle.
   */
  skipPlans?: boolean
}

/**
 * Core seed logic — extracted from the CLI entry point for testability and
 * the reset service.
 *
 * Assumes `connectToMongo('ezpay')` has been called.
 */
export async function seedPayDocsDemoData(
  options: SeedPayDocsDemoDataOptions = {}
): Promise<SeedPayDocsDemoDataResult> {
  const Plan = await getPlanModel()
  const Payment = await getPaymentModel()

  const result: SeedPayDocsDemoDataResult = {
    plansCreated: 0,
    plansAlreadyExisted: 0,
    subscriptionsCreated: 0,
    paymentsCreated: 0,
    donationsCreated: 0,
    invoicesCreated: 0,
  }

  // 1. Plans — idempotent upsert by (applicationId, name).
  if (!options.skipPlans) {
    for (const tpl of PAY_DOCS_DEMO_PLAN_TEMPLATES) {
      const existing = await Plan.findOne({
        applicationId: PAY_DOCS_DEMO_APP_SLUG,
        name: tpl.name,
      })
      if (existing) {
        result.plansAlreadyExisted += 1
        continue
      }
      await Plan.create({
        name: tpl.name,
        description: tpl.description,
        applicationId: PAY_DOCS_DEMO_APP_SLUG,
        appName: PAY_DOCS_DEMO_APP_SLUG,
        amount: tpl.amount,
        currency: tpl.currency,
        interval: 'month',
        intervalCount: 1,
        features: [...tpl.features],
        active: true,
        sortOrder: tpl.sortOrder,
        // Hard sandbox flag — partitions test data away from any live key.
        isTestMode: true,
      } satisfies Partial<PlanDocument>)
      result.plansCreated += 1
    }
  }

  // 2. Volatile entities — flush + re-seed deterministic baseline.
  //
  // The volatile entities are wiped and recreated in lockstep so the
  // sandbox always shows the same shape. We use `deleteMany` scoped to
  // `projectId === '_pay-docs-demo'` so live data is never touched. Plans
  // are NOT in this wipe (they're the stable baseline kept across resets).
  await Payment.deleteMany(
    { projectId: PAY_DOCS_DEMO_APP_SLUG },
    // Skip the test mode scope plugin — we own the filter and explicitly
    // target ALL sandbox docs regardless of context (the seed script runs
    // outside any request lifecycle, so the plugin is a no-op anyway, but
    // explicit is better than implicit).
    { skipTestModeScope: true } as { skipTestModeScope?: boolean }
  )

  // 3. Subscriptions — 1 active + 1 past_due, both Pro tier
  //    (`<SubscriptionCard>` + `<PastDueBanner>` demos).
  const proPlan = await Plan.findOne({
    applicationId: PAY_DOCS_DEMO_APP_SLUG,
    name: 'Pro',
  }).lean()
  const proPlanId = proPlan?._id ? proPlan._id.toString() : 'demo-plan-pro'

  const now = new Date()
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const subscriptionsToInsert: Array<Partial<PaymentDocument>> = [
    {
      projectId: PAY_DOCS_DEMO_APP_SLUG,
      projectName: 'Pay Documentation Demo',
      type: 'subscription',
      amount: 19,
      currency: 'EUR',
      userId: 'pay-docs-demo-user-active',
      customerName: 'Active Demo Customer',
      customerEmail: 'active@pay-docs-demo.test',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'pay-docs-demo-sub-active',
      status: 'completed',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: oneMonthFromNow,
      liveMode: false,
      isTestMode: true,
      metadata: {
        planId: proPlanId,
        planName: 'Pro',
        interval: 'month',
        intervalCount: 1,
        features: ['Unlimited projects', 'Priority email support', 'Analytics'],
        subscriptionStatus: 'active',
      },
      completedAt: oneWeekAgo,
    },
    {
      projectId: PAY_DOCS_DEMO_APP_SLUG,
      projectName: 'Pay Documentation Demo',
      type: 'subscription',
      amount: 19,
      currency: 'EUR',
      userId: 'pay-docs-demo-user-pastdue',
      customerName: 'Past Due Demo Customer',
      customerEmail: 'pastdue@pay-docs-demo.test',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'pay-docs-demo-sub-pastdue',
      status: 'pending',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: oneWeekAgo,
      liveMode: false,
      isTestMode: true,
      metadata: {
        planId: proPlanId,
        planName: 'Pro',
        interval: 'month',
        intervalCount: 1,
        features: ['Unlimited projects', 'Priority email support', 'Analytics'],
        subscriptionStatus: 'past_due',
      },
    },
  ]

  await Payment.insertMany(subscriptionsToInsert)
  result.subscriptionsCreated = subscriptionsToInsert.length

  // 4. Payments — 1 success / 1 refund / 1 past_due / 1 large success.
  //    Powers `<PaymentHistoryCard>` status variant rendering.
  const paymentsToInsert: Array<Partial<PaymentDocument>> = [
    {
      projectId: PAY_DOCS_DEMO_APP_SLUG,
      projectName: 'Pay Documentation Demo',
      type: 'purchase',
      amount: 19,
      currency: 'EUR',
      userId: 'pay-docs-demo-user-active',
      customerName: 'Active Demo Customer',
      customerEmail: 'active@pay-docs-demo.test',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'pay-docs-demo-pay-1-success',
      status: 'completed',
      liveMode: false,
      isTestMode: true,
      metadata: { productName: 'Pro plan — May 2026' },
      completedAt: oneWeekAgo,
    },
    {
      projectId: PAY_DOCS_DEMO_APP_SLUG,
      projectName: 'Pay Documentation Demo',
      type: 'purchase',
      amount: 19,
      currency: 'EUR',
      userId: 'pay-docs-demo-user-active',
      customerName: 'Refunded Demo Customer',
      customerEmail: 'refund@pay-docs-demo.test',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'pay-docs-demo-pay-2-refund',
      status: 'refunded',
      liveMode: false,
      isTestMode: true,
      metadata: { productName: 'Pro plan — refund example' },
      completedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: PAY_DOCS_DEMO_APP_SLUG,
      projectName: 'Pay Documentation Demo',
      type: 'subscription',
      amount: 19,
      currency: 'EUR',
      userId: 'pay-docs-demo-user-pastdue',
      customerName: 'Past Due Demo Customer',
      customerEmail: 'pastdue@pay-docs-demo.test',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'pay-docs-demo-pay-3-pastdue',
      status: 'failed',
      liveMode: false,
      isTestMode: true,
      metadata: {
        planName: 'Pro',
        subscriptionStatus: 'past_due',
        billingReason: 'subscription_cycle',
      },
    },
    {
      projectId: PAY_DOCS_DEMO_APP_SLUG,
      projectName: 'Pay Documentation Demo',
      type: 'purchase',
      amount: 99,
      currency: 'EUR',
      userId: 'pay-docs-demo-user-enterprise',
      customerName: 'Enterprise Demo Customer',
      customerEmail: 'enterprise@pay-docs-demo.test',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'pay-docs-demo-pay-4-success-large',
      status: 'completed',
      liveMode: false,
      isTestMode: true,
      metadata: { productName: 'Enterprise plan — May 2026' },
      completedAt: now,
    },
  ]

  await Payment.insertMany(paymentsToInsert)
  result.paymentsCreated = paymentsToInsert.length

  // 5. Donations — power `<DonationWall>` preview.
  const donationsToInsert: Array<Partial<PaymentDocument>> = PAY_DOCS_DEMO_DONATIONS.map(
    (d, idx) => ({
      projectId: PAY_DOCS_DEMO_APP_SLUG,
      projectName: 'Pay Documentation Demo',
      type: 'donation',
      amount: d.amount,
      currency: 'EUR',
      customerName: d.name,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: `pay-docs-demo-donation-${idx + 1}`,
      status: 'completed',
      liveMode: false,
      isTestMode: true,
      metadata: {
        message: d.message,
        isPublic: true,
      },
      completedAt: new Date(now.getTime() - (idx + 1) * 24 * 60 * 60 * 1000),
    })
  )

  await Payment.insertMany(donationsToInsert)
  result.donationsCreated = donationsToInsert.length

  // 6. Invoices — 1 paid + 1 past_due. Power `<InvoiceHistoryCard>` preview.
  const invoicesToInsert: Array<Partial<PaymentDocument>> = [
    {
      projectId: PAY_DOCS_DEMO_APP_SLUG,
      projectName: 'Pay Documentation Demo',
      type: 'invoice',
      amount: 19,
      currency: 'EUR',
      userId: 'pay-docs-demo-user-active',
      customerName: 'Active Demo Customer',
      customerEmail: 'active@pay-docs-demo.test',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'pay-docs-demo-invoice-1-paid',
      status: 'completed',
      liveMode: false,
      isTestMode: true,
      metadata: {
        invoiceNumber: 'PAY-DOCS-DEMO-INV-001',
        planName: 'Pro',
      },
      completedAt: oneWeekAgo,
    },
    {
      projectId: PAY_DOCS_DEMO_APP_SLUG,
      projectName: 'Pay Documentation Demo',
      type: 'invoice',
      amount: 19,
      currency: 'EUR',
      userId: 'pay-docs-demo-user-pastdue',
      customerName: 'Past Due Demo Customer',
      customerEmail: 'pastdue@pay-docs-demo.test',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'pay-docs-demo-invoice-2-pastdue',
      status: 'pending',
      liveMode: false,
      isTestMode: true,
      metadata: {
        invoiceNumber: 'PAY-DOCS-DEMO-INV-002',
        planName: 'Pro',
        subscriptionStatus: 'past_due',
      },
    },
  ]

  await Payment.insertMany(invoicesToInsert)
  result.invoicesCreated = invoicesToInsert.length

  return result
}

/**
 * CLI entry point. Connects to MongoDB, seeds the sandbox data, prints a
 * summary block, and exits with code 0 (success) or 1 (failure).
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezpay', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezpay')
  await connectToMongo('ezpay')

  const result = await seedPayDocsDemoData()

  logger.info(result, 'pay-docs-demo data seed result')

  console.info('')
  console.info('=== Pay Docs Demo Data seed result ===')
  console.info('')
  console.info('Pay docs demo data seeded:')
  console.info(`- Plans: ${result.plansCreated} created, ${result.plansAlreadyExisted} existed`)
  console.info(`- Subscriptions: ${result.subscriptionsCreated} (1 active / 1 past_due)`)
  console.info(`- Payments: ${result.paymentsCreated}`)
  console.info(`- Donations: ${result.donationsCreated}`)
  console.info(`- Invoices: ${result.invoicesCreated}`)
  console.info('')
  console.info(`ApplicationId: ${PAY_DOCS_DEMO_APP_SLUG}`)
  console.info('')
  console.info('Next step: copy NEXT_PUBLIC_EZPAY_DOCS_DEMO_KEY into apps/ezpay/web/.env.local')
  console.info(
    '  (the publishable key was printed by `pnpm --filter api-ezauth seed:pay-docs-demo`).'
  )
  console.info('')
  process.exit(0)
}

// Only run CLI bootstrap when executed directly, not when imported by tests.
const invokedAsScript = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  const entryUrl = new URL(`file://${entry.replace(/\\/g, '/')}`).href
  return import.meta.url === entryUrl
})()

if (invokedAsScript) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`seed-pay-docs-demo-data failed: ${msg}`)
    process.exit(1)
  })
}
