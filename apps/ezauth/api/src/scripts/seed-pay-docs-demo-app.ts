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
 * This ezauth-side seed creates BOTH the Application document AND its 2
 * API keys (publishable + secret, both `env: 'test'`). The publishable key
 * is consumed by `<DemoSandbox>` in `apps/ezpay/web/.../docs/components/`
 * via `NEXT_PUBLIC_EZPAY_DOCS_DEMO_KEY`. The ezpay counterpart
 * (`apps/ezpay/api/src/scripts/seed-pay-docs-demo-data.ts`) creates the
 * sample payments / subscriptions / plans / donations in the ezpay DB.
 * Keep both in lockstep — re-running either is idempotent.
 *
 * Idempotent: re-running with the existing Application + 2 keys is a no-op
 * and exits 0. Each newly-generated raw key is printed exactly ONCE to
 * stdout AND dumped to `tmp/seed-pay-docs-demo-keys-<timestamp>.txt` for
 * safe later retrieval.
 *
 * Usage:
 *   pnpm --filter api-ezauth seed:pay-docs-demo
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

/** Static descriptor of one of the 2 keys to ensure for the demo Application. */
interface SeedKeySpec {
  type: ApiKeyType
  env: ApiKeyEnv
  scope: Extract<ApiKeyScope, 'admin' | 'user' | 'readonly'>
  /** Short label used in CLI output and dump file. */
  label: 'pk_test' | 'sk_test'
}

/**
 * The 2 keys ensured for the pay-docs-demo Application — a publishable key
 * (exposed in the web bundle, drives `<DemoSandbox>` PayProvider) and a
 * secret key (server-only). Both `env: 'test'` so the testModeScopePlugin
 * partitions every read/write off the live dataset.
 */
export const PAY_DOCS_DEMO_KEYS_TO_SEED: ReadonlyArray<SeedKeySpec> = [
  { type: 'publishable', env: 'test', scope: 'user', label: 'pk_test' },
  { type: 'secret', env: 'test', scope: 'admin', label: 'sk_test' },
]

/** Per-key seed outcome. */
export interface SeededPayDocsDemoKeyOutcome {
  label: SeedKeySpec['label']
  type: ApiKeyType
  env: ApiKeyEnv
  scope: SeedKeySpec['scope']
  status: 'created' | 'already-exists'
  keyPrefix: string
  /** Raw key — ONLY present when `status === 'created'`. */
  rawKey?: string
}

/** Result returned by {@link seedPayDocsDemoApp}. */
export interface SeedPayDocsDemoAppResult {
  applicationStatus: 'created' | 'already-exists'
  applicationId: string
  keys: SeededPayDocsDemoKeyOutcome[]
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezauth')` has been called (or will be called
 * inside via factory functions).
 */
export async function seedPayDocsDemoApp(): Promise<SeedPayDocsDemoAppResult> {
  const Application = await getApplicationModel()
  const ApiKey = await getApiKeyModel()

  // 1. Find-or-create the `_pay-docs-demo` Application. Use `includeArchived` so
  //    a previously archived sandbox is detected (avoids E11000 dup-key on the
  //    unique `slug` index).
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
  const keyOutcomes: SeededPayDocsDemoKeyOutcome[] = []

  // 2. For each of the 2 keys, find-or-create with (type, env) tuple
  //    idempotency. Mirror of `seed-docs-demo-app.ts` — same shape so the
  //    `_pay-docs-demo` Application gets a real publishable key the
  //    `<DemoSandbox>` PayProvider can consume.
  for (const spec of PAY_DOCS_DEMO_KEYS_TO_SEED) {
    const existing = await ApiKey.findOne({
      applicationId: applicationObjectId,
      type: spec.type,
      env: spec.env,
      createdBy: PAY_DOCS_DEMO_SEED_MARKER,
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
      name: `Pay Docs Demo ${spec.label} (system seed)`,
      userId: 'system',
      appName: PAY_DOCS_DEMO_APP_SLUG,
      applicationId: applicationObjectId,
      type: spec.type,
      env: spec.env,
      scope: spec.scope,
      permissions: ['*'],
      status: 'active',
      createdBy: PAY_DOCS_DEMO_SEED_MARKER,
      // Demo keys have no monthly quota — quotas live on the Application
      // (see `quotas.maxUsers` + `quotas.maxEventsPerDay` enforced by
      // ezpay's `middleware/check-pay-demo-quotas.ts`).
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
  pk_test: 'apps/ezpay/web/.env.local      NEXT_PUBLIC_EZPAY_DOCS_DEMO_KEY',
  sk_test: 'apps/ezpay/api/.env.local      EZPAY_DOCS_DEMO_SECRET_KEY (server-only)',
}

/**
 * Resolve the absolute path to the monorepo `tmp/` directory.
 *
 * Robust against the script being invoked from any cwd. Walks up from this
 * file's location to the monorepo root.
 */
function resolveTmpDir(): string {
  // <root>/apps/ezauth/api/src/scripts/seed-pay-docs-demo-app.ts
  // 5 levels up = monorepo root.
  const here = new URL('.', import.meta.url).pathname
  const normalised = process.platform === 'win32' ? here.replace(/^\//, '') : here
  return resolve(normalised, '..', '..', '..', '..', '..', 'tmp')
}

/**
 * Build the dump file content for newly-created keys.
 * Returns `null` when no key was created (no dump needed).
 */
function buildDumpContent(result: SeedPayDocsDemoAppResult, timestamp: string): string | null {
  const created = result.keys.filter(k => k.status === 'created' && k.rawKey)
  if (created.length === 0) return null

  const lines: string[] = [
    '# seed-pay-docs-demo-app raw key dump',
    `# generated: ${timestamp}`,
    `# applicationId: ${result.applicationId}`,
    '#',
    '# Sandbox keys for the _pay-docs-demo Application. Both are TEST keys —',
    '# data created with these keys lives in a partitioned dataset and is',
    '# wiped every 24h by the pay-docs-demo reset cron.',
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
function dumpRawKeysToTmpFile(result: SeedPayDocsDemoAppResult): string | null {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const content = buildDumpContent(result, timestamp)
  if (!content) return null

  const tmpDir = resolveTmpDir()
  mkdirSync(tmpDir, { recursive: true })
  const filePath = resolve(tmpDir, `seed-pay-docs-demo-keys-${timestamp}.txt`)
  writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 })
  return filePath
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

  const createdCount = result.keys.filter(k => k.status === 'created').length
  const skippedCount = result.keys.filter(k => k.status === 'already-exists').length

  logger.info(
    {
      applicationStatus: result.applicationStatus,
      applicationId: result.applicationId,
      slug: PAY_DOCS_DEMO_APP_SLUG,
      createdCount,
      skippedCount,
    },
    'pay-docs-demo Application seed result'
  )

  console.info('')
  console.info('=== Pay Docs Demo Application seed result ===')
  console.info('')
  console.info(`  Application: ${result.applicationStatus.toUpperCase()}`)
  console.info(`  slug: ${PAY_DOCS_DEMO_APP_SLUG}`)
  console.info(`  applicationId: ${result.applicationId}`)
  console.info(`  ${createdCount} keys created, ${skippedCount} already existed`)
  console.info('')

  for (const k of result.keys) {
    const tag = k.status === 'created' ? 'NEW ' : 'SKIP'
    console.info(`  ${tag} ${k.label.padEnd(8)} prefix=${k.keyPrefix}`)
  }

  if (createdCount > 0) {
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

    console.info('Restart the dev server to pick up NEXT_PUBLIC_EZPAY_DOCS_DEMO_KEY.')
    console.info('')
  }

  console.info('Next step:')
  console.info('  pnpm --filter api-ezpay seed:pay-docs-demo')
  console.info('')
  console.info('  → Creates the ezpay sample plans + payments + donations')
  console.info('    + subscriptions for this Application.')
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
