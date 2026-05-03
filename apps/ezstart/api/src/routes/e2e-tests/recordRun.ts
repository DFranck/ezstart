/**
 * POST /api/e2e-tests/runs
 *
 * Record a single test run. Admin auth required (the helper CLI signs requests
 * with a superadmin JWT). The endpoint also enforces that the referenced
 * `testId` exists in the definitions collection — otherwise we'd accumulate
 * dangling runs.
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
import { RecordRunSchema } from './schemas.js'

export const recordRunRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const recordRunRouter = createRouterWithDoc(recordRunRegistry, router, '/e2e-tests')

recordRunRouter.post(
  '/runs',
  async (req, res) => {
    try {
      const validation = RecordRunSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid run payload', validation.error.errors)
      }

      const data = validation.data

      const Definition = await getE2ETestDefinitionModel()
      const definition = await Definition.findOne({ testId: data.testId }).lean().exec()
      if (!definition) {
        return sendError(
          res,
          `Unknown testId '${data.testId}' — register the definition first via POST /api/e2e-tests/definitions`,
          422
        )
      }

      const Run = await getE2ETestRunModel()
      const triggeredBy = data.triggeredBy ?? req.userId ?? null

      const run = await Run.create({
        testId: data.testId,
        status: data.status,
        runAt: data.runAt ?? new Date(),
        durationMs: data.durationMs ?? null,
        agent: data.agent,
        agentVersion: data.agentVersion ?? null,
        errors: data.errors ?? [],
        notes: data.notes ?? null,
        fileSnapshotSha: data.fileSnapshotSha ?? null,
        triggeredBy,
      })

      return sendSuccess(res, {
        id: run._id.toString(),
        testId: run.testId,
        status: run.status,
        runAt: run.runAt,
        durationMs: run.durationMs ?? null,
        agent: run.agent,
        agentVersion: run.agentVersion ?? null,
        errors: run.errors ?? [],
        notes: run.notes ?? null,
        fileSnapshotSha: run.fileSnapshotSha ?? null,
        triggeredBy: run.triggeredBy ?? null,
        createdAt: run.createdAt,
      })
    } catch (error) {
      logger.error('[E2E Tests] Record run error:', error)
      return sendError(res, 'Failed to record E2E test run')
    }
  },
  {
    summary: 'Record an E2E test run (admin)',
    tags: ['E2E Tests'],
    bodySchema: RecordRunSchema,
  }
)

export default router
