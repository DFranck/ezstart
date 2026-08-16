/**
 * Migration script — backfill `isTestMode` on every ezpay model that gained
 * the Stripe-pattern test/live partition (`standard-saas-data.md` §4).
 *
 * Affected collections: `Payment`, `Plan`, `Promo`, `ConnectedAccount`,
 * `ApiKey`.
 *
 * For `Payment`, `isTestMode` is derived from the legacy `liveMode` field:
 *   - `liveMode: true` → `isTestMode: false`
 *   - `liveMode: false` (or absent) → `isTestMode: true` (test data was the
 *      historical default for un-flagged rows)
 *
 * For `ApiKey`, `isTestMode` is derived from `env`:
 *   - `env: 'test'` → `isTestMode: true`
 *   - `env: 'live'` → `isTestMode: false`
 *
 * For `Plan`, `Promo`, `ConnectedAccount` the default is `isTestMode: false`
 * (live). Test mode is opt-in for new writes.
 *
 * Idempotent — re-running yields zero updates on the second pass.
 *
 * ## Production safety
 *
 * Refuses to run when `NODE_ENV === 'production'` UNLESS the operator passes
 * `--force` AND a fresh backup is confirmed to exist (see
 * `.claude/rules/data-protection.md`). Even with `--force` the script is
 * read-modify-write, never destructive.
 *
 * Usage:
 *   pnpm --filter api-ezpay migrate:add-is-test-mode
 *   NODE_ENV=production pnpm --filter api-ezpay migrate:add-is-test-mode -- --force
 *
 * @module apps/ezpay/api/scripts/migrate-add-is-test-mode
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getApiKeyModel } from '../models/api-key.js'
import { getConnectedAccountModel } from '../models/ConnectedAccount.js'
import { getPaymentModel } from '../models/Payment.js'
import { getPlanModel } from '../models/Plan.js'
import { getPromoModel } from '../models/Promo.js'

export interface MigrationResult {
  payments: number
  plans: number
  promos: number
  connectedAccounts: number
  apiKeys: number
}

/**
 * Core migration logic — backfills `isTestMode` on every affected ezpay
 * collection. Idempotent.
 */
export async function migrateAddIsTestMode(): Promise<MigrationResult> {
  const [Payment, Plan, Promo, ConnectedAccount, ApiKey] = await Promise.all([
    getPaymentModel(),
    getPlanModel(),
    getPromoModel(),
    getConnectedAccountModel(),
    getApiKeyModel(),
  ])

  const result: MigrationResult = {
    payments: 0,
    plans: 0,
    promos: 0,
    connectedAccounts: 0,
    apiKeys: 0,
  }

  // Payment — derive isTestMode from liveMode.
  // liveMode: true → isTestMode: false (live data)
  // liveMode: false / undefined → isTestMode: true (test data — historical
  //   default for un-flagged rows; operator can flip later if needed)
  const paymentLive = await Payment.updateMany(
    { liveMode: true, isTestMode: { $exists: false } },
    { $set: { isTestMode: false } }
  )
  const paymentTest = await Payment.updateMany(
    {
      $or: [{ liveMode: false }, { liveMode: { $exists: false } }],
      isTestMode: { $exists: false },
    },
    { $set: { isTestMode: true } }
  )
  result.payments = (paymentLive.modifiedCount ?? 0) + (paymentTest.modifiedCount ?? 0)

  // ApiKey — derive isTestMode from env.
  const apiKeyTest = await ApiKey.updateMany(
    { env: 'test', isTestMode: { $exists: false } },
    { $set: { isTestMode: true } }
  )
  const apiKeyLive = await ApiKey.updateMany(
    { env: 'live', isTestMode: { $exists: false } },
    { $set: { isTestMode: false } }
  )
  result.apiKeys = (apiKeyTest.modifiedCount ?? 0) + (apiKeyLive.modifiedCount ?? 0)

  // Plan / Promo / ConnectedAccount — default to live (isTestMode: false).
  const targets = [
    { name: 'plans' as const, model: Plan },
    { name: 'promos' as const, model: Promo },
    { name: 'connectedAccounts' as const, model: ConnectedAccount },
  ]

  for (const { name, model } of targets) {
    const res = await model.updateMany(
      { isTestMode: { $exists: false } },
      { $set: { isTestMode: false } }
    )
    result[name] = res.modifiedCount ?? 0
  }

  return result
}

/**
 * Production safety guard. Refuses to run in production unless the operator
 * explicitly passes `--force`. Mirrors the `data-protection.md` template.
 */
function ensureSafeEnvironment(): void {
  const isProd = process.env.NODE_ENV === 'production'
  const forced = process.argv.includes('--force')
  if (isProd && !forced) {
    throw new Error(
      'Refusing to run in production without --force. ' +
        'Confirm a fresh backup exists, then re-run with --force. ' +
        'See .claude/rules/data-protection.md.'
    )
  }
  if (isProd && forced) {
    console.warn(
      '⚠️  Running migrate-add-is-test-mode in PRODUCTION (--force). ' +
        'Make sure a backup was taken < 1h ago.'
    )
  }
}

/** CLI entry point — boots env, connects to MongoDB, runs the migration. */
async function main(): Promise<void> {
  ensureSafeEnvironment()
  loadSharedEnv({ app: 'ezpay', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezpay')
  await connectToMongo('ezpay')

  const result = await migrateAddIsTestMode()

  console.info('')
  console.info('migrate-add-is-test-mode result (ezpay):')
  console.info(`  payments:           ${result.payments} updated`)
  console.info(`  plans:              ${result.plans} updated`)
  console.info(`  promos:             ${result.promos} updated`)
  console.info(`  connectedAccounts:  ${result.connectedAccounts} updated`)
  console.info(`  apiKeys:            ${result.apiKeys} updated`)
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
    console.error(`migrate-add-is-test-mode failed: ${msg}`)
    process.exit(1)
  })
}
