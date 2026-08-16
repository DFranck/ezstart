/**
 * Migration script — backfill `env` on legacy E2ETestRun documents.
 *
 * Context (E2E-MATRIX-ENV-DIMENSION-001, 2026-05-03) :
 *   The `env` field was added to `E2ETestRun` to distinguish runs executed
 *   against `local`, `staging`, or `production`. All runs persisted before
 *   this change were captured against developer machines (dev MongoDB +
 *   local servers), so we tag them as `env: 'local'`.
 *
 * Idempotent : the update only touches documents WHERE `env` is missing
 * (`$exists: false`) OR `env: null`. Re-running is safe — every subsequent
 * call reports "0 docs updated".
 *
 * Usage:
 *   pnpm --filter api-ezstart migrate:e2e-env
 *
 * Standard reference:
 *   `.claude/rules/data-protection.md` — script never targets production
 *   (it only sets a default value on a missing field, never destructive).
 *   `.claude/rules/standard-saas-data.md` §1 — migrations versionnées.
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getE2ETestRunModel } from '../models/E2ETestRun.js'

export interface MigrationResult {
  scanned: number
  updated: number
  remainingNull: number
}

/**
 * Pure migration step — exposed for testability. Caller is responsible for
 * connecting to MongoDB before invocation.
 */
export async function backfillEnvOnRuns(): Promise<MigrationResult> {
  const Run = await getE2ETestRunModel()

  const matchMissing = {
    $or: [{ env: { $exists: false } }, { env: null }],
  }

  const scanned = await Run.countDocuments(matchMissing)

  const updateResult = await Run.updateMany(matchMissing, { $set: { env: 'local' } })

  // Guard — verify nothing escaped the update (e.g. write concern issues).
  const remainingNull = await Run.countDocuments(matchMissing)

  return {
    scanned,
    updated: updateResult.modifiedCount ?? 0,
    remainingNull,
  }
}

async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezstart', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezstart')
  await connectToMongo('ezstart')

  console.info('')
  console.info('🔧 Migrating E2ETestRun docs — backfilling missing `env` field with "local"…')
  console.info('')

  const result = await backfillEnvOnRuns()

  console.info(`   Scanned (env missing/null): ${result.scanned}`)
  console.info(`   Updated:                    ${result.updated}`)
  console.info(`   Remaining null after run:   ${result.remainingNull}`)
  console.info('')

  if (result.remainingNull > 0) {
    console.error(
      `❌ ${result.remainingNull} docs still have null env after migration — investigate before re-running.`
    )
    process.exit(1)
  }

  console.info(`✅ Migration complete — ${result.updated} doc(s) updated, 0 left null.`)
  console.info('')
  process.exit(0)
}

const invokedAsScript = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  const entryUrl = new URL(`file://${entry.replace(/\\/g, '/')}`).href
  return entryUrl === import.meta.url
})()

if (invokedAsScript) {
  main().catch(err => {
    console.error('migrate-e2e-runs-add-env failed:', err)
    process.exit(1)
  })
}
