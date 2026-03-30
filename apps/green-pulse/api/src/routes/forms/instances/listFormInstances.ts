/**
 * GET /api/forms/instances
 * List user's form instances
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { z } from 'zod'
import { FormInstanceSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

const listFormInstancesQuerySchema = z.object({
  userId: z.string().optional(),
  formConfigId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export const listFormInstancesRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const listFormInstancesRouter = createRouterWithDoc(
  listFormInstancesRegistry,
  router,
  '/instances'
)

listFormInstancesRouter.get(
  '/',
  async (req, res) => {
    try {
      const validation = listFormInstancesQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const FormInstance = await getFormInstanceModel()

      const { userId, formConfigId, status, limit, offset } = validation.data

      const query: Record<string, unknown> = {}
      if (userId) query.userId = userId
      if (formConfigId) query.formConfigId = formConfigId
      if (status) query.status = status

      const [instances, total] = await Promise.all([
        FormInstance.find(query).sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
        FormInstance.countDocuments(query),
      ])

      sendSuccess(res, instances, { total, limit, offset })
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
