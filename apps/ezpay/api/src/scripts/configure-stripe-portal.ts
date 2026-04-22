/**
 * Configure the Stripe Customer Portal for EZPay.
 *
 * Creates (or updates) a `billing_portal.Configuration` on the platform
 * Stripe account so every `Stripe.billingPortal.sessions.create({ customer })`
 * call reuses the same set of allowed features, branding and allowed plan
 * changes. Idempotent — safe to re-run whenever the plan catalogue changes.
 *
 * Features enabled:
 *   • Payment method updates
 *   • Invoice history download
 *   • Subscription cancellation at period end
 *   • Subscription plan changes with `always_invoice` proration
 *     (the allowed target prices are pulled from the EZPay Plans collection
 *      — every active plan that has a `stripePriceId` is surfaced)
 *
 * Branding:
 *   • `business_profile.headline` — marketing line
 *   • `business_profile.terms_of_service_url` / `privacy_policy_url`
 *     (populated from env vars so apps can override per-environment)
 *
 * Usage:
 *   pnpm --filter api-ezpay configure:portal
 *
 * Env vars:
 *   STRIPE_SECRET_KEY            — required
 *   STRIPE_PORTAL_HEADLINE       — optional headline (default "Manage your subscription")
 *   STRIPE_PORTAL_TERMS_URL      — optional TOS URL (default https://ezstart.dev/terms)
 *   STRIPE_PORTAL_PRIVACY_URL    — optional privacy URL (default https://ezstart.dev/privacy)
 *
 * Idempotence — the script looks up an existing Configuration owned by this
 * script (matched via `metadata.managedBy='ezpay-script'`) and updates it in
 * place. If none exists, a new Configuration is created with that marker.
 *
 * @module apps/ezpay/api/src/scripts/configure-stripe-portal
 */
import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import Stripe from 'stripe'
import { getPlanModel } from '../models/Plan.js'

const MANAGED_BY = 'ezpay-script'
const DEFAULT_HEADLINE = 'Manage your subscription'
const DEFAULT_TOS_URL = 'https://ezstart.dev/terms'
const DEFAULT_PRIVACY_URL = 'https://ezstart.dev/privacy'

/**
 * Public result shape of {@link configureStripePortal}. Surfaced by the CLI
 * entry point and consumed by the integration tests.
 */
export interface ConfigurePortalResult {
  status: 'created' | 'updated'
  configurationId: string
  allowedPriceCount: number
}

/**
 * Resolve the list of active Stripe Price ids managed by EZPay. Used to
 * populate `subscription_update.products` on the portal configuration so the
 * customer can only switch among plans that we actually own.
 *
 * @internal
 */
export async function resolveAllowedProducts(): Promise<
  Array<{ product: string; prices: string[] }>
> {
  const Plan = await getPlanModel()
  const plans = await Plan.find({
    active: true,
    deletedAt: null,
    stripeProductId: { $exists: true, $ne: null },
    stripePriceId: { $exists: true, $ne: null },
  }).lean()

  // Group prices per product so the Stripe config respects its wire format
  // `[{ product, prices: [...] }]`.
  const byProduct = new Map<string, Set<string>>()
  for (const plan of plans) {
    if (!plan.stripeProductId || !plan.stripePriceId) continue
    const set = byProduct.get(plan.stripeProductId) ?? new Set<string>()
    set.add(plan.stripePriceId)
    byProduct.set(plan.stripeProductId, set)
  }

  return [...byProduct.entries()].map(([product, prices]) => ({
    product,
    prices: [...prices],
  }))
}

/**
 * Shape of the Stripe Billing Portal `Configuration` create/update params
 * we care about. Declared locally because the Stripe SDK does not re-export
 * `BillingPortal.ConfigurationCreateParams` under the `Stripe.*` namespace
 * in a stable way — exposing it via the module-level namespace requires an
 * import chain that breaks on ESM + `verbatimModuleSyntax` setups.
 *
 * Only the fields we actually populate are typed; the rest fall through to
 * Stripe unchanged.
 *
 * @internal
 */
export interface StripePortalConfigParams {
  business_profile: {
    headline?: string
    terms_of_service_url?: string
    privacy_policy_url?: string
  }
  features: {
    payment_method_update: { enabled: boolean }
    invoice_history: { enabled: boolean }
    customer_update: {
      enabled: boolean
      allowed_updates: Array<'email' | 'address' | 'name' | 'phone' | 'tax_id' | 'shipping'>
    }
    subscription_cancel: {
      enabled: boolean
      mode?: 'at_period_end' | 'immediately'
      proration_behavior?: 'create_prorations' | 'none' | 'always_invoice'
    }
    subscription_update:
      | {
          enabled: true
          default_allowed_updates: Array<'price' | 'quantity' | 'promotion_code'>
          proration_behavior: 'create_prorations' | 'none' | 'always_invoice'
          products: Array<{ product: string; prices: string[] }>
        }
      | { enabled: false }
  }
  metadata?: Record<string, string>
}

/**
 * Build the Stripe Customer Portal Configuration params that the script
 * submits. Extracted from the main flow so it is exercisable in unit tests
 * without hitting Stripe.
 *
 * @internal
 */
export function buildPortalConfigParams(options: {
  products: Array<{ product: string; prices: string[] }>
  headline?: string
  tosUrl?: string
  privacyUrl?: string
}): StripePortalConfigParams {
  const { products, headline, tosUrl, privacyUrl } = options

  const params: StripePortalConfigParams = {
    business_profile: {
      headline: headline ?? DEFAULT_HEADLINE,
      terms_of_service_url: tosUrl ?? DEFAULT_TOS_URL,
      privacy_policy_url: privacyUrl ?? DEFAULT_PRIVACY_URL,
    },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'address', 'name', 'phone', 'tax_id'],
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        proration_behavior: 'none',
      },
      // Only expose subscription_update when there is at least one product to
      // switch to — Stripe rejects an empty `products` array.
      subscription_update:
        products.length > 0
          ? {
              enabled: true,
              default_allowed_updates: ['price', 'quantity', 'promotion_code'],
              proration_behavior: 'always_invoice',
              products,
            }
          : { enabled: false },
    },
    metadata: {
      managedBy: MANAGED_BY,
    },
  }

  return params
}

/**
 * Core idempotent portal configuration flow.
 *
 * 1. List existing configurations and find the one owned by this script
 *    (matched via `metadata.managedBy === 'ezpay-script'`).
 * 2. Build the params from the current Plan catalogue.
 * 3. Create if missing, update in place otherwise.
 */
export async function configureStripePortal(stripe: Stripe): Promise<ConfigurePortalResult> {
  const products = await resolveAllowedProducts()
  const params = buildPortalConfigParams({
    products,
    headline: process.env.STRIPE_PORTAL_HEADLINE,
    tosUrl: process.env.STRIPE_PORTAL_TERMS_URL,
    privacyUrl: process.env.STRIPE_PORTAL_PRIVACY_URL,
  })

  // Paginate through existing configurations — usually very few.
  let existingId: string | null = null
  for await (const config of stripe.billingPortal.configurations.list({ limit: 100 })) {
    if (config.metadata?.managedBy === MANAGED_BY) {
      existingId = config.id
      break
    }
  }

  if (existingId) {
    // Update params differ slightly from create: no metadata required, but we
    // pass it anyway so legacy configurations get tagged.
    const updated = await stripe.billingPortal.configurations.update(
      existingId,
      // Stripe's Update type is a subset of Create — our params satisfy both.
      params as unknown as Parameters<typeof stripe.billingPortal.configurations.update>[1]
    )
    return {
      status: 'updated',
      configurationId: updated.id,
      allowedPriceCount: products.reduce((n, p) => n + p.prices.length, 0),
    }
  }

  const created = await stripe.billingPortal.configurations.create(
    params as unknown as Parameters<typeof stripe.billingPortal.configurations.create>[0]
  )
  return {
    status: 'created',
    configurationId: created.id,
    allowedPriceCount: products.reduce((n, p) => n + p.prices.length, 0),
  }
}

async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezpay', layer: 'api' })
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    console.error('configure-stripe-portal: STRIPE_SECRET_KEY is required')
    process.exit(1)
  }

  process.env.MONGO_URL = getMongoUrl('ezpay')
  await connectToMongo('ezpay')

  const stripe = new Stripe(stripeKey)
  const result = await configureStripePortal(stripe)

  console.info('')
  if (result.status === 'created') {
    console.info(`✅ Stripe Customer Portal configuration created: ${result.configurationId}`)
  } else {
    console.info(`✅ Stripe Customer Portal configuration updated: ${result.configurationId}`)
  }
  console.info(`   Allowed prices for subscription_update: ${result.allowedPriceCount}`)
  console.info('')
  process.exit(0)
}

const invokedAsScript = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  const entryUrl = new URL(`file://${entry.replace(/\\/g, '/')}`).href
  return import.meta.url === entryUrl
})()

if (invokedAsScript) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`configure-stripe-portal failed: ${msg}`)
    process.exit(1)
  })
}
