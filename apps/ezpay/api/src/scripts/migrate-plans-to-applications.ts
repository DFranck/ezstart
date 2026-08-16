/**
 * Migration script — backfill `applicationId` on all Plan documents (P7 Phase A).
 *
 * For each `Plan` without `applicationId`:
 * - Skip if `appName` is missing or does not match the Application slug regex.
 * - Otherwise look the slug up in ezauth via the S2S client; if the lookup
 *   returns `null` we skip the row (pointing to a missing Application is
 *   logged but NOT fatal — a human has to fix the data).
 * - Otherwise persist `applicationId = app.id` on the plan.
 *
 * Idempotent: a second pass finds zero plans without `applicationId` and is
 * a no-op. Safe to re-run in any environment.
 *
 * Usage:
 *   pnpm --filter api-ezpay migrate:plans-to-apps
 *
 * @module apps/ezpay/api/src/scripts/migrate-plans-to-applications
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { logger } from '@ezstart/logger/server'
import { getPlanModel } from '../models/Plan.js'
import {
  lookupApplicationBySlug,
  type EzauthApplicationLookup,
  type EzauthClientOptions,
} from '../services/ezauth-client.js'

/** Matches the Application slug regex from `apps/ezauth/api/src/models/application.ts`. */
const APPLICATION_SLUG_REGEX = /^[a-z0-9-]{2,32}$/

export interface MigrationResult {
  /** Plans linked to an existing Application by slug. */
  linked: number
  /** Plans skipped because they had no appName or the lookup returned null. */
  skipped: number
  /** Plans skipped because `appName` is not a valid slug (cannot be resolved). */
  skippedInvalid: number
}

export interface MigrateOptions {
  /**
   * Override the ezauth client (tests inject a stub). Defaults to the real
   * {@link lookupApplicationBySlug} S2S call.
   */
  lookupApplication?: (
    slug: string,
    opts?: EzauthClientOptions
  ) => Promise<EzauthApplicationLookup | null>
  /** Options forwarded to each ezauth lookup (api url, server key, etc.). */
  ezauth?: EzauthClientOptions
}

/**
 * Core migration logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezpay')` has already been initialised.
 */
export async function migratePlansToApplications(
  opts: MigrateOptions = {}
): Promise<MigrationResult> {
  const Plan = await getPlanModel()
  const lookup = opts.lookupApplication ?? lookupApplicationBySlug

  const result: MigrationResult = {
    linked: 0,
    skipped: 0,
    skippedInvalid: 0,
  }

  const legacy = await Plan.find({
    $or: [{ applicationId: { $exists: false } }, { applicationId: null }, { applicationId: '' }],
  }).lean()

  for (const plan of legacy) {
    const slug = plan.appName
    if (!slug) {
      logger.warn('migrate-plans: plan has no appName, skipping', { planId: String(plan._id) })
      result.skipped += 1
      continue
    }

    if (!APPLICATION_SLUG_REGEX.test(slug)) {
      logger.warn('migrate-plans: invalid slug, skipping', {
        planId: String(plan._id),
        slug,
      })
      result.skippedInvalid += 1
      continue
    }

    const app = await lookup(slug, opts.ezauth)
    if (!app) {
      logger.warn('migrate-plans: no ezauth Application for slug, skipping', {
        planId: String(plan._id),
        slug,
      })
      result.skipped += 1
      continue
    }

    await Plan.updateOne({ _id: plan._id }, { $set: { applicationId: app.id } })
    result.linked += 1
  }

  return result
}

/** CLI entry point — boots env, connects to MongoDB, runs the migration. */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezpay', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezpay')
  await connectToMongo('ezpay')

  const result = await migratePlansToApplications()

  console.info('')
  console.info('migrate-plans-to-applications result:')
  console.info(`  linked:          ${result.linked}`)
  console.info(`  skipped:         ${result.skipped}`)
  console.info(`  skipped invalid: ${result.skippedInvalid}`)
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
    console.error(`migrate-plans-to-applications failed: ${msg}`)
    process.exit(1)
  })
}
