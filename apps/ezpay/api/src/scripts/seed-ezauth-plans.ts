/**
 * Seed script — bootstrap EZAuth's own subscription plans (dogfood pattern).
 *
 * Creates or updates the `Pro` (€19/mo) and `Pro Annual` (€190/yr) plans on
 * the EZAuth Application. Each plan is idempotently upserted by
 * `{applicationId, name}` so re-runs are safe: existing rows are left
 * untouched (price and features are owned by the admin once created). Only
 * brand-new rows are mirrored to Stripe via `syncPlanToStripe`.
 *
 * The two plans share the same `billingGroup='pro'` so the PricingPage
 * Monthly/Yearly toggle treats them as alternative billing cycles of the same
 * tier. `discountVsMonthly=17` on the annual plan renders the "Save 17%"
 * badge.
 *
 * On successful subscription, `metadata.grantsRoles=['pro']` materialises a
 * `user.appRoles.ezauth = ['pro']` JWT claim. `feePercent=0` because ezauth
 * is a first-party/dogfood app — no platform fee is charged on its own
 * subscriptions.
 *
 * Usage:
 *   pnpm --filter api-ezpay seed:ezauth-plans
 *
 * Preconditions:
 *   - `pnpm --filter api-ezauth seed:self-key` must have run FIRST so the
 *     `ezauth` Application exists in the ezauth source-of-truth.
 *   - `STRIPE_SECRET_KEY` must be set (real key for prod, `sk_test_*` for
 *     dev) — the sync creates Stripe Products + Prices.
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §4 (Bootstrap).
 *
 * @module apps/ezpay/api/src/scripts/seed-ezauth-plans
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { logger } from '@ezstart/logger/server'
import { getPlanModel, type PlanDocument, type PlanMetadata } from '../models/Plan.js'
import { syncPlanToStripe } from '../services/stripe-plan-sync.js'
import {
  lookupApplicationBySlug,
  type EzauthApplicationLookup,
  type EzauthClientOptions,
} from '../services/ezauth-client.js'

const SELF_APP_SLUG = 'ezauth'

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
  metadata: PlanMetadata
  trialDays?: number
  sortOrder: number
  active: boolean
}

const EZAUTH_PLAN_TEMPLATES: readonly PlanSeedTemplate[] = [
  {
    name: 'Pro',
    description: 'Unlimited apps + advanced auth features',
    amount: 1900,
    currency: 'EUR',
    interval: 'month',
    intervalCount: 1,
    features: ['Unlimited apps', 'Custom branding', 'Priority support'],
    metadata: {
      grantsRoles: ['pro'],
      grantsFeatures: ['custom-branding', 'priority-support'],
      feePercent: 0,
      billingGroup: 'pro',
    },
    trialDays: 14,
    sortOrder: 1,
    active: true,
  },
  {
    name: 'Pro Annual',
    description: 'Unlimited apps + advanced auth features — save 17% vs monthly',
    amount: 19000,
    currency: 'EUR',
    interval: 'year',
    intervalCount: 1,
    features: ['Unlimited apps', 'Custom branding', 'Priority support'],
    metadata: {
      grantsRoles: ['pro'],
      grantsFeatures: ['custom-branding', 'priority-support'],
      feePercent: 0,
      billingGroup: 'pro',
      discountVsMonthly: 17,
    },
    trialDays: 14,
    sortOrder: 2,
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
  /** Override the Stripe sync (tests inject a stub). */
  syncToStripe?: typeof syncPlanToStripe
  /** Forward ezauth client options (api url, server key, bearer). */
  ezauth?: EzauthClientOptions
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezpay')` has already been initialised.
 *
 * @throws When the ezauth `ezauth` Application cannot be resolved.
 */
export async function seedEzauthPlans(opts: SeedOptions = {}): Promise<SeedResult> {
  const lookup = opts.lookupApplication ?? lookupApplicationBySlug
  const sync = opts.syncToStripe ?? syncPlanToStripe

  const app = await lookup(SELF_APP_SLUG, opts.ezauth)
  if (!app) {
    throw new Error(
      'seed-ezauth-plans: could not resolve Application(slug="ezauth") from ezauth. ' +
        "Run 'pnpm --filter api-ezauth seed:self-key' first to bootstrap the ezauth dogfood Applications."
    )
  }

  const Plan = await getPlanModel()

  const result: SeedResult = { created: 0, alreadyExists: 0 }

  for (const tpl of EZAUTH_PLAN_TEMPLATES) {
    const existing = await Plan.findOne({ applicationId: app.id, name: tpl.name })
    if (existing) {
      result.alreadyExists += 1
      continue
    }

    const plan: PlanDocument = await Plan.create({
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
      logger.error('seed-ezauth-plans: Stripe sync failed, plan created without Stripe linkage', {
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

  const result = await seedEzauthPlans()

  logger.info('seed-ezauth-plans complete', {
    created: result.created,
    alreadyExists: result.alreadyExists,
  })

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
    logger.error('seed-ezauth-plans failed', { error: msg })
    process.exit(1)
  })
}
