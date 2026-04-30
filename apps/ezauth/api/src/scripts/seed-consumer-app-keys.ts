/**
 * Seed script — bootstrap the FULL set of 4 API keys per consumer app
 * (Stripe-pattern: pk_live + sk_live + pk_test + sk_test).
 *
 * For each consumer app slug in {@link CONSUMER_APP_SLUGS}:
 * 1. Ensures an `Application` document exists (find-or-create with
 *    `ownerId='system'`, `createdBy='system-seed-consumer'`).
 * 2. Ensures the 4 expected `ApiKey` documents exist with
 *    `createdBy='system-seed-consumer'`, idempotency keyed on the
 *    `(applicationId, type, env)` tuple. The 4 keys are:
 *      - publishable / live  → `ez_pk_live_<hex>`  scope='user'  (frontend)
 *      - secret      / live  → `ez_sk_live_<hex>`  scope='admin' (server S2S)
 *      - publishable / test  → `ez_pk_test_<hex>`  scope='user'  (frontend test mode)
 *      - secret      / test  → `ez_sk_test_<hex>`  scope='admin' (server test mode)
 *
 * `isTestMode` is set in lockstep with `env` (test ↔ true, live ↔ false) so the
 * `testModeScopePlugin` correctly partitions data downstream.
 *
 * Idempotent: re-running the script with the existing 4 keys is a no-op and
 * exits 0. Each newly-generated raw key is printed exactly ONCE to stdout AND
 * dumped to `tmp/seed-keys-<timestamp>.txt` for safe later retrieval.
 *
 * Backward compat: legacy seeded keys created before this update only carry the
 * `system-seed-consumer` marker without distinguishing the (type, env) tuple.
 * They are auto-detected via the `(applicationId, type, env)` lookup — if a
 * legacy `pk_live` already exists for an Application, only the 3 missing keys
 * (`sk_live`, `pk_test`, `sk_test`) are generated.
 *
 * Usage:
 *   pnpm --filter api-ezauth seed:consumer-app-keys
 *
 * For staging:
 *   railway run --service ezauth-api --environment staging -- \
 *     pnpm --filter api-ezauth seed:consumer-app-keys
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §3-4 + §7
 * (Dogfood + Bootstrap + Test mode keys).
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { Types } from 'mongoose'
import { getApiKeyModel } from '../models/api-key.js'
import { getApplicationModel, type ApplicationDocument } from '../models/application.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../utils/api-key.js'
import type { ApiKeyType, ApiKeyEnv, ApiKeyScope } from '../models/api-key.js'

/** Marker used to identify consumer-seeded entities for idempotence. */
const SYSTEM_SEED_MARKER = 'system-seed-consumer'

/**
 * Consumer apps that need a full set of 4 keys to bootstrap their AuthProvider
 * (frontend) AND server-side integrations (S2S calls, cron jobs, scripts).
 *
 * Each entry becomes an Application doc (if missing) + 4 ApiKey docs.
 *
 * `name` defaults to a human-readable form — tweak via the ezauth dashboard
 * after seeding.
 */
export const CONSUMER_APP_SLUGS: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: 'ezstart', name: 'EZStart' },
  // EZPay is included here even though it is seeded as a dogfood Application by
  // `seed-self-key` — this script only ensures the Application exists and mints
  // a tenant-scoped publishable key (`scope='user'`) that the EZPay web app can
  // expose via `NEXT_PUBLIC_EZAUTH_KEY`. The prior admin workaround (using
  // EZAuth's own admin key) is dropped once this key is wired in Vercel.
  { slug: 'ezpay', name: 'EZPay' },
  { slug: 'ezbill', name: 'EZBill' },
  { slug: 'green-pulse', name: 'GreenPulse' },
  { slug: 'fengshui', name: 'Feng Shui 2026' },
  { slug: 'asc-tcd', name: 'ASC-TCD' },
  { slug: 'gacha-analyzer', name: 'Gacha Analyzer' },
]

/** Static descriptor of one of the 4 keys to ensure for every Application. */
interface SeedKeySpec {
  type: ApiKeyType
  env: ApiKeyEnv
  scope: Extract<ApiKeyScope, 'admin' | 'user' | 'readonly'>
  /** Short label used in CLI output and dump file (e.g. `pk_live`). */
  label: 'pk_live' | 'sk_live' | 'pk_test' | 'sk_test'
}

/**
 * The 4 keys ensured for every Application — kept as a const array so the loop
 * is fully typed and exhaustive.
 */
export const KEYS_TO_SEED: ReadonlyArray<SeedKeySpec> = [
  { type: 'publishable', env: 'live', scope: 'user', label: 'pk_live' },
  { type: 'secret', env: 'live', scope: 'admin', label: 'sk_live' },
  { type: 'publishable', env: 'test', scope: 'user', label: 'pk_test' },
  { type: 'secret', env: 'test', scope: 'admin', label: 'sk_test' },
]

/** Per-key seed outcome. */
export interface SeededKeyOutcome {
  label: SeedKeySpec['label']
  type: ApiKeyType
  env: ApiKeyEnv
  scope: SeedKeySpec['scope']
  status: 'created' | 'already-exists'
  keyPrefix: string
  /** Raw key — ONLY present when `status === 'created'`. Never log anywhere else. */
  rawKey?: string
}

/** Per-app seed outcome — aggregates all 4 keys for one Application. */
export interface ConsumerAppKeyResult {
  slug: string
  applicationStatus: 'created' | 'already-exists'
  applicationId: string
  /** All 4 keys (created or already-existing) for this app. */
  keys: SeededKeyOutcome[]
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezauth')` has been called (or will be called
 * inside via factory functions).
 *
 * @returns one entry per app in {@link CONSUMER_APP_SLUGS}, each with the
 *          full 4-key inventory (mix of `created` + `already-exists`).
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

    const applicationObjectId = appDoc._id as Types.ObjectId
    const applicationId = applicationObjectId.toString()
    const keyOutcomes: SeededKeyOutcome[] = []

    // 2. For each of the 4 keys, find-or-create with (type, env) tuple
    //    idempotency. This automatically detects a legacy single-pk_live key
    //    that predates this 4-key refactor: such a doc is matched by the
    //    `(type='publishable', env='live')` lookup and skipped, leaving the
    //    other 3 (sk_live, pk_test, sk_test) to be generated.
    for (const spec of KEYS_TO_SEED) {
      const existing = await ApiKey.findOne({
        applicationId: applicationObjectId,
        type: spec.type,
        env: spec.env,
        createdBy: SYSTEM_SEED_MARKER,
        status: 'active',
      }).lean()

      if (existing) {
        keyOutcomes.push({
          label: spec.label,
          type: spec.type,
          env: spec.env,
          scope: spec.scope,
          status: 'already-exists',
          keyPrefix: existing.keyPrefix,
        })
        continue
      }

      // Backward-compat self-heal: if a pre-P6 seeded pk_live exists with
      // `appName=slug` but no `applicationId` (so the (applicationId, type,
      // env) lookup above missed it), link it to the Application instead of
      // generating a duplicate. Only relevant for the pk_live spec.
      if (spec.type === 'publishable' && spec.env === 'live') {
        const legacy = await ApiKey.findOne({
          appName: slug,
          createdBy: SYSTEM_SEED_MARKER,
          status: 'active',
          applicationId: { $exists: false },
        }).lean()

        if (legacy) {
          await ApiKey.updateOne(
            { _id: legacy._id },
            { $set: { applicationId: applicationObjectId } }
          )
          keyOutcomes.push({
            label: spec.label,
            type: spec.type,
            env: spec.env,
            scope: spec.scope,
            status: 'already-exists',
            keyPrefix: legacy.keyPrefix,
          })
          continue
        }
      }

      const rawKey = generateRawApiKey({ type: spec.type, env: spec.env })
      const hashedKey = hashApiKey(rawKey)
      const keyPrefix = extractKeyPrefix(rawKey)

      await ApiKey.create({
        key: hashedKey,
        keyPrefix,
        name: `${name} ${spec.label} (system seed)`,
        userId: 'system',
        appName: slug,
        applicationId: applicationObjectId,
        type: spec.type,
        env: spec.env,
        scope: spec.scope,
        permissions: ['*'],
        status: 'active',
        createdBy: SYSTEM_SEED_MARKER,
        quotaMonthly: null,
        // Stripe-pattern test/live partition — must mirror env in lockstep.
        isTestMode: spec.env === 'test',
      })

      keyOutcomes.push({
        label: spec.label,
        type: spec.type,
        env: spec.env,
        scope: spec.scope,
        status: 'created',
        keyPrefix,
        rawKey,
      })
    }

    results.push({
      slug,
      applicationStatus,
      applicationId,
      keys: keyOutcomes,
    })
  }

  return results
}

/** Per-label hint mapping for the CLI output / dump file. */
const ENV_VAR_HINT: Record<SeedKeySpec['label'], string> = {
  pk_live: 'apps/<slug>/web/.env.local             NEXT_PUBLIC_EZAUTH_KEY',
  sk_live: 'apps/<slug>/api/.env.local             EZAUTH_SECRET_KEY',
  pk_test: 'apps/<slug>/web/.env.test              NEXT_PUBLIC_EZAUTH_KEY_TEST',
  sk_test: 'apps/<slug>/api/.env.test              EZAUTH_SECRET_KEY_TEST',
}

/**
 * Resolve the absolute path to the monorepo `tmp/` directory.
 *
 * Robust against the script being invoked from any cwd (Railway/Vercel,
 * pnpm filter, direct tsx). Walks up from this file's location to the
 * monorepo root (where `tmp/` lives).
 */
function resolveTmpDir(): string {
  // This file lives at: <root>/apps/ezauth/api/src/scripts/seed-consumer-app-keys.ts
  // From dist (build) it lives at: <root>/apps/ezauth/api/dist/scripts/seed-consumer-app-keys.js
  // Either way, 5 levels up = monorepo root.
  const here = new URL('.', import.meta.url).pathname
  // On Windows the URL pathname has a leading slash before the drive letter
  // (e.g. `/D:/ez-hub/...`) — strip it for fs operations.
  const normalised = process.platform === 'win32' ? here.replace(/^\//, '') : here
  return resolve(normalised, '..', '..', '..', '..', '..', 'tmp')
}

/**
 * Build the dump file content for newly-created keys.
 * Returns `null` when no key was created (no dump needed).
 */
function buildDumpContent(results: ConsumerAppKeyResult[], timestamp: string): string | null {
  const createdAny = results.some(r => r.keys.some(k => k.status === 'created'))
  if (!createdAny) return null

  const lines: string[] = [
    '# seed-consumer-app-keys raw key dump',
    `# generated: ${timestamp}`,
    '#',
    '# Stripe-pattern: 4 keys per Application (pk_live + sk_live + pk_test + sk_test).',
    '# Copy each key into the matching .env file (paths shown below the key).',
    '# This file is gitignored. DELETE IT once you have transferred the values.',
    '',
  ]

  for (const r of results) {
    const created = r.keys.filter(k => k.status === 'created' && k.rawKey)
    if (created.length === 0) continue

    lines.push(`## ${r.slug}  (applicationId: ${r.applicationId})`)
    lines.push('')
    for (const k of created) {
      lines.push(`# → ${ENV_VAR_HINT[k.label]}`)
      lines.push(`${k.label}=${k.rawKey}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Dump the raw keys to a timestamped file under `tmp/`. Returns the absolute
 * file path, or `null` when no key was created.
 */
function dumpRawKeysToTmpFile(results: ConsumerAppKeyResult[]): string | null {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const content = buildDumpContent(results, timestamp)
  if (!content) return null

  const tmpDir = resolveTmpDir()
  mkdirSync(tmpDir, { recursive: true })
  const filePath = resolve(tmpDir, `seed-keys-${timestamp}.txt`)
  writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 })
  return filePath
}

/**
 * CLI entry point. Connects to MongoDB, seeds the keys, prints a summary
 * block, dumps the raw keys to a tmp file, and exits the process with code
 * 0 (success) or 1 (failure).
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  // Resolve MONGO_URL template ({app}-{env} → ezauth) like the API bootstrap
  // does via instrument.mts. Without this, connectToMongo would use the
  // literal template string as the DB name in Atlas.
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const results = await seedConsumerAppKeys()

  // Sanity counters
  let createdCount = 0
  let skippedCount = 0
  for (const r of results) {
    for (const k of r.keys) {
      if (k.status === 'created') createdCount++
      else skippedCount++
    }
  }

  console.info('')
  console.info('=== Consumer app keys seed result (4-key Stripe-pattern) ===')
  console.info('')
  console.info(`  ${results.length} apps processed`)
  console.info(`  ${createdCount} keys created`)
  console.info(`  ${skippedCount} keys already existed (skipped)`)
  console.info('')

  for (const r of results) {
    console.info(`  [${r.applicationStatus === 'created' ? 'NEW' : 'EXIST'}] ${r.slug}`)
    for (const k of r.keys) {
      const tag = k.status === 'created' ? 'NEW ' : 'SKIP'
      console.info(`     ${tag} ${k.label.padEnd(8)} prefix=${k.keyPrefix}`)
    }
  }

  if (createdCount === 0) {
    console.info('')
    console.info('No new keys created. All consumer apps already fully seeded.')
    process.exit(0)
  }

  const dumpPath = dumpRawKeysToTmpFile(results)

  console.info('')
  console.info('⚠️  Raw keys shown ONCE — save them NOW to a secure location:')
  console.info('')

  for (const r of results) {
    const newlyCreated = r.keys.filter(k => k.status === 'created')
    if (newlyCreated.length === 0) continue

    console.info(`  # ${r.slug} (applicationId: ${r.applicationId})`)
    for (const k of newlyCreated) {
      if (!k.rawKey) {
        console.error(
          `seed-consumer-app-keys: internal error — ${r.slug} ${k.label} created without rawKey`
        )
        process.exit(1)
      }
      console.info(`    ${k.label}=${k.rawKey}`)
      console.info(`         → ${ENV_VAR_HINT[k.label]}`)
    }
    console.info('')
  }

  if (dumpPath) {
    console.info(`📋 Raw keys also dumped to: ${dumpPath}`)
    console.info('   (file is gitignored — delete after copying values)')
    console.info('')
  }

  console.info('Restart the relevant dev servers to apply the new keys.')
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
