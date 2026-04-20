/**
 * Seed script — bootstrap the ezauth self-key (dogfood pattern).
 *
 * Idempotent: if a key with `createdBy='system-seed'`, `appName='ezauth'` and
 * `status='active'` already exists, the script is a no-op and exits 0.
 *
 * Otherwise, it generates a new `ez_pk_live_*` publishable key with admin scope,
 * persists the hashed version in MongoDB, and prints the raw key ONCE so it can
 * be copied into `apps/ezauth/web/.env.local` (`NEXT_PUBLIC_EZAUTH_KEY`).
 *
 * Usage:
 *   pnpm --filter api-ezauth seed:self-key
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §4 (Bootstrap).
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getApiKeyModel } from '../models/api-key.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../utils/api-key.js'

/** Marker used to identify system-seeded keys for idempotence. */
const SYSTEM_SEED_MARKER = 'system-seed'
const SELF_APP_NAME = 'ezauth'

/** Result of {@link seedSelfKey}. */
export interface SeedSelfKeyResult {
  status: 'created' | 'already-exists'
  /** Prefix (safe to log) of the existing or newly-created key. */
  keyPrefix: string
  /** Raw key — ONLY present when `status === 'created'`. Never log anywhere else. */
  rawKey?: string
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezauth')` has been called (or is called inside —
 * the function is safe to call multiple times thanks to the singleton).
 *
 * @returns `{ status: 'already-exists' }` if a seeded key already lives in DB,
 *          `{ status: 'created', rawKey }` when a new key was just persisted.
 */
export async function seedSelfKey(): Promise<SeedSelfKeyResult> {
  const ApiKey = await getApiKeyModel()

  const existing = await ApiKey.findOne({
    appName: SELF_APP_NAME,
    createdBy: SYSTEM_SEED_MARKER,
    status: 'active',
  }).lean()

  if (existing) {
    return {
      status: 'already-exists',
      keyPrefix: existing.keyPrefix,
    }
  }

  const rawKey = generateRawApiKey({ type: 'publishable', env: 'live' })
  const hashedKey = hashApiKey(rawKey)
  const keyPrefix = extractKeyPrefix(rawKey)

  await ApiKey.create({
    key: hashedKey,
    keyPrefix,
    name: 'EZAuth self-key (system seed)',
    userId: 'system',
    appName: SELF_APP_NAME,
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
    rawKey,
  }
}

/**
 * CLI entry point. Connects to MongoDB, seeds the key, prints the result block,
 * and exits the process with code 0 (success) or 1 (failure).
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  await connectToMongo('ezauth')

  const result = await seedSelfKey()

  if (result.status === 'already-exists') {
    console.info(`ezauth self-key already exists (prefix: ${result.keyPrefix}). Skipping.`)
    process.exit(0)
  }

  // status === 'created' — rawKey is guaranteed to be present.
  const rawKey = result.rawKey
  if (!rawKey) {
    console.error('seed-self-key: internal error — created without rawKey')
    process.exit(1)
  }

  // ⚠️ Raw key is printed exactly ONCE here. Do not add it to any other log.
  console.info('')
  console.info('✅ EZAuth self-key created')
  console.info('')
  console.info('   Raw key (showed ONCE, save now):')
  console.info(`   ${rawKey}`)
  console.info('')
  console.info('   → Paste into apps/ezauth/web/.env.local:')
  console.info(`   NEXT_PUBLIC_EZAUTH_KEY=${rawKey}`)
  console.info('')
  console.info('Restart your dev server (pnpm dev ez) to apply.')
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
    console.error(`seed-self-key failed: ${msg}`)
    process.exit(1)
  })
}
