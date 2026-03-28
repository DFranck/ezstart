/**
 * POST /api/forms/instances/:id/submit
 * Submit form instance
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
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
        return sendValidationError(res, 'Invalid request', validation.error.errors)
      }

      const FormInstance = await getFormInstanceModel()

      // @ts-expect-error - Mongoose type inference issue
      const instance = await FormInstance.findById(req.params.id)

      if (!instance) {
        return sendError(res, 'Form instance not found', 404)
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

      sendSuccess(res, instance)
    } catch (error) {
      logger.error('Error submitting form instance:', error)
      sendError(res, 'Failed to submit form instance')
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
