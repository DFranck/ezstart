/**
 * Seed script — bulk import E2E test results from a session markdown file.
 *
 * Reads `tmp/e2e-results/session-2026-05-03.md` (or another path passed via
 * MARKDOWN_PATH env var), parses every test result table row, and inserts an
 * E2ETestRun document per row.
 *
 * Workaround for the cross-app SSO bug (#199, #133) blocking the
 * `pnpm e2e:record` CLI helper — we connect to MongoDB directly using the
 * same pattern as `seed-e2e-test-definitions.ts` (zero JWT required).
 *
 * Status mapping :
 *   - `pass`             → 'pass'
 *   - `pass-with-warns`  → 'pass'  (warnings preserved in `notes`)
 *   - `fail`             → 'fail'
 *   - `blocked`          → 'blocked'
 *   - `skip`             → 'skip'
 *   - `pending` | `n/a`  → 'skip'
 *
 * testIds in the markdown that have NO matching definition in the DB are
 * skipped (logged as warn) so the import is non-destructive.
 *
 * Usage:
 *   pnpm --filter api-ezstart seed:e2e-runs
 *   MARKDOWN_PATH=tmp/e2e-results/session-2026-05-03.md pnpm --filter api-ezstart seed:e2e-runs
 *
 * Standard reference: `.claude/rules/standard-saas.md` (E2E coverage),
 * `.claude/rules/data-protection.md` (NODE_ENV guard not needed — we only insert).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getE2ETestDefinitionModel } from '../models/E2ETestDefinition.js'
import { getE2ETestRunModel, type E2ERunStatus } from '../models/E2ETestRun.js'

interface ParsedRow {
  testId: string
  rawStatus: string
  rawTime: string
  agent: string
  notes: string
}

interface MappedRun {
  testId: string
  status: E2ERunStatus
  runAt: Date
  agent: string
  notes: string | null
}

export interface SeedRunsResult {
  totalParsed: number
  recorded: number
  skippedUnmapped: string[]
  perAppBreakdown: Record<
    string,
    { recorded: number; pass: number; fail: number; blocked: number; skip: number }
  >
}

/**
 * Parse the markdown content and extract every result row from every table.
 *
 * A row is recognized as `| testId | status | runAt | agent | notes |`
 * where `testId` matches `<app>.<category>.<feature>` (lowercased, dots/dashes).
 *
 * Header rows (`| testId | status | ... |`) and separator rows (`| --- |`)
 * are skipped.
 */
export function parseMarkdownRows(markdown: string): ParsedRow[] {
  const rows: ParsedRow[] = []
  const lines = markdown.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line.startsWith('|') || !line.endsWith('|')) continue

    // Skip separator rows (| --- | --- | ...)
    if (/^\|\s*-+/.test(line)) continue

    // Split on `|`, drop the empty first/last segments
    const cells = line
      .slice(1, -1)
      .split('|')
      .map(c => c.trim())

    if (cells.length < 5) continue

    const testId = cells[0] ?? ''
    const status = cells[1] ?? ''
    const runAt = cells[2] ?? ''
    const agent = cells[3] ?? ''
    const notes = cells.slice(4).join(' | ').trim()

    // Skip header row : testId is literally "testId"
    if (testId === 'testId') continue

    // Sanity check : testId must look like `<app>.<category>.<feature>`
    if (!/^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$/.test(testId)) continue

    rows.push({
      testId,
      rawStatus: status,
      rawTime: runAt,
      agent: agent || 'manual',
      notes,
    })
  }

  return rows
}

/**
 * Normalize a status string from the markdown to a canonical E2ERunStatus.
 * Returns `null` if the status string is unknown (caller should warn + skip).
 */
function normalizeStatus(raw: string): E2ERunStatus | null {
  const s = raw.toLowerCase().trim()
  if (s === 'pass' || s === 'pass-with-warns') return 'pass'
  if (s === 'fail') return 'fail'
  if (s === 'blocked') return 'blocked'
  if (s === 'skip' || s === 'pending' || s === 'n/a') return 'skip'
  return null
}

/**
 * Build a Date for `runAt`. The session markdown uses `HH:MM` notation only
 * (relative to the session date 2026-05-03). When the time is `—` or empty,
 * we fall back to noon UTC of the session date.
 *
 * Time strings are interpreted in UTC for stability across machines/timezones.
 */
function buildRunAt(rawTime: string, sessionDate: string): Date {
  const trimmed = rawTime.trim()
  if (!trimmed || trimmed === '—' || trimmed === '-') {
    return new Date(`${sessionDate}T12:00:00Z`)
  }
  // Match `HH:MM` (24h) — otherwise fall back to noon
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return new Date(`${sessionDate}T12:00:00Z`)
  const hh = match[1] ?? '12'
  const mm = match[2] ?? '00'
  const hour = hh.padStart(2, '0')
  return new Date(`${sessionDate}T${hour}:${mm}:00Z`)
}

/**
 * Map parsed rows to runs ready for insertion. Filters out rows whose status
 * is unknown (warns) and rows whose agent is empty AND status is 'skip'
 * (those are typically `| n/a | — | — | ...` placeholders that we still
 * want to record as 'skip' — handled by the agent fallback in parseMarkdownRows).
 */
function mapRows(
  rows: ParsedRow[],
  sessionDate: string
): {
  mapped: MappedRun[]
  unknownStatus: ParsedRow[]
} {
  const mapped: MappedRun[] = []
  const unknownStatus: ParsedRow[] = []

  for (const row of rows) {
    const status = normalizeStatus(row.rawStatus)
    if (status === null) {
      unknownStatus.push(row)
      continue
    }
    mapped.push({
      testId: row.testId,
      status,
      runAt: buildRunAt(row.rawTime, sessionDate),
      agent:
        row.agent && row.agent !== '—' && row.agent !== '-' ? row.agent : 'session-bulk-import',
      notes: row.notes && row.notes !== '—' && row.notes !== '-' ? row.notes : null,
    })
  }

  return { mapped, unknownStatus }
}

/**
 * Core seed function — connects, validates against definitions, inserts runs.
 * Exported for testability.
 */
export async function seedE2ETestRunsFromMarkdown(
  markdownPath: string,
  sessionDate: string
): Promise<SeedRunsResult> {
  const markdown = readFileSync(markdownPath, 'utf-8')
  const parsed = parseMarkdownRows(markdown)
  const { mapped, unknownStatus } = mapRows(parsed, sessionDate)

  if (unknownStatus.length > 0) {
    console.warn(`⚠️  Skipped ${unknownStatus.length} rows with unknown status:`)
    for (const row of unknownStatus) {
      console.warn(`   - ${row.testId} (status='${row.rawStatus}')`)
    }
  }

  const Definition = await getE2ETestDefinitionModel()
  const Run = await getE2ETestRunModel()

  const definedIds = new Set<string>(
    (await Definition.find({}, { testId: 1 }).lean().exec()).map(d => d.testId)
  )

  const skippedUnmapped: string[] = []
  const perAppBreakdown: SeedRunsResult['perAppBreakdown'] = {}
  let recorded = 0

  for (const run of mapped) {
    if (!definedIds.has(run.testId)) {
      if (!skippedUnmapped.includes(run.testId)) skippedUnmapped.push(run.testId)
      continue
    }

    await Run.create({
      testId: run.testId,
      status: run.status,
      runAt: run.runAt,
      agent: run.agent,
      notes: run.notes,
      triggeredBy: 'session-bulk-import',
    })

    recorded++

    const app = run.testId.split('.')[0] ?? 'unknown'
    if (!perAppBreakdown[app]) {
      perAppBreakdown[app] = { recorded: 0, pass: 0, fail: 0, blocked: 0, skip: 0 }
    }
    perAppBreakdown[app].recorded++
    perAppBreakdown[app][run.status]++
  }

  return {
    totalParsed: mapped.length,
    recorded,
    skippedUnmapped,
    perAppBreakdown,
  }
}

/**
 * CLI entry point. Connects to MongoDB, runs the import, prints a summary.
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezstart', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezstart')
  await connectToMongo('ezstart')

  // Resolve markdown path relative to monorepo root (3 levels up from
  // apps/ezstart/api/src/scripts/ → ../../../.. → monorepo root).
  const monorepoRoot = resolve(import.meta.dirname, '..', '..', '..', '..', '..')
  const defaultPath = resolve(monorepoRoot, 'tmp/e2e-results/session-2026-05-03.md')
  const markdownPath = process.env.MARKDOWN_PATH
    ? resolve(process.cwd(), process.env.MARKDOWN_PATH)
    : defaultPath

  // Session date inferred from the markdown file convention (YYYY-MM-DD).
  // For the canonical session-2026-05-03.md, that's 2026-05-03.
  const sessionDate = process.env.SESSION_DATE ?? '2026-05-03'

  console.info('')
  console.info(`📥 Importing E2E runs from: ${markdownPath}`)
  console.info(`   Session date: ${sessionDate}`)
  console.info('')

  const result = await seedE2ETestRunsFromMarkdown(markdownPath, sessionDate)

  console.info('')
  console.info(
    `✅ Recorded ${result.recorded} runs across ${Object.keys(result.perAppBreakdown).length} apps (skipped ${result.skippedUnmapped.length} unmapped)`
  )
  console.info('')
  console.info('Per-app breakdown:')
  for (const [app, stats] of Object.entries(result.perAppBreakdown)) {
    console.info(
      `   ${app.padEnd(10)} → ${stats.recorded} runs (pass=${stats.pass}, fail=${stats.fail}, blocked=${stats.blocked}, skip=${stats.skip})`
    )
  }
  if (result.skippedUnmapped.length > 0) {
    console.info('')
    console.info('Unmapped testIds (no matching definition):')
    for (const id of result.skippedUnmapped) {
      console.info(`   - ${id}`)
    }
  }
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
    console.error('seed-e2e-test-runs-from-markdown failed:', err)
    process.exit(1)
  })
}
