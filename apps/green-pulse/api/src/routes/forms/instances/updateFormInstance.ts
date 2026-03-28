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
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const FormInstance = await getFormInstanceModel()

      // @ts-expect-error - Mongoose type inference issue
      const instance = await FormInstance.findByIdAndUpdate(
        req.params.id,
        validation.data,
        { new: true }
      )

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Form instance not found',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        data: instance,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error updating form instance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update form instance',
        timestamp: new Date().toISOString(),
      })
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
