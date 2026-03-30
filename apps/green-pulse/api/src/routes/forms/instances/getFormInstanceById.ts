/**
 * GET /api/forms/instances/:id
 * Get form instance by ID
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { FormInstanceSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

export const getFormInstanceByIdRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const getFormInstanceByIdRouter = createRouterWithDoc(
  getFormInstanceByIdRegistry,
  router,
  '/instances/:id'
)

getFormInstanceByIdRouter.get(
  '/',
  async (req, res) => {
    try {
      const FormInstance = await getFormInstanceModel()

      const instance = await FormInstance.findById(req.params.id).lean()

      if (!instance) {
        return sendError(res, 'Form instance not found', 404)
      }

      sendSuccess(res, instance)
    } catch (error) {
      logger.error('Error fetching form instance:', error)
      sendError(res, 'Failed to fetch form instance')
    }
  },
  {
    summary: 'Get form instance by ID',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormInstanceSchema),
  }
)

export default router
