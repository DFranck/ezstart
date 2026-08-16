/**
 * Rotation script — re-mint every system-seeded EZPay `ApiKey` so the EZPay
 * MongoDB collection is realigned with a fresh set of credentials.
 *
 * ## Context
 *
 * The EZPay-API validates incoming `ez_pk_*` / `ez_sk_*` keys against the
 * `apiKeys` collection in the **ezpay** MongoDB database (separate from the
 * ezauth source-of-truth). When ezauth keys were rotated during the
 * `Phase A2 ENV-DIET` agent run, the ezauth collection was rotated but the
 * EZPay-side collection was NOT — leaving the staging EZPay dashboard with
 * keys that:
 *   - Are listed as "valid" in the ezpay/api collection
 *   - Carry the OLD raw value, which is now diverged from the values pushed
 *     to `apps/ezpay/web/.env.staging` after the ezauth rotation.
 *
 * The consequence is that E2E tests targeting staging EZPay will receive 401
 * because the request `?key=ez_pk_live_xxx` doesn't match anything in the
 * ezpay DB.
 *
 * This script rotates every "system-seeded" key in the ezpay DB:
 *   - `createdBy='system-seed'` (the self-key minted by `seed-self-key`)
 *   - `createdBy='system-seed-consumer'` (the 4-key set minted from ezauth)
 *
 * For each match it:
 *   1. Marks the existing doc as `status='revoked'` + `revokedAt: now()` —
 *      mirror of the live `/api/keys/:id/rotate` endpoint.
 *   2. Inserts a fresh doc with a NEW raw key generated via
 *      `generateRawApiKey({ type, env })`, hashed with SHA-256, and carrying
 *      the SAME metadata (applicationId, appSlug, scope, type, env,
 *      permissions, quotaMonthly, createdBy).
 *   3. Prints the new raw key ONCE to stdout AND dumps it to
 *      `tmp/rotate-keys-<timestamp>.txt` for safe later retrieval.
 *
 * Idempotence guard: by default the script refuses to rotate a key whose
 * `createdAt` is younger than 7 days (avoid burning a freshly-rotated key
 * during a careless re-run). Pass `--force` to bypass.
 *
 * Safety guards (mirror `data-protection.md`):
 *   - `NODE_ENV === 'test'` is rejected — use `seed-self-key` for tests.
 *   - `--env=production` requires `--yes-rotate-production` to acknowledge
 *     intent. Otherwise the script aborts.
 *
 * Usage:
 *   pnpm --filter api-ezpay rotate-keys [--env=local|staging|production]
 *                                       [--dry-run] [--force]
 *                                       [--yes-rotate-production]
 *
 * Examples:
 *   pnpm --filter api-ezpay rotate-keys --env=staging --dry-run
 *   pnpm --filter api-ezpay rotate-keys --env=staging
 *   pnpm --filter api-ezpay rotate-keys --env=production --yes-rotate-production
 *
 * Standard references:
 *   - `.claude/rules/standard-saas-keys.md` (§1 naming, §3 dogfood, §6 mig)
 *   - `.claude/rules/data-protection.md` (prod guards, NODE_ENV)
 *   - `.claude/rules/mongodb.md` (connectToMongo + factory pattern)
 *
 * @module apps/ezpay/api/src/scripts/rotate-keys
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { logger } from '@ezstart/logger/server'
import { getApiKeyModel, type ApiKeyDocument } from '../models/api-key.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../utils/api-key.js'
import { dumpRawKeysToTmpFile, printRawKeyDump, printSummary } from './rotate-keys-cli.js'

/**
 * The two seed markers that identify a system-managed key in the ezpay
 * `apiKeys` collection. Manually-created keys (via the dashboard) are NOT
 * touched by this script.
 */
const SEED_MARKERS = ['system-seed', 'system-seed-consumer'] as const

/** Window during which a freshly-rotated key is protected from a re-run. */
const IDEMPOTENCE_WINDOW_DAYS = 7

/** Supported `--env` values mapped to the `getMongoUrl` template token. */
const SUPPORTED_ENVS = ['local', 'staging', 'production'] as const
type RotateEnv = (typeof SUPPORTED_ENVS)[number]

/** Parsed CLI options. */
export interface RotateKeysOptions {
  /** Target environment — drives MONGO_URL template resolution. */
  env: RotateEnv
  /** When true, print the rotation plan but never write to the DB. */
  dryRun: boolean
  /**
   * When true, ignore the {@link IDEMPOTENCE_WINDOW_DAYS} freshness guard and
   * rotate every system-seeded key regardless of age.
   */
  force: boolean
  /**
   * When `env='production'`, this MUST be true to acknowledge intent. The
   * CLI exits with a clear error otherwise.
   */
  yesRotateProduction: boolean
}

/** Per-key rotation outcome. */
export interface RotatedKeyOutcome {
  /** ObjectId of the old (now revoked) key, as a string. */
  oldKeyId: string
  /** Prefix of the old key — safe to log. */
  oldKeyPrefix: string
  /** ObjectId of the freshly-minted key, as a string (omitted in dry-run). */
  newKeyId?: string
  /** Prefix of the new key — safe to log. */
  newKeyPrefix?: string
  /** Raw key string — ONLY present when `dryRun === false`. */
  rawKey?: string
  /** Metadata carried over from the old key (for the dump file). */
  applicationId: string
  appSlug: string
  type: 'publishable' | 'secret'
  env: 'live' | 'test'
  createdBy: string
}

/** Per-key skip outcome (never rotated). */
export interface SkippedKeyOutcome {
  oldKeyId: string
  oldKeyPrefix: string
  reason: 'too-recent'
  applicationId: string
  appSlug: string
}

/** Aggregate result of a {@link rotateKeys} run. */
export interface RotateKeysResult {
  /** Effective options used (post-defaults). */
  options: RotateKeysOptions
  /** Keys that were (or would have been, in dry-run) rotated. */
  rotated: RotatedKeyOutcome[]
  /** Keys skipped because they were rotated < {@link IDEMPOTENCE_WINDOW_DAYS} ago. */
  skipped: SkippedKeyOutcome[]
}

/**
 * Parse the CLI args into a typed {@link RotateKeysOptions} object.
 *
 * Exported for unit-test ergonomics. Throws a `RangeError` for an unknown
 * `--env=<value>` so the CLI fails loudly.
 */
export function parseRotateKeysArgs(argv: readonly string[]): RotateKeysOptions {
  let env: RotateEnv = 'local'
  let dryRun = false
  let force = false
  let yesRotateProduction = false

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (arg === '--force') {
      force = true
      continue
    }
    if (arg === '--yes-rotate-production') {
      yesRotateProduction = true
      continue
    }
    if (arg.startsWith('--env=')) {
      const raw = arg.slice('--env='.length)
      if (!SUPPORTED_ENVS.includes(raw as RotateEnv)) {
        throw new RangeError(
          `Invalid --env=${raw}. Supported values: ${SUPPORTED_ENVS.join(', ')}.`
        )
      }
      env = raw as RotateEnv
    }
  }

  return { env, dryRun, force, yesRotateProduction }
}

/**
 * Refuse to run when `NODE_ENV === 'test'` (tests must use
 * `seed-self-key` + `MongoMemoryServer`) or when targeting production
 * without explicit acknowledgement.
 */
function ensureSafeEnvironment(options: RotateKeysOptions): void {
  if (process.env.NODE_ENV === 'test') {
    throw new Error(
      'rotate-keys refuses to run with NODE_ENV=test. ' +
        'Use seed-self-key + MongoMemoryServer for tests. ' +
        'See .claude/rules/data-protection.md.'
    )
  }

  if (options.env === 'production' && !options.yesRotateProduction) {
    throw new Error(
      'Refusing to rotate production keys without --yes-rotate-production. ' +
        'Confirm a fresh backup exists (< 1h), then re-run with both ' +
        '--env=production AND --yes-rotate-production. ' +
        'See .claude/rules/data-protection.md.'
    )
  }
}

/**
 * Core rotation logic — extracted for testability. Assumes
 * `connectToMongo('ezpay')` (or a test MongoMemoryServer) has been
 * initialised by the caller.
 */
export async function rotateKeys(options: RotateKeysOptions): Promise<RotateKeysResult> {
  ensureSafeEnvironment(options)

  const ApiKey = await getApiKeyModel()
  const cutoffMs = Date.now() - IDEMPOTENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const cutoff = new Date(cutoffMs)

  // Only look at active, system-seeded keys. Revoked rows are an explicit
  // admin decision — leave them alone.
  const candidates = (await ApiKey.find({
    createdBy: { $in: SEED_MARKERS },
    status: 'active',
  }).lean()) as unknown as Array<
    Pick<
      ApiKeyDocument,
      | 'keyPrefix'
      | 'name'
      | 'userId'
      | 'applicationId'
      | 'appSlug'
      | 'type'
      | 'env'
      | 'scope'
      | 'permissions'
      | 'status'
      | 'expiresAt'
      | 'quotaMonthly'
      | 'createdBy'
      | 'isTestMode'
      | 'createdAt'
    > & { _id: { toString(): string } }
  >

  const rotated: RotatedKeyOutcome[] = []
  const skipped: SkippedKeyOutcome[] = []

  for (const old of candidates) {
    const oldId = old._id.toString()
    if (!options.force && old.createdAt > cutoff) {
      skipped.push({
        oldKeyId: oldId,
        oldKeyPrefix: old.keyPrefix,
        reason: 'too-recent',
        applicationId: old.applicationId,
        appSlug: old.appSlug,
      })
      continue
    }

    // Generate the new raw key + hash before touching the DB so a crash
    // mid-way doesn't leave the old key revoked without a replacement.
    const rawKey = generateRawApiKey({ type: old.type, env: old.env })
    const hashedKey = hashApiKey(rawKey)
    const newKeyPrefix = extractKeyPrefix(rawKey)

    if (options.dryRun) {
      rotated.push({
        oldKeyId: oldId,
        oldKeyPrefix: old.keyPrefix,
        newKeyPrefix,
        applicationId: old.applicationId,
        appSlug: old.appSlug,
        type: old.type,
        env: old.env,
        createdBy: old.createdBy ?? 'system-seed',
      })
      continue
    }

    // Revoke the old doc first, then insert the new one — same order as the
    // live HTTP rotation endpoint. If the create() throws, the old key is
    // already revoked, but that's the safest failure mode (no two active
    // keys with the same metadata).
    await ApiKey.updateOne({ _id: old._id }, { $set: { status: 'revoked', revokedAt: new Date() } })

    const created = await ApiKey.create({
      key: hashedKey,
      keyPrefix: newKeyPrefix,
      name: old.name,
      userId: old.userId,
      applicationId: old.applicationId,
      appSlug: old.appSlug,
      type: old.type,
      env: old.env,
      scope: old.scope,
      permissions: old.permissions,
      status: 'active',
      expiresAt: old.expiresAt,
      quotaMonthly: old.quotaMonthly,
      createdBy: old.createdBy ?? 'system-seed',
      isTestMode: old.env === 'test',
    })

    rotated.push({
      oldKeyId: oldId,
      oldKeyPrefix: old.keyPrefix,
      newKeyId: created._id.toString(),
      newKeyPrefix,
      rawKey,
      applicationId: old.applicationId,
      appSlug: old.appSlug,
      type: old.type,
      env: old.env,
      createdBy: old.createdBy ?? 'system-seed',
    })
  }

  return { options, rotated, skipped }
}

/** CLI entry point. */
async function main(): Promise<void> {
  // Slice off node + script path.
  const options = parseRotateKeysArgs(process.argv.slice(2))
  ensureSafeEnvironment(options)

  loadSharedEnv({ app: 'ezpay', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezpay')
  await connectToMongo('ezpay')

  logger.info(
    {
      env: options.env,
      dryRun: options.dryRun,
      force: options.force,
    },
    'rotate-keys: starting'
  )

  if (options.dryRun) {
    console.info('🧪 DRY-RUN MODE — no DB writes will be performed.')
    console.info('')
  }

  const result = await rotateKeys(options)
  printSummary(result)

  if (result.options.dryRun || result.rotated.length === 0) {
    console.info('')
    if (result.options.dryRun) {
      console.info('Dry-run complete. Re-run without --dry-run to apply.')
    } else {
      console.info('No keys eligible for rotation.')
    }
    process.exit(0)
  }

  const dumpPath = dumpRawKeysToTmpFile(result)
  printRawKeyDump(result, dumpPath)

  logger.info(
    {
      env: options.env,
      rotated: result.rotated.length,
      skipped: result.skipped.length,
    },
    'rotate-keys: success'
  )

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
    console.error(`rotate-keys failed: ${msg}`)
    logger.error({ err }, 'rotate-keys: fatal')
    process.exit(1)
  })
}
