/**
 * GET /api/forms/instances
 * List user's form instances
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError } from '@ezstart/express-core'
import { FormInstanceSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

export const listFormInstancesRegistry = new OpenAPIRegistry()
const router: any = Router()
export const listFormInstancesRouter = createRouterWithDoc(
  listFormInstancesRegistry,
  router,
  '/instances'
)

listFormInstancesRouter.get(
  '/',
  async (req, res) => {
    try {
      const FormInstance = await getFormInstanceModel()

      const { userId, formConfigId, status, limit = 20, offset = 0 } = req.query

      const query: any = {}
      if (userId) query.userId = userId
      if (formConfigId) query.formConfigId = formConfigId
      if (status) query.status = status

      // @ts-expect-error - Mongoose type inference issue
      const [instances, total] = await Promise.all([
        FormInstance.find(query).sort({ updatedAt: -1 }).skip(Number(offset)).limit(Number(limit)).lean(),
        FormInstance.countDocuments(query),
      ])

      sendSuccess(res, instances, { total, limit: Number(limit), offset: Number(offset) })
    } catch (error) {
      logger.error('Error fetching form instances:', error)
      sendError(res, 'Failed to fetch form instances')
    }
  },
  {
    summary: 'List form instances',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormInstanceSchema.array()),
  }
)

export default router
