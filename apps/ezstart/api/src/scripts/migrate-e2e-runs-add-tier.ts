/**
 * Migration script — backfill `tier` on legacy E2ETestRun documents.
 *
 * Context (E2E-MATRIX-TIER-DIMENSION-001, 2026-05-03) :
 *   The `tier` field was added to `E2ETestRun` to distinguish what the run
 *   actually exercised — `smoke` (curl HTTP), `browser-e2e` (full UI flow), or
 *   `unit` (vitest/jest in-process). All runs persisted before this change
 *   lacked the field, so we infer the tier from the recorded `agent`:
 *
 *     - agent IN ('curl', 'http')                                      → 'smoke'
 *     - agent IN ('mcp-chrome-devtools', 'playwright', 'cypress')      → 'browser-e2e'
 *     - agent IN ('vitest', 'jest', 'ci-vitest')                       → 'unit'
 *     - anything else (incl. 'session-bulk-import', 'manual')          → 'browser-e2e'
 *
 *   The fallback to `browser-e2e` is intentional — it matches the schema
 *   default, so the resulting docs behave identically to a freshly recorded
 *   browser-e2e run with no extra special-casing in the rest of the matrix.
 *
 * Idempotent : the update only touches documents WHERE `tier` is missing
 * (`$exists: false`) OR `tier: null`. Re-running is safe — every subsequent
 * call reports "0 docs updated".
 *
 * Usage:
 *   pnpm --filter api-ezstart migrate:e2e-tier
 *
 * Standard reference:
 *   `.claude/rules/data-protection.md` — script never targets production
 *   destructively (it only sets a default value on a missing field).
 *   `.claude/rules/standard-saas-data.md` §1 — migrations versionnées.
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getE2ETestRunModel, type E2ERunTier } from '../models/E2ETestRun.js'

export interface TierMigrationResult {
  scanned: number
  updated: number
  remainingNull: number
  perTier: Record<E2ERunTier, number>
}

/**
 * Agent → tier mapping. Hard-coded sets match what `record-test-run.ts` and
 * `seed-e2e-test-runs-from-markdown.ts` use for fresh runs, so historic data
 * lands in the same buckets a re-run would.
 */
const SMOKE_AGENTS = new Set(['curl', 'http'])
const BROWSER_AGENTS = new Set(['mcp-chrome-devtools', 'playwright', 'cypress'])
const UNIT_AGENTS = new Set(['vitest', 'jest', 'ci-vitest'])

function tierForAgent(agent: string | undefined | null): E2ERunTier {
  if (!agent) return 'browser-e2e'
  const a = agent.toLowerCase()
  if (SMOKE_AGENTS.has(a)) return 'smoke'
  if (BROWSER_AGENTS.has(a)) return 'browser-e2e'
  if (UNIT_AGENTS.has(a)) return 'unit'
  return 'browser-e2e'
}

/**
 * Pure migration step — exposed for testability. Caller is responsible for
 * connecting to MongoDB before invocation.
 */
export async function backfillTierOnRuns(): Promise<TierMigrationResult> {
  const Run = await getE2ETestRunModel()

  const matchMissing = {
    $or: [{ tier: { $exists: false } }, { tier: null }],
  }

  const scanned = await Run.countDocuments(matchMissing)

  // Bulk write per tier — single $set per group is much cheaper than streaming
  // every doc through the app, and the agent enum is small enough to enumerate.
  const perTier: Record<E2ERunTier, number> = {
    smoke: 0,
    'browser-e2e': 0,
    unit: 0,
  }

  // Iterate the unique agents currently associated with un-tiered runs so we
  // stay correct even if a future agent string is added to one of the sets.
  const distinctAgents = (await Run.distinct('agent', matchMissing)) as string[]

  let updatedTotal = 0
  for (const agent of distinctAgents) {
    const tier = tierForAgent(agent)
    const filter = {
      $or: [{ tier: { $exists: false } }, { tier: null }],
      agent,
    }
    const result = await Run.updateMany(filter, { $set: { tier } })
    const modified = result.modifiedCount ?? 0
    perTier[tier] += modified
    updatedTotal += modified
  }

  // Catch-all for docs that have a null/undefined agent (shouldn't happen — the
  // schema requires it — but the migration still survives if it ever did).
  const fallbackFilter = {
    $or: [{ tier: { $exists: false } }, { tier: null }],
  }
  const fallbackResult = await Run.updateMany(fallbackFilter, { $set: { tier: 'browser-e2e' } })
  const fallbackModified = fallbackResult.modifiedCount ?? 0
  perTier['browser-e2e'] += fallbackModified
  updatedTotal += fallbackModified

  // Guard — verify nothing escaped the update (e.g. write concern issues).
  const remainingNull = await Run.countDocuments(matchMissing)

  return {
    scanned,
    updated: updatedTotal,
    remainingNull,
    perTier,
  }
}

async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezstart', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezstart')
  await connectToMongo('ezstart')

  console.info('')
  console.info('🔧 Migrating E2ETestRun docs — backfilling missing `tier` field from `agent`…')
  console.info('')

  const result = await backfillTierOnRuns()

  console.info(`   Scanned (tier missing/null): ${result.scanned}`)
  console.info(`   Updated:                     ${result.updated}`)
  console.info(`   Remaining null after run:    ${result.remainingNull}`)
  console.info('')
  console.info(
    `   Migrated ${result.updated} docs (smoke=${result.perTier.smoke}, browser-e2e=${result.perTier['browser-e2e']}, unit=${result.perTier.unit})`
  )
  console.info('')

  if (result.remainingNull > 0) {
    console.error(
      `❌ ${result.remainingNull} docs still have null tier after migration — investigate before re-running.`
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
    console.error('migrate-e2e-runs-add-tier failed:', err)
    process.exit(1)
  })
}
