/**
 * PUT /api/forms/instances/:id
 * Update form instance
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import {
  FormInstanceSchema,
  UpdateFormInstanceRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

export const updateFormInstanceRegistry = new OpenAPIRegistry()
const router: any = Router()
export const updateFormInstanceRouter = createRouterWithDoc(
  updateFormInstanceRegistry,
  router,
  '/instances/:id'
)

updateFormInstanceRouter.put(
  '/',
  async (req, res) => {
    try {
      const validation = UpdateFormInstanceRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors)
      }

      const FormInstance = await getFormInstanceModel()

      // @ts-expect-error - Mongoose type inference issue
      const instance = await FormInstance.findByIdAndUpdate(
        req.params.id,
        validation.data,
        { new: true }
      )

      if (!instance) {
        return sendError(res, 'Form instance not found', 404)
      }

      sendSuccess(res, instance)
    } catch (error) {
      logger.error('Error updating form instance:', error)
      sendError(res, 'Failed to update form instance')
    }
  },
  {
    summary: 'Update form instance',
    tags: ['Forms'],
    bodySchema: UpdateFormInstanceRequestSchema,
    responseSchema: ApiResponseSchema(FormInstanceSchema),
  }
)

export default router
