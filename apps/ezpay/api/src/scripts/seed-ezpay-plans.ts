/**
 * Seed script — bootstrap EZPay's own 3 subscription plans (dogfood pattern).
 *
 * Creates or updates `Starter` (free), `Growth` (49€/mo), `Enterprise`
 * (199€/mo) plans on the EZPay Application. Each plan is idempotently
 * upserted by `{applicationId, name}` so re-runs are safe: existing rows are
 * left untouched (price and features are owned by the admin once created).
 * Only brand-new rows are mirrored to Stripe via `syncPlanToStripe`.
 *
 * Usage:
 *   pnpm --filter api-ezpay seed:plans
 *
 * Preconditions:
 *   - `pnpm --filter api-ezauth seed:self-key` must have run FIRST so the
 *     `ezpay` Application exists in the ezauth source-of-truth.
 *   - `STRIPE_SECRET_KEY` must be set (real key for prod, `sk_test_*` for
 *     dev) — the sync creates Stripe Products + Prices.
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §4 (Bootstrap).
 *
 * @module apps/ezpay/api/src/scripts/seed-ezpay-plans
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { logger } from '@ezstart/logger/server'
import { getPlanModel } from '../models/Plan.js'
import { syncPlanToStripe } from '../services/stripe-plan-sync.js'
import {
  lookupApplicationBySlug,
  type EzauthApplicationLookup,
  type EzauthClientOptions,
} from '../services/ezauth-client.js'

const SELF_APP_SLUG = 'ezpay'

/**
 * Plan seed template — stable input for the upsert operation. `amount` is in
 * minor currency units (cents). Idempotency is keyed on `{applicationId, name}`.
 */
interface PlanSeedTemplate {
  name: string
  description: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features: string[]
  metadata: { feePercent: number }
  sortOrder: number
  active: boolean
}

const EZPAY_PLAN_TEMPLATES: readonly PlanSeedTemplate[] = [
  {
    name: 'Starter',
    description: 'Free tier for new projects',
    amount: 0,
    currency: 'EUR',
    interval: 'month',
    intervalCount: 1,
    features: ['Basic dashboard', 'Email support'],
    metadata: { feePercent: 5 },
    sortOrder: 1,
    active: true,
  },
  {
    name: 'Growth',
    description: 'Scale-up plan for growing businesses',
    amount: 4900,
    currency: 'EUR',
    interval: 'month',
    intervalCount: 1,
    features: ['Advanced analytics', 'Priority email support'],
    metadata: { feePercent: 3 },
    sortOrder: 2,
    active: true,
  },
  {
    name: 'Enterprise',
    description: 'Custom solutions for enterprise needs',
    amount: 19900,
    currency: 'EUR',
    interval: 'month',
    intervalCount: 1,
    features: ['Custom analytics', 'Priority support', 'Dedicated account manager'],
    metadata: { feePercent: 1.5 },
    sortOrder: 3,
    active: true,
  },
] as const

export interface SeedResult {
  /** Plans newly created by this run. */
  created: number
  /** Plans that already existed (idempotence path). */
  alreadyExists: number
}

export interface SeedOptions {
  /**
   * Override the ezauth Application lookup (tests inject a stub). Defaults to
   * the real {@link lookupApplicationBySlug} S2S call.
   */
  lookupApplication?: (
    slug: string,
    opts?: EzauthClientOptions
  ) => Promise<EzauthApplicationLookup | null>
  /**
   * Override the Stripe sync (tests inject a stub). Defaults to the real
   * {@link syncPlanToStripe} call.
   */
  syncToStripe?: (
    plan: Awaited<ReturnType<typeof getPlanModel>> extends infer _ ? never : never
  ) => never
  /** Forward ezauth client options (api url, server key, bearer). */
  ezauth?: EzauthClientOptions
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezpay')` has already been initialised.
 *
 * @throws When the ezauth `ezpay` Application cannot be resolved.
 */
export async function seedEzpayPlans(
  opts: {
    lookupApplication?: (
      slug: string,
      opts?: EzauthClientOptions
    ) => Promise<EzauthApplicationLookup | null>
    syncToStripe?: typeof syncPlanToStripe
    ezauth?: EzauthClientOptions
  } = {}
): Promise<SeedResult> {
  const lookup = opts.lookupApplication ?? lookupApplicationBySlug
  const sync = opts.syncToStripe ?? syncPlanToStripe

  const app = await lookup(SELF_APP_SLUG, opts.ezauth)
  if (!app) {
    throw new Error(
      'seed-ezpay-plans: could not resolve Application(slug="ezpay") from ezauth. ' +
        "Run 'pnpm --filter api-ezauth seed:self-key' first to bootstrap the ezauth dogfood Applications."
    )
  }

  const Plan = await getPlanModel()

  const result: SeedResult = { created: 0, alreadyExists: 0 }

  for (const tpl of EZPAY_PLAN_TEMPLATES) {
    const existing = await Plan.findOne({ applicationId: app.id, name: tpl.name })
    if (existing) {
      result.alreadyExists += 1
      continue
    }

    const plan = await Plan.create({
      ...tpl,
      applicationId: app.id,
      appName: app.slug,
    })

    try {
      const stripeIds = await sync(plan)
      plan.stripeProductId = stripeIds.stripeProductId
      plan.stripePriceId = stripeIds.stripePriceId
      await plan.save()
    } catch (err) {
      logger.error('seed-ezpay-plans: Stripe sync failed, plan created without Stripe linkage', {
        planId: String(plan._id),
        planName: plan.name,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    result.created += 1
  }

  return result
}

/** CLI entry point — boots env, connects to MongoDB, runs the seed. */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezpay', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezpay')
  await connectToMongo('ezpay')

  const result = await seedEzpayPlans()

  console.info('')
  console.info(
    `Seed ezpay plans complete: created ${result.created}, already exists ${result.alreadyExists}`
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
    console.error(`seed-ezpay-plans failed: ${msg}`)
    process.exit(1)
  })
}
