/**
 * Migration script — backfill `isTestMode` on every model that gained the
 * Stripe-pattern test/live partition (`standard-saas-data.md` §4).
 *
 * For each affected collection:
 *   - `Application`, `ApiKey`, `AuditLog`, `AuthCode`, `EmailChangeRequest`,
 *     `MagicLinkRequest`
 *
 * The migration is idempotent — re-running it yields zero updates on the
 * second pass (filters on `{ isTestMode: { $exists: false } }`).
 *
 * For ApiKey the value is derived from `env`:
 *   - `env: 'test'` → `isTestMode: true`
 *   - `env: 'live'` (or undefined / legacy) → `isTestMode: false`
 *
 * For all other collections the default is `isTestMode: false` (live data).
 * Test mode is opt-in for new writes; existing data is treated as live.
 *
 * ## Production safety
 *
 * Refuses to run when `NODE_ENV === 'production'` UNLESS the operator passes
 * `--force` AND a fresh backup is confirmed to exist (see
 * `.claude/rules/data-protection.md`). Even with `--force` the script is
 * read-modify-write, never destructive.
 *
 * Usage:
 *   pnpm --filter api-ezauth migrate:add-is-test-mode
 *   NODE_ENV=production pnpm --filter api-ezauth migrate:add-is-test-mode -- --force
 *
 * @module apps/ezauth/api/scripts/migrate-add-is-test-mode
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getApiKeyModel } from '../models/api-key.js'
import { getApplicationModel } from '../models/application.js'
import { getAuditLogModel } from '../models/audit-log.js'
import { getAuthCodeModel } from '../models/auth-code.js'
import { getEmailChangeRequestModel } from '../models/email-change-request.js'
import { getMagicLinkRequestModel } from '../models/magic-link-request.js'

export interface MigrationResult {
  applications: number
  apiKeys: number
  auditLogs: number
  authCodes: number
  emailChangeRequests: number
  magicLinkRequests: number
}

/**
 * Core migration logic — backfills `isTestMode` on every affected collection.
 * Idempotent. Bypasses any pre-find scope hooks via `{ skipTestModeScope: true }`
 * so the migration sees ALL documents regardless of the (likely absent)
 * request context.
 */
export async function migrateAddIsTestMode(): Promise<MigrationResult> {
  const [Application, ApiKey, AuditLog, AuthCode, EmailChangeRequest, MagicLinkRequest] =
    await Promise.all([
      getApplicationModel(),
      getApiKeyModel(),
      getAuditLogModel(),
      getAuthCodeModel(),
      getEmailChangeRequestModel(),
      getMagicLinkRequestModel(),
    ])

  const result: MigrationResult = {
    applications: 0,
    apiKeys: 0,
    auditLogs: 0,
    authCodes: 0,
    emailChangeRequests: 0,
    magicLinkRequests: 0,
  }

  // For ApiKey, derive isTestMode from env (test ↔ true, anything else ↔ false).
  // Two pass — one for test keys, one for everything else.
  const apiKeyTest = await ApiKey.updateMany(
    { env: 'test', isTestMode: { $exists: false } },
    { $set: { isTestMode: true } }
  )
  const apiKeyOther = await ApiKey.updateMany(
    { env: { $ne: 'test' }, isTestMode: { $exists: false } },
    { $set: { isTestMode: false } }
  )
  result.apiKeys = (apiKeyTest.modifiedCount ?? 0) + (apiKeyOther.modifiedCount ?? 0)

  // For everything else, default to live (isTestMode: false).
  const targets = [
    { name: 'applications' as const, model: Application },
    { name: 'auditLogs' as const, model: AuditLog },
    { name: 'authCodes' as const, model: AuthCode },
    { name: 'emailChangeRequests' as const, model: EmailChangeRequest },
    { name: 'magicLinkRequests' as const, model: MagicLinkRequest },
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
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const result = await migrateAddIsTestMode()

  console.info('')
  console.info('migrate-add-is-test-mode result (ezauth):')
  console.info(`  applications:         ${result.applications} updated`)
  console.info(`  apiKeys:              ${result.apiKeys} updated`)
  console.info(`  auditLogs:            ${result.auditLogs} updated`)
  console.info(`  authCodes:            ${result.authCodes} updated`)
  console.info(`  emailChangeRequests:  ${result.emailChangeRequests} updated`)
  console.info(`  magicLinkRequests:    ${result.magicLinkRequests} updated`)
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
