/**
 * Seed script — bootstrap the `_pay-docs-demo` sandbox Application in ezauth
 * (PAY_DOCS_DEMO_SANDBOX-001 = #178, mirror of #163).
 *
 * The `_pay-docs-demo` Application powers live previews on
 * `/docs/pay/*` (PricingPage, SubscriptionCard, DonationWall,
 * PayAdminDashboard, etc.). It is a SISTER sandbox to the ezauth-side
 * `_docs-demo` (which powers /docs/auth/* previews) — both share the same
 * design but are TOTALLY isolated:
 *
 *  - `reservedSlug: true` — only superadmins may create `_*` slugs via the
 *    `POST /api/applications` route (already enforced by #163's
 *    create.ts guard, applies to any `_*` slug).
 *  - `isPlatformOwned: true` — bypasses billing fees / Pro feature gates
 *    so dogfood data can flow without payment friction.
 *  - `isTestMode: true` — Stripe-pattern test/live partition. Every payment
 *    / subscription / plan attached to the sandbox is auto-scoped via the
 *    `testModeScopePlugin` so live data is invisible to it (and vice versa).
 *  - `quotas: { maxUsers: 50, maxEventsPerDay: 200 }` — hard caps enforced
 *    by ezpay's `middleware/check-pay-demo-quotas.ts`. The lower cap (vs
 *    `_docs-demo`'s 100/500) reflects the heavier per-action cost of
 *    pay-side mutations (Stripe API calls, webhook processing).
 *  - 24h reset cron (see ezpay
 *    `services/pay-docs-demo-reset.service.ts`) wipes sandbox payments,
 *    subscriptions, donations, invoices, plans created post-seed and
 *    re-seeds the baseline (3 plans + 2 subscriptions + 4 sample payments
 *    + 5 donations) so the sandbox always shows fresh, consistent data.
 *
 * This ezauth-side seed ONLY creates the Application document. The ezpay
 * counterpart (`apps/ezpay/api/src/scripts/seed-pay-docs-demo-app.ts`)
 * creates the API keys + sample payments / subscriptions / plans /
 * donations in the ezpay DB. Keep both in lockstep — re-running either is
 * idempotent.
 *
 * Idempotent: re-running with the existing Application is a no-op.
 *
 * Usage:
 *   pnpm --filter api-ezauth seed:pay-docs-demo
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §4 (Bootstrap)
 * + `.claude/rules/standard-saas-data.md` §4 (test mode isolation).
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { Types } from 'mongoose'
import { logger } from '@ezstart/logger/server'
import { getApplicationModel, type ApplicationDocument } from '../models/application.js'

/** Marker used to identify the pay-docs-demo seed Application for idempotence. */
export const PAY_DOCS_DEMO_SEED_MARKER = 'system-seed-pay-docs-demo'

/** Reserved slug for the pay documentation sandbox Application. */
export const PAY_DOCS_DEMO_APP_SLUG = '_pay-docs-demo'

/**
 * Quotas applied to the pay-docs-demo Application. Lower than `_docs-demo`
 * (100 users / 500 events per day) because each pay-side mutation triggers
 * heavier downstream work (Stripe API calls, webhook fan-out).
 */
export const PAY_DOCS_DEMO_QUOTAS = {
  maxUsers: 50,
  maxEventsPerDay: 200,
} as const

/** Result returned by {@link seedPayDocsDemoApp}. */
export interface SeedPayDocsDemoAppResult {
  applicationStatus: 'created' | 'already-exists'
  applicationId: string
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezauth')` has been called (or will be called
 * inside via factory functions).
 */
export async function seedPayDocsDemoApp(): Promise<SeedPayDocsDemoAppResult> {
  const Application = await getApplicationModel()

  // Find-or-create the `_pay-docs-demo` Application. Use `includeArchived` so
  // a previously archived sandbox is detected (avoids E11000 dup-key on the
  // unique `slug` index).
  let appDoc = await Application.findOne({ slug: PAY_DOCS_DEMO_APP_SLUG }, null, {
    includeArchived: true,
  })
  let applicationStatus: 'created' | 'already-exists'

  if (appDoc) {
    applicationStatus = 'already-exists'
    // Self-heal: if the Application predates this seed (no quotas / not
    // marked reserved), patch the metadata in place. Keeps the doc id stable
    // so existing keys / pay records keep referencing it.
    let needsPatch = false
    if (!appDoc.reservedSlug) {
      appDoc.reservedSlug = true
      needsPatch = true
    }
    if (!appDoc.isPlatformOwned) {
      appDoc.isPlatformOwned = true
      needsPatch = true
    }
    if (!appDoc.isTestMode) {
      appDoc.isTestMode = true
      needsPatch = true
    }
    if (!appDoc.quotas) {
      appDoc.quotas = { ...PAY_DOCS_DEMO_QUOTAS }
      needsPatch = true
    }
    if (needsPatch) {
      await appDoc.save()
    }
  } else {
    appDoc = await Application.create({
      slug: PAY_DOCS_DEMO_APP_SLUG,
      name: 'Pay Documentation Demo',
      description:
        'Sandbox Application for /docs/pay/* live previews. Sample plans, subscriptions, payments, and donations reset every 24h. Hard-isolated from any tenant data.',
      ownerId: 'system',
      createdBy: PAY_DOCS_DEMO_SEED_MARKER,
      status: 'active',
      isPlatformOwned: true,
      isTestMode: true,
      reservedSlug: true,
      quotas: { ...PAY_DOCS_DEMO_QUOTAS },
    } satisfies Partial<ApplicationDocument>)
    applicationStatus = 'created'
  }

  const applicationObjectId = appDoc._id as Types.ObjectId
  const applicationId = applicationObjectId.toString()

  return {
    applicationStatus,
    applicationId,
  }
}

/**
 * CLI entry point. Connects to MongoDB, seeds the Application, prints a
 * summary block, and exits the process with code 0 (success) or 1 (failure).
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  // Resolve MONGO_URL template ({app}-{env} → ezauth) like the API bootstrap
  // does via instrument.mts.
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const result = await seedPayDocsDemoApp()

  logger.info(
    {
      applicationStatus: result.applicationStatus,
      applicationId: result.applicationId,
      slug: PAY_DOCS_DEMO_APP_SLUG,
    },
    'pay-docs-demo Application seed result'
  )

  console.info('')
  console.info('=== Pay Docs Demo Application seed result ===')
  console.info('')
  console.info(`  Application: ${result.applicationStatus.toUpperCase()}`)
  console.info(`  slug: ${PAY_DOCS_DEMO_APP_SLUG}`)
  console.info(`  applicationId: ${result.applicationId}`)
  console.info('')
  console.info('Next step:')
  console.info('  pnpm --filter api-ezpay seed:pay-docs-demo')
  console.info('')
  console.info('  → Creates the ezpay API keys + sample plans + payments')
  console.info('    + donations + subscriptions for this Application.')
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
    console.error(`seed-pay-docs-demo-app failed: ${msg}`)
    process.exit(1)
  })
}
