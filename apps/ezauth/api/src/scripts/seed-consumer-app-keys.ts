/**
 * Seed script — bootstrap publishable keys for consumer apps (CROSS-KEY-001).
 *
 * For each consumer app slug in {@link CONSUMER_APP_SLUGS}:
 * 1. Ensures an `Application` document exists (find-or-create with
 *    `ownerId='system'`, `createdBy='system-seed-consumer'`).
 * 2. Ensures exactly one active `ApiKey` with `createdBy='system-seed-consumer'`,
 *    `scope='user'`, `type='publishable'`, `env='live'` linked to that
 *    Application. Generates a fresh `ez_pk_live_<hex>` and prints it ONCE
 *    (raw key shown only when newly created — re-running is a safe no-op).
 *
 * Idempotent: re-running the script with existing keys is a no-op and exits 0.
 *
 * Usage:
 *   pnpm --filter api-ezauth seed:consumer-app-keys
 *
 * For staging:
 *   railway run --service ezauth-api --environment staging -- \
 *     pnpm --filter api-ezauth seed:consumer-app-keys
 *
 * IMPORTANT: the raw keys are printed exactly once when newly created.
 * Capture them immediately into `tmp/consumer-app-keys-<date>.txt` and paste
 * them into each app's `apps/<slug>/web/.env.local`:
 *   NEXT_PUBLIC_EZAUTH_KEY=ez_pk_live_<hex>
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §3-4 (Dogfood + Bootstrap).
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { Types } from 'mongoose'
import { getApiKeyModel } from '../models/api-key.js'
import { getApplicationModel, type ApplicationDocument } from '../models/application.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../utils/api-key.js'

/** Marker used to identify consumer-seeded entities for idempotence. */
const SYSTEM_SEED_MARKER = 'system-seed-consumer'

/**
 * Consumer apps that need a publishable key to bootstrap their AuthProvider.
 * Each entry becomes an Application doc (if missing) + one publishable key.
 *
 * Order matches the CROSS-KEY-001 migration plan. `name` defaults to a
 * human-readable form — tweak via the ezauth dashboard after seeding.
 */
export const CONSUMER_APP_SLUGS: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: 'ezstart', name: 'EZStart' },
  { slug: 'ezbill', name: 'EZBill' },
  { slug: 'green-pulse', name: 'GreenPulse' },
  { slug: 'fengshui', name: 'Feng Shui 2026' },
  { slug: 'asc-tcd', name: 'ASC-TCD' },
  { slug: 'gacha-analyzer', name: 'Gacha Analyzer' },
]

/** Per-app seed outcome. */
export interface ConsumerAppKeyResult {
  slug: string
  applicationStatus: 'created' | 'already-exists'
  applicationId: string
  keyStatus: 'created' | 'already-exists'
  keyPrefix: string
  /** Raw key — ONLY present when `keyStatus === 'created'`. Never log anywhere else. */
  rawKey?: string
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezauth')` has been called (or will be called
 * inside via factory functions).
 */
export async function seedConsumerAppKeys(): Promise<ConsumerAppKeyResult[]> {
  const Application = await getApplicationModel()
  const ApiKey = await getApiKeyModel()

  const results: ConsumerAppKeyResult[] = []

  for (const { slug, name } of CONSUMER_APP_SLUGS) {
    // 1. Find-or-create Application
    let appDoc = await Application.findOne({ slug })
    let applicationStatus: 'created' | 'already-exists'
    if (appDoc) {
      applicationStatus = 'already-exists'
    } else {
      appDoc = await Application.create({
        slug,
        name,
        ownerId: 'system',
        createdBy: SYSTEM_SEED_MARKER,
        status: 'active',
      } satisfies Partial<ApplicationDocument>)
      applicationStatus = 'created'
    }

    const applicationId = (appDoc._id as Types.ObjectId).toString()

    // 2. Find-or-create the consumer publishable key
    const existing = await ApiKey.findOne({
      appName: slug,
      createdBy: SYSTEM_SEED_MARKER,
      status: 'active',
    }).lean()

    if (existing) {
      // Self-heal: link pre-existing seed keys to their Application if they
      // predate this migration.
      if (!existing.applicationId) {
        await ApiKey.updateOne(
          { _id: existing._id },
          { $set: { applicationId: appDoc._id as Types.ObjectId } }
        )
      }
      results.push({
        slug,
        applicationStatus,
        applicationId,
        keyStatus: 'already-exists',
        keyPrefix: existing.keyPrefix,
      })
      continue
    }

    const rawKey = generateRawApiKey({ type: 'publishable', env: 'live' })
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = extractKeyPrefix(rawKey)

    await ApiKey.create({
      key: hashedKey,
      keyPrefix,
      name: `${name} consumer key (system seed)`,
      userId: 'system',
      appName: slug,
      applicationId: appDoc._id as Types.ObjectId,
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
      createdBy: SYSTEM_SEED_MARKER,
      quotaMonthly: null,
    })

    results.push({
      slug,
      applicationStatus,
      applicationId,
      keyStatus: 'created',
      keyPrefix,
      rawKey,
    })
  }

  return results
}

/**
 * CLI entry point. Connects to MongoDB, seeds the keys, prints a summary
 * block, and exits the process with code 0 (success) or 1 (failure).
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  // Resolve MONGO_URL template ({app}-{env} → ezauth) like the API bootstrap
  // does via instrument.mts. Without this, connectToMongo would use the
  // literal template string as the DB name in Atlas.
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const results = await seedConsumerAppKeys()

  const created = results.filter(r => r.keyStatus === 'created')
  const skipped = results.filter(r => r.keyStatus === 'already-exists')

  console.info('')
  console.info('=== Consumer app keys seed result ===')
  console.info('')
  for (const r of skipped) {
    console.info(
      `  [skip] ${r.slug} — already exists (prefix: ${r.keyPrefix}, applicationId: ${r.applicationId})`
    )
  }

  if (created.length === 0) {
    console.info('')
    console.info('No new keys created. All consumer apps already seeded.')
    process.exit(0)
  }

  console.info('')
  console.info('⚠️  Raw keys shown ONCE — save them NOW to a secure location:')
  console.info('')
  for (const r of created) {
    if (!r.rawKey) {
      console.error(`seed-consumer-app-keys: internal error — ${r.slug} created without rawKey`)
      process.exit(1)
    }
    console.info(`  # ${r.slug} (applicationId: ${r.applicationId})`)
    console.info(`  NEXT_PUBLIC_EZAUTH_KEY=${r.rawKey}`)
    console.info('')
  }

  console.info('Paste each into the matching apps/<slug>/web/.env.local.')
  console.info('Restart the relevant dev servers to apply.')
  process.exit(0)
}

// Only run CLI bootstrap when executed directly, not when imported by tests.
// `import.meta.url` vs `process.argv[1]` detection works for both tsx and node.
const invokedAsScript = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  const entryUrl = new URL(`file://${entry.replace(/\\/g, '/')}`).href
  return import.meta.url === entryUrl
})()

if (invokedAsScript) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`seed-consumer-app-keys failed: ${msg}`)
    process.exit(1)
  })
}
