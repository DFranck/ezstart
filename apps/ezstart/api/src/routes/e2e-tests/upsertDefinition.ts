/**
 * POST /api/e2e-tests/definitions
 *
 * Idempotent upsert of a test definition. Admin-only — used by the seeder
 * and (future) admin UI editor.
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
import { UpsertDefinitionSchema } from './schemas.js'

export const upsertDefinitionRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const upsertDefinitionRouter = createRouterWithDoc(
  upsertDefinitionRegistry,
  router,
  '/e2e-tests'
)

upsertDefinitionRouter.post(
  '/definitions',
  async (req, res) => {
    try {
      const validation = UpsertDefinitionSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid definition payload', validation.error.errors)
      }

      const data = validation.data
      const Definition = await getE2ETestDefinitionModel()

      const updated = await Definition.findOneAndUpdate(
        { testId: data.testId },
        {
          $set: {
            app: data.app,
            feature: data.feature,
            category: data.category,
            description: data.description,
            routesExercised: data.routesExercised,
            filesExercised: data.filesExercised,
            cadence: data.cadence,
            priority: data.priority,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean()

      return sendSuccess(res, {
        testId: updated.testId as string,
        app: updated.app as string,
        feature: updated.feature as string,
        category: updated.category as string,
        description: updated.description as string,
        routesExercised: (updated.routesExercised as string[]) ?? [],
        filesExercised: (updated.filesExercised as string[]) ?? [],
        cadence: updated.cadence as string,
        priority: updated.priority as string,
        createdAt: updated.createdAt as Date,
        updatedAt: updated.updatedAt as Date,
      })
    } catch (error) {
      logger.error('[E2E Tests] Upsert definition error:', error)
      return sendError(res, 'Failed to upsert E2E test definition')
    }
  },
  {
    summary: 'Upsert an E2E test definition (admin)',
    tags: ['E2E Tests'],
    bodySchema: UpsertDefinitionSchema,
  }
)

export default router
