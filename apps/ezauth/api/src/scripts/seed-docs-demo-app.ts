/**
 * Seed script — bootstrap the `_docs-demo` sandbox Application + its API keys.
 *
 * The `_docs-demo` Application powers the live previews on
 * `/docs/components/*` (DOCS_DEMO_SANDBOX_BACKEND-001). Visitors can
 * sign up / sign in with REAL components but every byte of data is
 * sandboxed:
 *
 *  - `reservedSlug: true` — only superadmins may create `_*` slugs via the
 *    API route, and tenants cannot squat on the name.
 *  - `isPlatformOwned: true` — bypasses billing fees / Pro feature gates.
 *  - `isTestMode: true` — partition from any live data via the
 *    `testModeScopePlugin`.
 *  - `quotas: { maxUsers: 100, maxEventsPerDay: 500 }` — hard caps enforced
 *    by `middleware/check-demo-quotas.ts`. Returning 429 once exceeded.
 *  - 24h reset cron (see `cron/reset-docs-demo.ts`) wipes demo users +
 *    truncates demo audit logs older than 24h. Manual reset via the
 *    superadmin endpoint `POST /api/admin/docs-demo/reset`.
 *
 * Idempotent: re-running with the existing Application + 2 keys is a no-op
 * and exits 0. Each newly-generated raw key is printed exactly ONCE to
 * stdout AND dumped to `tmp/seed-docs-demo-keys-<timestamp>.txt` for safe
 * later retrieval.
 *
 * Usage:
 *   pnpm --filter api-ezauth seed:docs-demo
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §4 (Bootstrap)
 * + `.claude/rules/standard-saas-data.md` §4 (test mode isolation).
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { Types } from 'mongoose'
import { logger } from '@ezstart/logger/server'
import { getApiKeyModel } from '../models/api-key.js'
import { getApplicationModel, type ApplicationDocument } from '../models/application.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../utils/api-key.js'
import type { ApiKeyType, ApiKeyEnv, ApiKeyScope } from '../models/api-key.js'

/** Marker used to identify docs-demo seeded entities for idempotence. */
export const DOCS_DEMO_SEED_MARKER = 'system-seed-docs-demo'

/** Reserved slug for the documentation sandbox Application. */
export const DOCS_DEMO_APP_SLUG = '_docs-demo'

/** Quotas applied to the docs-demo Application. */
export const DOCS_DEMO_QUOTAS = {
  maxUsers: 100,
  maxEventsPerDay: 500,
} as const

/** Static descriptor of one of the 2 keys to ensure for the demo Application. */
interface SeedKeySpec {
  type: ApiKeyType
  env: ApiKeyEnv
  scope: Extract<ApiKeyScope, 'admin' | 'user' | 'readonly'>
  /** Short label used in CLI output and dump file. */
  label: 'pk_test' | 'sk_test'
}

/**
 * The 2 keys ensured for the demo Application — a publishable key (exposed
 * in the web bundle) and a secret key (server-only). Both `env: 'test'` so
 * the testModeScopePlugin partitions every read/write off the live dataset.
 */
export const DOCS_DEMO_KEYS_TO_SEED: ReadonlyArray<SeedKeySpec> = [
  { type: 'publishable', env: 'test', scope: 'user', label: 'pk_test' },
  { type: 'secret', env: 'test', scope: 'admin', label: 'sk_test' },
]

/** Per-key seed outcome. */
export interface SeededDocsDemoKeyOutcome {
  label: SeedKeySpec['label']
  type: ApiKeyType
  env: ApiKeyEnv
  scope: SeedKeySpec['scope']
  status: 'created' | 'already-exists'
  keyPrefix: string
  /** Raw key — ONLY present when `status === 'created'`. */
  rawKey?: string
}

/** Aggregate seed outcome. */
export interface SeedDocsDemoAppResult {
  applicationStatus: 'created' | 'already-exists'
  applicationId: string
  keys: SeededDocsDemoKeyOutcome[]
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezauth')` has been called (or will be called
 * inside via factory functions).
 *
 * @returns The seed outcome for the docs-demo Application + its 2 keys.
 */
export async function seedDocsDemoApp(): Promise<SeedDocsDemoAppResult> {
  const Application = await getApplicationModel()
  const ApiKey = await getApiKeyModel()

  // 1. Find-or-create the `_docs-demo` Application. Use `includeArchived` so
  //    a previously archived sandbox is detected (avoids E11000 dup-key).
  let appDoc = await Application.findOne({ slug: DOCS_DEMO_APP_SLUG }, null, {
    includeArchived: true,
  })
  let applicationStatus: 'created' | 'already-exists'

  if (appDoc) {
    applicationStatus = 'already-exists'
    // Self-heal: if the Application predates this seed (no quotas / not
    // marked reserved), patch the metadata in place. Keeps the doc id stable
    // so existing keys / users keep referencing it.
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
      appDoc.quotas = { ...DOCS_DEMO_QUOTAS }
      needsPatch = true
    }
    if (needsPatch) {
      await appDoc.save()
    }
  } else {
    appDoc = await Application.create({
      slug: DOCS_DEMO_APP_SLUG,
      name: 'Documentation Demo',
      description:
        'Sandbox Application for /docs/components live previews. Data resets every 24h and is hard-isolated from any tenant data.',
      ownerId: 'system',
      createdBy: DOCS_DEMO_SEED_MARKER,
      status: 'active',
      isPlatformOwned: true,
      isTestMode: true,
      reservedSlug: true,
      quotas: { ...DOCS_DEMO_QUOTAS },
    } satisfies Partial<ApplicationDocument>)
    applicationStatus = 'created'
  }

  const applicationObjectId = appDoc._id as Types.ObjectId
  const applicationId = applicationObjectId.toString()
  const keyOutcomes: SeededDocsDemoKeyOutcome[] = []

  // 2. For each of the 2 keys, find-or-create with (type, env) tuple
  //    idempotency.
  for (const spec of DOCS_DEMO_KEYS_TO_SEED) {
    const existing = await ApiKey.findOne({
      applicationId: applicationObjectId,
      type: spec.type,
      env: spec.env,
      createdBy: DOCS_DEMO_SEED_MARKER,
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

    const rawKey = generateRawApiKey({ type: spec.type, env: spec.env })
    const hashedKey = hashApiKey(rawKey)
    const keyPrefix = extractKeyPrefix(rawKey)

    await ApiKey.create({
      key: hashedKey,
      keyPrefix,
      name: `Docs Demo ${spec.label} (system seed)`,
      userId: 'system',
      appName: DOCS_DEMO_APP_SLUG,
      applicationId: applicationObjectId,
      type: spec.type,
      env: spec.env,
      scope: spec.scope,
      permissions: ['*'],
      status: 'active',
      createdBy: DOCS_DEMO_SEED_MARKER,
      // Demo keys have no monthly quota — quotas live on the Application
      // (see `quotas.maxUsers` + `quotas.maxEventsPerDay` enforced by
      // `middleware/check-demo-quotas.ts`).
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

  return {
    applicationStatus,
    applicationId,
    keys: keyOutcomes,
  }
}

/** Per-label hint mapping for the CLI output / dump file. */
const ENV_VAR_HINT: Record<SeedKeySpec['label'], string> = {
  pk_test: 'apps/ezauth/web/.env.local      NEXT_PUBLIC_EZAUTH_DOCS_DEMO_KEY',
  sk_test: 'apps/ezauth/api/.env.local      EZAUTH_DOCS_DEMO_SECRET_KEY (server-only)',
}

/**
 * Resolve the absolute path to the monorepo `tmp/` directory.
 *
 * Robust against the script being invoked from any cwd. Walks up from this
 * file's location to the monorepo root.
 */
function resolveTmpDir(): string {
  // <root>/apps/ezauth/api/src/scripts/seed-docs-demo-app.ts (or .../dist/...)
  // 5 levels up = monorepo root.
  const here = new URL('.', import.meta.url).pathname
  const normalised = process.platform === 'win32' ? here.replace(/^\//, '') : here
  return resolve(normalised, '..', '..', '..', '..', '..', 'tmp')
}

/**
 * Build the dump file content for newly-created keys.
 * Returns `null` when no key was created (no dump needed).
 */
function buildDumpContent(result: SeedDocsDemoAppResult, timestamp: string): string | null {
  const created = result.keys.filter(k => k.status === 'created' && k.rawKey)
  if (created.length === 0) return null

  const lines: string[] = [
    '# seed-docs-demo-app raw key dump',
    `# generated: ${timestamp}`,
    `# applicationId: ${result.applicationId}`,
    '#',
    '# Sandbox keys for the _docs-demo Application. Both are TEST keys —',
    '# data created with these keys lives in a partitioned dataset and is',
    '# wiped every 24h by the docs-demo reset cron.',
    '#',
    '# Copy the publishable key into the matching .env file (path shown',
    '# below the value). The secret key is server-only — keep it OUT of',
    '# any NEXT_PUBLIC_* var. This file is gitignored. DELETE IT once you',
    '# have transferred the values.',
    '',
  ]

  for (const k of created) {
    lines.push(`# → ${ENV_VAR_HINT[k.label]}`)
    lines.push(`${k.label}=${k.rawKey}`)
    lines.push('')
  }

  return lines.join('\n')
}

/** Dump the raw keys to a timestamped file under `tmp/`. */
function dumpRawKeysToTmpFile(result: SeedDocsDemoAppResult): string | null {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const content = buildDumpContent(result, timestamp)
  if (!content) return null

  const tmpDir = resolveTmpDir()
  mkdirSync(tmpDir, { recursive: true })
  const filePath = resolve(tmpDir, `seed-docs-demo-keys-${timestamp}.txt`)
  writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 })
  return filePath
}

/**
 * CLI entry point. Connects to MongoDB, seeds the Application + keys, prints
 * a summary block, dumps the raw keys to a tmp file, and exits the process
 * with code 0 (success) or 1 (failure).
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  // Resolve MONGO_URL template ({app}-{env} → ezauth) like the API bootstrap
  // does via instrument.mts. Without this, connectToMongo would use the
  // literal template string as the DB name in Atlas.
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const result = await seedDocsDemoApp()

  const createdCount = result.keys.filter(k => k.status === 'created').length
  const skippedCount = result.keys.filter(k => k.status === 'already-exists').length

  logger.info(
    {
      applicationStatus: result.applicationStatus,
      applicationId: result.applicationId,
      createdCount,
      skippedCount,
    },
    'docs-demo seed result'
  )

  console.info('')
  console.info('=== Docs Demo Application seed result ===')
  console.info('')
  console.info(`  Application: ${result.applicationStatus.toUpperCase()}`)
  console.info(`  applicationId: ${result.applicationId}`)
  console.info(`  ${createdCount} keys created, ${skippedCount} already existed`)
  console.info('')

  for (const k of result.keys) {
    const tag = k.status === 'created' ? 'NEW ' : 'SKIP'
    console.info(`  ${tag} ${k.label.padEnd(8)} prefix=${k.keyPrefix}`)
  }

  if (createdCount === 0) {
    console.info('')
    console.info('No new keys created. Docs demo Application already fully seeded.')
    process.exit(0)
  }

  const dumpPath = dumpRawKeysToTmpFile(result)

  console.info('')
  console.info('Raw keys shown ONCE — save them NOW to a secure location:')
  console.info('')

  for (const k of result.keys) {
    if (k.status !== 'created' || !k.rawKey) continue
    console.info(`  ${k.label}=${k.rawKey}`)
    console.info(`       -> ${ENV_VAR_HINT[k.label]}`)
    console.info('')
  }

  if (dumpPath) {
    console.info(`Raw keys also dumped to: ${dumpPath}`)
    console.info('   (file is gitignored - delete after copying values)')
    console.info('')
  }

  console.info('Restart the dev server to pick up NEXT_PUBLIC_EZAUTH_DOCS_DEMO_KEY.')
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
    console.error(`seed-docs-demo-app failed: ${msg}`)
    process.exit(1)
  })
}
