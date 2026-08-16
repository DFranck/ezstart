/**
 * Seed script — bootstrap the EZPay self-key (dogfood pattern).
 *
 * The EZPay Application lives in the ezauth source-of-truth (created by
 * `pnpm --filter api-ezauth seed:self-key`). This script:
 *
 * 1. Resolves the `ezpay` Application via the ezauth public lookup endpoint
 *    (`GET /api/applications/lookup?slug=ezpay`).
 * 2. Idempotently persists a single EZPay API key in the ezpay DB with
 *    `createdBy='system-seed'`. If one already exists (active), the script
 *    is a no-op.
 * 3. Prints the raw key ONCE so it can be copied into
 *    `apps/ezpay/web/.env.local` as `NEXT_PUBLIC_EZPAY_KEY`.
 *
 * Usage:
 *   pnpm --filter api-ezpay seed:self-key
 *
 * Preconditions:
 *   - `pnpm --filter api-ezauth seed:self-key` must have been run FIRST so
 *     the `ezpay` Application exists in the ezauth DB.
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §4 (Bootstrap).
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getApiKeyModel } from '../models/api-key.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../utils/api-key.js'
import { lookupApplicationBySlug, type EzauthClientOptions } from '../services/ezauth-client.js'

/** Marker used to identify system-seeded entities for idempotence. */
const SYSTEM_SEED_MARKER = 'system-seed'
const SELF_APP_SLUG = 'ezpay'

/** Result of {@link seedSelfKey}. */
export interface SeedSelfKeyResult {
  status: 'created' | 'already-exists'
  /** Prefix (safe to log) of the existing or newly-created key. */
  keyPrefix: string
  /** Resolved ezauth Application id this key is linked to. */
  applicationId: string
  /** Raw key — ONLY present when `status === 'created'`. Never log anywhere else. */
  rawKey?: string
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezpay')` has already been initialised.
 *
 * @param ezauthOpts - Optional options forwarded to `lookupApplicationBySlug`
 *                    (overriding `apiUrl`, `serverKey`, etc.). Tests inject a
 *                    stub apiUrl; production leaves it undefined.
 * @throws When the ezauth `ezpay` Application cannot be resolved. The caller
 *         must run `pnpm --filter api-ezauth seed:self-key` first.
 */
export async function seedSelfKey(
  ezauthOpts: EzauthClientOptions = {}
): Promise<SeedSelfKeyResult> {
  const app = await lookupApplicationBySlug(SELF_APP_SLUG, ezauthOpts)
  if (!app) {
    throw new Error(
      'seed-self-key (ezpay): could not resolve Application(slug="ezpay") from ezauth. ' +
        "Run 'pnpm --filter api-ezauth seed:self-key' first to bootstrap the ezauth dogfood Applications."
    )
  }

  const ApiKey = await getApiKeyModel()

  // Idempotence: if ANY system-seed key for this Application already exists
  // (active OR revoked), the script is a no-op. A revoked seed key is an
  // EXPLICIT admin decision — re-running the seed must NOT quietly mint a new
  // one. To rotate, delete the row manually and re-run.
  const existing = await ApiKey.findOne({
    applicationId: app.id,
    createdBy: SYSTEM_SEED_MARKER,
  })
    .sort({ createdAt: -1 })
    .lean()

  if (existing) {
    return {
      status: 'already-exists',
      keyPrefix: existing.keyPrefix,
      applicationId: app.id,
    }
  }

  const rawKey = generateRawApiKey({ type: 'publishable', env: 'live' })
  const hashedKey = hashApiKey(rawKey)
  const keyPrefix = extractKeyPrefix(rawKey)

  await ApiKey.create({
    key: hashedKey,
    keyPrefix,
    name: 'EZPay self-key (system seed)',
    userId: 'system',
    applicationId: app.id,
    appSlug: app.slug,
    type: 'publishable',
    env: 'live',
    scope: 'admin',
    permissions: ['*'],
    status: 'active',
    createdBy: SYSTEM_SEED_MARKER,
    quotaMonthly: null,
  })

  return {
    status: 'created',
    keyPrefix,
    applicationId: app.id,
    rawKey,
  }
}

/**
 * CLI entry point. Loads env, connects to MongoDB, seeds the key, prints the
 * result block, and exits the process with code 0 (success) or 1 (failure).
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezpay', layer: 'api' })
  // Resolve MONGO_URL template ({app} → ezpay) like the API bootstrap does via
  // instrument.mts. Without this, connectToMongo would use the literal
  // template string as the DB name in Atlas.
  process.env.MONGO_URL = getMongoUrl('ezpay')
  await connectToMongo('ezpay')

  const result = await seedSelfKey()

  if (result.status === 'already-exists') {
    console.info(
      `ezpay self-key already exists (prefix: ${result.keyPrefix}, applicationId: ${result.applicationId}). Skipping.`
    )
    process.exit(0)
  }

  // status === 'created' — rawKey is guaranteed to be present.
  const rawKey = result.rawKey
  if (!rawKey) {
    console.error('seed-self-key (ezpay): internal error — created without rawKey')
    process.exit(1)
  }

  // ⚠️ Raw key is printed exactly ONCE here. Do not add it to any other log.
  console.info('')
  console.info('✅ EZPay self-key created')
  console.info('')
  console.info(`   Linked to ezauth Application(slug=ezpay, id=${result.applicationId})`)
  console.info('')
  console.info('   Raw key (shown ONCE, save now):')
  console.info(`   ${rawKey}`)
  console.info('')
  console.info('   → Paste into apps/ezpay/web/.env.local:')
  console.info(`   NEXT_PUBLIC_EZPAY_KEY=${rawKey}`)
  console.info('')
  console.info('Restart your dev server (pnpm dev pay or pnpm dev ez) to apply.')
  process.exit(0)
}

// Only run CLI bootstrap when executed directly, not when imported by tests.
// `import.meta.url` vs `process.argv[1]` detection works for both tsx and node.
const invokedAsScript = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  // Normalise to file URL for cross-platform (Windows) comparison.
  const entryUrl = new URL(`file://${entry.replace(/\\/g, '/')}`).href
  return import.meta.url === entryUrl
})()

if (invokedAsScript) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`seed-self-key (ezpay) failed: ${msg}`)
    process.exit(1)
  })
}
