/**
 * GET /api/e2e-tests/needs-rerun
 *
 * Returns the list of tests whose `filesExercised` glob has matched at least
 * one file changed in git since the last `pass` run. Heuristic:
 *
 *   1. For each definition, find the latest `pass` run (`runAt`).
 *   2. Diff git: `git log --name-only --since=<runAt>` → set of changed paths.
 *   3. Match each path against the definition's `filesExercised` globs.
 *   4. Return tests with ≥1 match (i.e. the test is stale).
 *
 * If a test has no recorded pass run, it's considered stale by default.
 *
 * The git invocation uses `execFile` with hard-coded args — no shell, no user
 * input is interpolated, so it is safe even though the API is admin-gated.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { getE2ETestDefinitionModel } from '../../models/E2ETestDefinition.js'
import { getE2ETestRunModel } from '../../models/E2ETestRun.js'
import { EnvFilterSchema, TierFilterSchema } from './schemas.js'

const execFileAsync = promisify(execFile)

export const needsRerunRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const needsRerunRouter = createRouterWithDoc(needsRerunRegistry, router, '/e2e-tests')

/**
 * Convert a glob pattern (e.g. "apps/ezauth/web/**\/login/*.tsx") into a RegExp.
 *
 * Supports:
 * - `**\/`  → matches zero-or-more path segments (so `a/**\/b` matches both `a/b` and `a/x/b`)
 * - `**`    → matches across multiple segments (`.*`)
 * - `*`     → matches within a single segment (`[^/]*`)
 * - `?`     → matches a single non-slash character
 *
 * Brackets `[`, `]`, `(`, `)`, etc. are escaped so file paths like
 * `apps/ezauth/web/src/app/[locale]/login/page.tsx` match literally even
 * when the bracket-segment is part of the pattern.
 *
 * Not a full minimatch (no brace expansion `{a,b}`, no character classes
 * `[abc]`) — sufficient for the seeded glob patterns.
 */
export function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^$(){}|[\]\\]/g, '\\$&')
    // `**\/` (or `**\\/`) → match zero-or-more path segments. We replace BEFORE
    // the bare `**` rule so it has priority. After the previous escape pass,
    // a literal `/` is unchanged, so the marker we look for is `**\/`.
    .replace(/\*\*\//g, '__GLOBSTAR_SLASH__')
    .replace(/\*\*/g, '__GLOBSTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/__GLOBSTAR_SLASH__/g, '(?:.*/)?')
    .replace(/__GLOBSTAR__/g, '.*')
  return new RegExp(`^${escaped}$`)
}

/**
 * Run `git log --name-only --since=<iso>` from the monorepo root and return
 * the set of unique file paths that have changed.
 */
export async function listChangedFilesSince(sinceIso: string, cwd: string): Promise<Set<string>> {
  const { stdout } = await execFileAsync(
    'git',
    ['log', `--since=${sinceIso}`, '--name-only', '--pretty=format:'],
    { cwd, maxBuffer: 8 * 1024 * 1024 }
  )
  const set = new Set<string>()
  for (const raw of stdout.split('\n')) {
    const line = raw.trim()
    if (line.length === 0) continue
    set.add(line.replace(/\\/g, '/'))
  }
  return set
}

/**
 * Resolve the monorepo root from this file's location. The route file lives at
 *   apps/ezstart/api/src/routes/e2e-tests/needsRerun.ts
 * so root = ../../../../.. resolved from `import.meta.url`.
 */
function resolveMonorepoRoot(): string {
  const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:'))
  // dist build keeps the same depth, so the relative climb still works.
  return path.resolve(here, '..', '..', '..', '..', '..', '..')
}

needsRerunRouter.get(
  '/needs-rerun',
  async (req, res) => {
    try {
      // `env` and `tier` are optional — both default to 'all'. When set to a
      // specific value, the staleness calc uses only passes recorded under that
      // dimension so we surface "this test hasn't passed in production smoke
      // since the file was touched".
      const envParse = EnvFilterSchema.safeParse(req.query.env ?? 'all')
      const env = envParse.success ? envParse.data : 'all'
      const tierParse = TierFilterSchema.safeParse(req.query.tier ?? 'all')
      const tier = tierParse.success ? tierParse.data : 'all'

      const Definition = await getE2ETestDefinitionModel()
      const Run = await getE2ETestRunModel()

      const definitions = (await Definition.find({}).lean().exec()) as Record<string, unknown>[]
      if (definitions.length === 0) {
        return sendSuccess(res, { tests: [], reason: 'no-definitions', env, tier })
      }

      // Latest pass run per testId (mirrors the listing aggregation).
      const passMatch: Record<string, unknown> = { status: 'pass' }
      if (env !== 'all') passMatch.env = env
      if (tier !== 'all') passMatch.tier = tier

      const latestPasses = await Run.aggregate<{ _id: string; runAt: Date }>([
        { $match: passMatch },
        { $sort: { testId: 1, runAt: -1 } },
        { $group: { _id: '$testId', runAt: { $first: '$runAt' } } },
      ])
      const lastPassByTest = new Map<string, Date>()
      for (const r of latestPasses) lastPassByTest.set(r._id, r.runAt)

      // Compute the earliest "since" we need to query git for: oldest lastPass
      // across all tests. Tests with no lastPass are flagged as stale outright.
      let earliest: Date | null = null
      for (const d of definitions) {
        const pass = lastPassByTest.get(d.testId as string)
        if (!pass) continue
        if (!earliest || pass.getTime() < earliest.getTime()) earliest = pass
      }

      let changedFiles = new Set<string>()
      let gitOk = true
      let gitError: string | null = null
      if (earliest) {
        try {
          const root = resolveMonorepoRoot()
          changedFiles = await listChangedFilesSince(earliest.toISOString(), root)
        } catch (gitErr) {
          gitOk = false
          gitError = gitErr instanceof Error ? gitErr.message : String(gitErr)
          logger.warn('[E2E Tests] needs-rerun: git log failed', { error: gitError })
        }
      }

      const stale = definitions
        .map(d => {
          const testId = d.testId as string
          const lastPass = lastPassByTest.get(testId) ?? null
          const globs = (d.filesExercised as string[]) ?? []

          if (!lastPass) {
            return {
              testId,
              app: d.app as string,
              feature: d.feature as string,
              priority: d.priority as string,
              lastPassAt: null,
              reason: 'never-passed' as const,
              changedFiles: [] as string[],
            }
          }

          if (!gitOk) {
            // Without git, we can't say more — surface as "unknown".
            return null
          }

          const matchers = globs.map(globToRegex)
          const matched: string[] = []
          for (const file of changedFiles) {
            if (matchers.some(rx => rx.test(file))) matched.push(file)
            if (matched.length >= 10) break // cap surface — we only need a hint
          }
          if (matched.length === 0) return null

          return {
            testId,
            app: d.app as string,
            feature: d.feature as string,
            priority: d.priority as string,
            lastPassAt: lastPass,
            reason: 'files-changed' as const,
            changedFiles: matched,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      return sendSuccess(res, {
        tests: stale,
        env,
        tier,
        gitAvailable: gitOk,
        gitError,
        evaluatedAt: new Date(),
      })
    } catch (error) {
      logger.error('[E2E Tests] needs-rerun error:', error)
      return sendError(res, 'Failed to compute needs-rerun set')
    }
  },
  {
    summary: 'List tests whose exercised files changed since the last pass',
    tags: ['E2E Tests'],
  }
)

export default router
