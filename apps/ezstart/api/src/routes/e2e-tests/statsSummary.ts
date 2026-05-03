/**
 * GET /api/e2e-tests/stats/summary
 *
 * Global matrix summary — total definitions, latest-run breakdown, by-app
 * breakdown, and pass rate. Read-only, public.
 */

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

export const statsSummaryRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const statsSummaryRouter = createRouterWithDoc(statsSummaryRegistry, router, '/e2e-tests')

statsSummaryRouter.get(
  '/stats/summary',
  async (_req, res) => {
    try {
      const Definition = await getE2ETestDefinitionModel()
      const Run = await getE2ETestRunModel()

      // Counts of definitions per app.
      const defByApp = await Definition.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$app', count: { $sum: 1 } } },
      ])

      const totalDefinitions = await Definition.countDocuments({})

      // Latest run per testId, then count buckets per status + per app.
      const latest = await Run.aggregate<{
        _id: string
        status: string
      }>([
        { $sort: { testId: 1, runAt: -1 } },
        {
          $group: {
            _id: '$testId',
            status: { $first: '$status' },
          },
        },
      ])

      const statusCounts = { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 }
      const latestByTest = new Map<string, string>()
      for (const r of latest) {
        if (r.status in statusCounts) {
          statusCounts[r.status as keyof typeof statusCounts]++
        }
        latestByTest.set(r._id, r.status)
      }

      // Tests with definitions but no run at all.
      const allDefIds = (await Definition.find({}, { testId: 1 }).lean().exec()) as Array<{
        testId: string
      }>
      let neverRun = 0
      for (const d of allDefIds) {
        if (!latestByTest.has(d.testId)) neverRun++
      }
      statusCounts.never = neverRun

      // Per-app breakdown using latest-run map.
      const byApp = defByApp.map(({ _id, count }) => {
        const appDefs = allDefIds.filter(d => d.testId.startsWith(`${_id}.`))
        const appCounts = { pass: 0, fail: 0, skip: 0, blocked: 0, never: 0 }
        for (const d of appDefs) {
          const status = latestByTest.get(d.testId)
          if (status && status in appCounts) {
            appCounts[status as keyof typeof appCounts]++
          } else {
            appCounts.never++
          }
        }
        return {
          app: _id,
          totalDefinitions: count,
          ...appCounts,
        }
      })

      const ranked =
        statusCounts.pass + statusCounts.fail + statusCounts.skip + statusCounts.blocked
      const passRate = ranked > 0 ? Math.round((statusCounts.pass / ranked) * 1000) / 10 : null

      const lastRunDoc = await Run.findOne({}).sort({ runAt: -1 }).lean().exec()

      return sendSuccess(res, {
        totalDefinitions,
        latestRunBreakdown: statusCounts,
        passRate,
        byApp,
        lastRunAt: lastRunDoc?.runAt ?? null,
        evaluatedAt: new Date(),
      })
    } catch (error) {
      logger.error('[E2E Tests] Stats summary error:', error)
      return sendError(res, 'Failed to compute stats summary')
    }
  },
  {
    summary: 'Global E2E test matrix summary',
    tags: ['E2E Tests'],
  }
)

export default router
