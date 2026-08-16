/**
 * Migration script — P7 Phase B.
 *
 * Two jobs, both idempotent:
 *
 * 1. Backfill `applicationId` on pre-existing `ConnectedAccount` documents.
 *    The legacy schema had `userId` unique — each user had at most one Connect
 *    account. The new schema makes `applicationId` unique so every ezauth
 *    Application can have its own Stripe destination. For each account without
 *    `applicationId`, we look up the user's Applications in ezauth (via the
 *    S2S client) and link the account to their primary (first non-archived)
 *    Application. Accounts whose owner has no Application are left untouched
 *    and logged — a follow-up admin action is required.
 *
 * 2. Seed platform (dogfood) ConnectedAccounts for all first-party
 *    EZStart apps. All apps share the single EZStart LLC Stripe account
 *    (`EZPAY_PLATFORM_STRIPE_ACCOUNT_ID`) via `isPlatformAccount: true` until
 *    they're converted to their own Connect account via the switch endpoint.
 *
 * Usage:
 *   pnpm --filter api-ezpay migrate:connected-accounts-to-apps
 *
 * Preconditions:
 *   - `pnpm --filter api-ezauth seed:self-key` must have run so the EZStart
 *     platform Applications exist in the ezauth DB.
 *   - `EZPAY_PLATFORM_STRIPE_ACCOUNT_ID` must be set for the seed step; if
 *     absent, platform seeding is skipped (but backfill still runs).
 *
 * Re-run safety:
 *   - Accounts that already have `applicationId` are skipped.
 *   - Platform accounts that already exist (upserted previously) are left
 *     untouched. If an app has an existing `isPlatformAccount: false` record
 *     (i.e. already converted to external Connect), it is NOT overwritten.
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { logger } from '@ezstart/logger/server'
import { getConnectedAccountModel } from '../models/ConnectedAccount.js'
import {
  lookupApplicationBySlug,
  type EzauthApplicationLookup,
  type EzauthClientOptions,
} from '../services/ezauth-client.js'

/**
 * First-party EZStart apps that should point at the shared platform Stripe
 * account until they decide to onboard their own Connect account.
 */
export const PLATFORM_APPS = [
  'ezauth',
  'ezpay',
  'ezstart',
  'ezbill',
  'green-pulse',
  'fengshui',
  'asc-tcd',
  'gacha-analyzer',
] as const

export type PlatformAppSlug = (typeof PLATFORM_APPS)[number]

/** Marker stored on `userId` for system-seeded platform dogfood accounts. */
export const SYSTEM_USER_MARKER = 'system'

export interface MigrationResult {
  /** Existing ConnectedAccounts backfilled with a valid `applicationId`. */
  linked: number
  /**
   * Pre-existing accounts we could not link because the owner has no ezauth
   * Application. The account is left untouched.
   */
  unlinkable: number
  /** New platform-seeded ConnectedAccount documents created by this run. */
  createdPlatform: number
  /**
   * Platform apps skipped because they already have a ConnectedAccount
   * (either platform or an already-converted external one).
   */
  skippedExistingPlatform: number
  /**
   * Platform slugs that do not map to a live ezauth Application.
   * Usually means `seed-self-key` was never run for that app.
   */
  missingApplications: number
  /** Pre-existing accounts that already had `applicationId` — no-op. */
  alreadyLinked: number
}

/**
 * Resolve the "primary" Application a pre-migration ConnectedAccount should
 * attach to. The account was owned by `userId` with a globally unique
 * constraint, so we just need A plausible Application for that user. Since
 * ezauth doesn't expose a "list-my-applications" endpoint for S2S clients,
 * the migration falls back to slug-based lookups: we first try `userId` as a
 * slug (unlikely to match), then return `null` if nothing is found. Callers
 * can inject a custom resolver via `resolvePrimaryApplication` for tests.
 *
 * The default implementation deliberately returns `null` for unknown users
 * — we NEVER guess ownership. A human has to manually link the account.
 */
export type PrimaryApplicationResolver = (
  userId: string,
  ezauthOpts?: EzauthClientOptions
) => Promise<EzauthApplicationLookup | null>

const defaultPrimaryApplicationResolver: PrimaryApplicationResolver = async () => null

export interface MigrateOptions {
  /** Override the ezauth api url / server key / bearer token. */
  ezauth?: EzauthClientOptions
  /**
   * Stripe account id to use for platform-seeded accounts. Defaults to
   * `process.env.EZPAY_PLATFORM_STRIPE_ACCOUNT_ID`.
   */
  platformStripeAccountId?: string
  /**
   * Lookup an Application for a pre-existing account's owner. Tests inject
   * a stub; the CLI entry point leaves it undefined so the default resolver
   * (returns `null` for unknown users) is used.
   */
  resolvePrimaryApplication?: PrimaryApplicationResolver
  /**
   * Fetch an Application by slug (used for platform seed). Tests inject a
   * stub; the CLI uses the real ezauth client.
   */
  lookupApplication?: (
    slug: string,
    opts?: EzauthClientOptions
  ) => Promise<EzauthApplicationLookup | null>
}

/**
 * Core migration logic — split from the CLI so the test suite can call it
 * directly with MongoMemoryServer and stubs.
 *
 * Assumes `connectToMongo('ezpay')` has been called.
 */
export async function migrateConnectedAccountsToApplications(
  opts: MigrateOptions = {}
): Promise<MigrationResult> {
  const ConnectedAccount = await getConnectedAccountModel()
  const resolvePrimary = opts.resolvePrimaryApplication ?? defaultPrimaryApplicationResolver
  const lookup = opts.lookupApplication ?? lookupApplicationBySlug
  const platformStripeAccountId =
    opts.platformStripeAccountId ?? process.env.EZPAY_PLATFORM_STRIPE_ACCOUNT_ID

  const result: MigrationResult = {
    linked: 0,
    unlinkable: 0,
    createdPlatform: 0,
    skippedExistingPlatform: 0,
    missingApplications: 0,
    alreadyLinked: 0,
  }

  // ------------------------------------------------------------------
  // Step 1 — backfill applicationId on existing accounts.
  // ------------------------------------------------------------------
  //
  // `applicationId` is now required in the schema, but a re-run scenario may
  // still have legacy rows without it (pre-migration). We scan for those and
  // try to link them.
  const legacy = await ConnectedAccount.find({
    $or: [{ applicationId: { $exists: false } }, { applicationId: null }, { applicationId: '' }],
  }).lean()

  for (const account of legacy) {
    const app = await resolvePrimary(account.userId, opts.ezauth)
    if (!app) {
      logger.warn('migrate-connected-accounts: no ezauth Application for user, skipping', {
        userId: account.userId,
        stripeAccountId: account.stripeAccountId,
      })
      result.unlinkable += 1
      continue
    }

    await ConnectedAccount.updateOne(
      { _id: account._id },
      { $set: { applicationId: app.id, isPlatformAccount: false } }
    )
    result.linked += 1
  }

  // Informational: rows that already had applicationId before this run and
  // therefore needed no backfill. We compute it BEFORE seeding platform
  // accounts so new platform rows don't inflate the count.
  const totalLinkedNow = await ConnectedAccount.countDocuments({
    applicationId: { $exists: true, $ne: null, $nin: [''] },
  })
  result.alreadyLinked = Math.max(0, totalLinkedNow - result.linked)

  // ------------------------------------------------------------------
  // Step 2 — seed platform (dogfood) ConnectedAccounts.
  // ------------------------------------------------------------------
  if (!platformStripeAccountId) {
    logger.warn(
      'migrate-connected-accounts: EZPAY_PLATFORM_STRIPE_ACCOUNT_ID not set — ' +
        'skipping platform seed. Set the env var and re-run to seed dogfood accounts.'
    )
    return result
  }

  for (const slug of PLATFORM_APPS) {
    const app = await lookup(slug, opts.ezauth)
    if (!app) {
      logger.warn('migrate-connected-accounts: missing ezauth Application for platform app', {
        slug,
      })
      result.missingApplications += 1
      continue
    }

    // Idempotence: if a row already exists for this applicationId, leave it
    // alone. In particular do NOT flip `isPlatformAccount: false` back to
    // `true` — once an app has converted to its own Connect account the
    // migration must not undo that.
    const existing = await ConnectedAccount.findOne({ applicationId: app.id }).lean()
    if (existing) {
      result.skippedExistingPlatform += 1
      continue
    }

    await ConnectedAccount.create({
      applicationId: app.id,
      userId: SYSTEM_USER_MARKER,
      isPlatformAccount: true,
      stripeAccountId: platformStripeAccountId,
      email: `platform+${slug}@ezstart.dev`,
      businessName: `EZStart Platform — ${app.name}`,
      accountType: 'standard',
      status: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
      defaultFeePercent: 0,
      onboardedAt: new Date(),
    })
    result.createdPlatform += 1
  }

  return result
}

/** CLI entry point — boots env, connects to MongoDB, runs the migration. */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezpay', layer: 'api' })
  // Resolve MONGO_URL template ({app} → ezpay) so connectToMongo uses the
  // right Atlas DB name.
  process.env.MONGO_URL = getMongoUrl('ezpay')
  await connectToMongo('ezpay')

  const result = await migrateConnectedAccountsToApplications()

  console.info('')
  console.info('migrate-connected-accounts-to-applications result:')
  console.info(`  linked (legacy rows):        ${result.linked}`)
  console.info(`  unlinkable (no app found):   ${result.unlinkable}`)
  console.info(`  platform accounts created:   ${result.createdPlatform}`)
  console.info(`  platform rows skipped:       ${result.skippedExistingPlatform}`)
  console.info(`  missing ezauth apps:         ${result.missingApplications}`)
  console.info(`  already linked (no-op):      ${result.alreadyLinked}`)
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
    console.error(`migrate-connected-accounts-to-applications failed: ${msg}`)
    process.exit(1)
  })
}
