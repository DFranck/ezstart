/**
 * GET /api/e2e-tests
 *
 * Paginated list of test definitions with their latest run status, returned
 * as a single matrix-friendly payload. Public read (no auth) so the dashboard
 * can render even when not signed in — runs are still write-protected.
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getE2ETestDefinitionModel } from '../../models/E2ETestDefinition.js'
import { getE2ETestRunModel } from '../../models/E2ETestRun.js'
import { ListDefinitionsQuerySchema } from './schemas.js'

export const listTestsRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const listTestsRouter = createRouterWithDoc(listTestsRegistry, router, '/e2e-tests')

interface LatestRunInfo {
  status: string
  env: string
  tier: string
  runAt: Date
  agent: string
  durationMs?: number | null
  errors?: string[]
}

listTestsRouter.get(
  '/',
  async (req, res) => {
    try {
      const validation = ListDefinitionsQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const { app, category, feature, priority, status, env, tier, limit, offset } = validation.data

      const Definition = await getE2ETestDefinitionModel()
      const Run = await getE2ETestRunModel()

      const defQuery: Record<string, unknown> = {}
      if (app) defQuery.app = app
      if (category) defQuery.category = category
      if (feature) defQuery.feature = feature
      if (priority) defQuery.priority = priority

      const [definitions, total] = await Promise.all([
        Definition.find(defQuery)
          .sort({ app: 1, category: 1, feature: 1, testId: 1 })
          .skip(offset)
          .limit(limit)
          .lean()
          .exec() as Promise<Record<string, unknown>[]>,
        Definition.countDocuments(defQuery),
      ])

      const testIds = definitions.map(d => d.testId as string)

      // Fetch latest run per test in one round-trip via aggregation.
      // When `env !== 'all'` / `tier !== 'all'`, the latest run is computed
      // per-env / per-tier so the matrix surfaces "latest run in <env>+<tier>"
      // rather than "latest run anywhere".
      const runMatch: Record<string, unknown> = { testId: { $in: testIds } }
      if (env !== 'all') runMatch.env = env
      if (tier !== 'all') runMatch.tier = tier

      const latestRuns = testIds.length
        ? await Run.aggregate<{
            _id: string
            status: string
            env: string
            tier: string
            runAt: Date
            agent: string
            durationMs?: number | null
            errors?: string[]
          }>([
            { $match: runMatch },
            { $sort: { testId: 1, runAt: -1 } },
            {
              $group: {
                _id: '$testId',
                status: { $first: '$status' },
                env: { $first: '$env' },
                tier: { $first: '$tier' },
                runAt: { $first: '$runAt' },
                agent: { $first: '$agent' },
                durationMs: { $first: '$durationMs' },
                errors: { $first: '$errors' },
              },
            },
          ])
        : []

      const runByTest = new Map<string, LatestRunInfo>()
      for (const r of latestRuns) {
        runByTest.set(r._id, {
          status: r.status,
          env: r.env ?? 'local',
          tier: r.tier ?? 'browser-e2e',
          runAt: r.runAt,
          agent: r.agent,
          durationMs: r.durationMs ?? null,
          errors: r.errors ?? [],
        })
      }

      const items = definitions
        .map(d => {
          const last = runByTest.get(d.testId as string) ?? null
          return {
            testId: d.testId as string,
            app: d.app as string,
            feature: d.feature as string,
            category: d.category as string,
            description: d.description as string,
            routesExercised: (d.routesExercised as string[]) ?? [],
            filesExercised: (d.filesExercised as string[]) ?? [],
            cadence: d.cadence as string,
            priority: d.priority as string,
            createdAt: d.createdAt as Date,
            updatedAt: d.updatedAt as Date,
            lastRun: last,
            lastStatus: last?.status ?? 'never-run',
          }
        })
        .filter(item => {
          if (!status) return true
          // Filter post-fetch on lastStatus when client requested it.
          return item.lastStatus === status
        })

      return sendSuccess(res, { tests: items, env, tier }, { total, limit, offset })
    } catch (error) {
      logger.error('[E2E Tests] List error:', error)
      return sendError(res, 'Failed to list E2E tests')
    }
  },
  {
    summary: 'List E2E test definitions with their latest run',
    tags: ['E2E Tests'],
  }
)

export default router
