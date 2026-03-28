/**
 * POST /api/forms/instances/:id/submit
 * Submit form instance
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  FormInstanceSchema,
  SubmitFormInstanceRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

export const submitFormInstanceRegistry = new OpenAPIRegistry()
const router: any = Router()
export const submitFormInstanceRouter = createRouterWithDoc(
  submitFormInstanceRegistry,
  router,
  '/instances/:id/submit'
)

submitFormInstanceRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = SubmitFormInstanceRequestSchema.safeParse({
        instanceId: req.params.id,
        ...req.body,
      })
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
      const instance = await FormInstance.findById(req.params.id)

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Form instance not found',
          timestamp: new Date().toISOString(),
        })
      }

      // Update instance with submission data
      instance.status = 'submitted'
      instance.submittedAt = new Date()
      instance.submittedData = validation.data.finalData || instance.fields

      if (!instance.history) {
        instance.history = []
      }
      instance.history.push({
        timestamp: new Date(),
        action: 'submitted',
        userId: instance.userId,
      })

      await instance.save()

      res.json({
        success: true,
        data: instance,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error submitting form instance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to submit form instance',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Submit form instance',
    tags: ['Forms'],
    bodySchema: SubmitFormInstanceRequestSchema,
    responseSchema: ApiResponseSchema(FormInstanceSchema),
  }
)

export default router
