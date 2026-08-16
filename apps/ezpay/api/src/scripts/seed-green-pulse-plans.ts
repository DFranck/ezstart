/**
 * Seed script — bootstrap GreenPulse's Free plan ("Self-Awareness") in EZPay.
 *
 * Creates the `Self-Awareness` Free plan (amount=0) on the `green-pulse`
 * Application so the chat sidebar (and any future PricingPage) renders the
 * canonical label dynamically instead of hard-coding it in i18n.
 *
 * Idempotent: keyed on `{applicationId, name}` — re-runs are safe and leave
 * existing rows untouched. Free plans are NOT mirrored to Stripe (amount=0
 * has no Stripe Product/Price counterpart).
 *
 * Usage:
 *   pnpm --filter api-ezpay seed:green-pulse-plans
 *
 * Preconditions:
 *   - The `green-pulse` Application must exist in ezauth source-of-truth.
 *     Run `pnpm --filter api-ezauth seed:consumer-app-keys` first if needed.
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §4 (Bootstrap).
 *
 * @module apps/ezpay/api/src/scripts/seed-green-pulse-plans
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

const APP_SLUG = 'green-pulse'

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
  sortOrder: number
  active: boolean
}

const GREEN_PULSE_PLAN_TEMPLATES: readonly PlanSeedTemplate[] = [
  {
    name: 'Self-Awareness',
    description: 'For self-awareness & curious CEOs — start your sustainability journey free.',
    amount: 0,
    currency: 'EUR',
    interval: 'month',
    intervalCount: 1,
    features: [
      'Conversational AI ESG assistant (GreenPulse Agent)',
      'Simple carbon footprint awareness',
      'Quick wins identification (energy, waste, costs)',
      'Educational sustainability tips',
      'Explore green marketing opportunities',
    ],
    metadata: {
      grantsRoles: ['free'],
      grantsFeatures: ['chat', 'self-awareness'],
      feePercent: 0,
      billingGroup: 'self-awareness',
    },
    sortOrder: 1,
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
 * @throws When the ezauth `green-pulse` Application cannot be resolved.
 */
export async function seedGreenPulsePlans(opts: SeedOptions = {}): Promise<SeedResult> {
  const lookup = opts.lookupApplication ?? lookupApplicationBySlug
  const sync = opts.syncToStripe ?? syncPlanToStripe

  const app = await lookup(APP_SLUG, opts.ezauth)
  if (!app) {
    throw new Error(
      'seed-green-pulse-plans: could not resolve Application(slug="green-pulse") from ezauth. ' +
        "Run 'pnpm --filter api-ezauth seed:consumer-app-keys' first to bootstrap consumer Applications."
    )
  }

  const Plan = await getPlanModel()

  const result: SeedResult = { created: 0, alreadyExists: 0 }

  for (const tpl of GREEN_PULSE_PLAN_TEMPLATES) {
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

    // Free plans (amount=0) are not mirrored to Stripe — Stripe rejects
    // €0 recurring Prices. Skip the sync to avoid noise in logs.
    if (plan.amount > 0) {
      try {
        const stripeIds = await sync(plan)
        plan.stripeProductId = stripeIds.stripeProductId
        plan.stripePriceId = stripeIds.stripePriceId
        await plan.save()
      } catch (err) {
        logger.error(
          'seed-green-pulse-plans: Stripe sync failed, plan created without Stripe linkage',
          {
            planId: String(plan._id),
            planName: plan.name,
            error: err instanceof Error ? err.message : String(err),
          }
        )
      }
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

  const result = await seedGreenPulsePlans()

  logger.info('seed-green-pulse-plans complete', {
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
    logger.error('seed-green-pulse-plans failed', { error: msg })
    process.exit(1)
  })
}
