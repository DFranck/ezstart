/**
 * DELETE /api/forms/instances/:id
 * Delete form instance
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

export const deleteFormInstanceRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const deleteFormInstanceRouter = createRouterWithDoc(
  deleteFormInstanceRegistry,
  router,
  '/instances/:id'
)

deleteFormInstanceRouter.delete(
  '/',
  async (req, res) => {
    try {
      const FormInstance = await getFormInstanceModel()

      const instance = await FormInstance.findByIdAndDelete(req.params.id)

      if (!instance) {
        return sendError(res, 'Form instance not found', 404)
      }

      sendSuccess(res, { deleted: true })
    } catch (error) {
      logger.error('Error deleting form instance:', error)
      sendError(res, 'Failed to delete form instance')
    }
  },
  {
    summary: 'Delete form instance',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormInstanceSchema),
  }
)

export default router
