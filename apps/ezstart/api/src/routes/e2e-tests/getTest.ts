/**
 * GET /api/e2e-tests/:testId
 *
 * Single test definition + last 50 runs + summary stats (pass rate, avg
 * duration, run count).
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
import { z } from 'zod'
import { getE2ETestDefinitionModel } from '../../models/E2ETestDefinition.js'
import { getE2ETestRunModel } from '../../models/E2ETestRun.js'
import { TestIdSchema } from './schemas.js'

const ParamsSchema = z.object({ testId: TestIdSchema })

const RUNS_HISTORY_LIMIT = 50

export const getTestRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const getTestRouter = createRouterWithDoc(getTestRegistry, router, '/e2e-tests')

getTestRouter.get(
  '/:testId',
  async (req, res) => {
    try {
      const params = ParamsSchema.safeParse(req.params)
      if (!params.success) {
        return sendValidationError(res, 'Invalid testId param', params.error.errors)
      }

      const { testId } = params.data
      const Definition = await getE2ETestDefinitionModel()
      const Run = await getE2ETestRunModel()

      const definition = await Definition.findOne({ testId }).lean().exec()
      if (!definition) {
        return sendError(res, `Test definition '${testId}' not found`, 404)
      }

      const recentRuns = (await Run.find({ testId })
        .sort({ runAt: -1 })
        .limit(RUNS_HISTORY_LIMIT)
        .lean()
        .exec()) as Record<string, unknown>[]

      // Lifetime stats — done as one aggregation to avoid loading every run.
      const statsAgg = await Run.aggregate<{
        _id: null
        total: number
        pass: number
        fail: number
        skip: number
        blocked: number
        avgDurationMs: number | null
        lastRunAt: Date | null
      }>([
        { $match: { testId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pass: { $sum: { $cond: [{ $eq: ['$status', 'pass'] }, 1, 0] } },
            fail: { $sum: { $cond: [{ $eq: ['$status', 'fail'] }, 1, 0] } },
            skip: { $sum: { $cond: [{ $eq: ['$status', 'skip'] }, 1, 0] } },
            blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
            avgDurationMs: { $avg: '$durationMs' },
            lastRunAt: { $max: '$runAt' },
          },
        },
      ])

      const s = statsAgg[0] ?? {
        total: 0,
        pass: 0,
        fail: 0,
        skip: 0,
        blocked: 0,
        avgDurationMs: null,
        lastRunAt: null,
      }
      const passRate = s.total > 0 ? Math.round((s.pass / s.total) * 1000) / 10 : null

      return sendSuccess(res, {
        definition: {
          testId: definition.testId as string,
          app: definition.app as string,
          feature: definition.feature as string,
          category: definition.category as string,
          description: definition.description as string,
          routesExercised: (definition.routesExercised as string[]) ?? [],
          filesExercised: (definition.filesExercised as string[]) ?? [],
          cadence: definition.cadence as string,
          priority: definition.priority as string,
          createdAt: definition.createdAt as Date,
          updatedAt: definition.updatedAt as Date,
        },
        runs: recentRuns.map(r => ({
          id: String(r._id),
          status: r.status as string,
          runAt: r.runAt as Date,
          agent: r.agent as string,
          agentVersion: (r.agentVersion as string | null) ?? null,
          durationMs: (r.durationMs as number | null) ?? null,
          errors: (r.errors as string[]) ?? [],
          notes: (r.notes as string | null) ?? null,
          fileSnapshotSha: (r.fileSnapshotSha as string | null) ?? null,
          triggeredBy: (r.triggeredBy as string | null) ?? null,
        })),
        stats: {
          total: s.total,
          pass: s.pass,
          fail: s.fail,
          skip: s.skip,
          blocked: s.blocked,
          passRate,
          avgDurationMs: s.avgDurationMs,
          lastRunAt: s.lastRunAt,
        },
      })
    } catch (error) {
      logger.error('[E2E Tests] Get error:', error)
      return sendError(res, 'Failed to fetch E2E test')
    }
  },
  {
    summary: 'Get a single test definition + recent runs + stats',
    tags: ['E2E Tests'],
  }
)

export default router
