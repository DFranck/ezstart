/**
 * POST /api/forms/instances
 * Create new form instance
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import {
  FormInstanceSchema,
  CreateFormInstanceRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getFormInstanceModel } from '../../../models/FormInstance.js'

export const createFormInstanceRegistry = new OpenAPIRegistry()
const router: any = Router()
export const createFormInstanceRouter = createRouterWithDoc(
  createFormInstanceRegistry,
  router,
  '/instances'
)

createFormInstanceRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = CreateFormInstanceRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors)
      }

      const FormInstance = await getFormInstanceModel()

      const newInstance = new FormInstance({
        ...validation.data,
        fields: {},
        status: 'draft',
        history: [
          {
            timestamp: new Date(),
            action: 'created',
            userId: validation.data.userId,
          },
        ],
      })
      await newInstance.save()

      sendSuccess(res.status(201), newInstance)
    } catch (error) {
      logger.error('Error creating form instance:', error)
      sendError(res, 'Failed to create form instance')
    }
  },
  {
    summary: 'Create new form instance',
    tags: ['Forms'],
    bodySchema: CreateFormInstanceRequestSchema,
    responseSchema: ApiResponseSchema(FormInstanceSchema),
  }
)

export default router
