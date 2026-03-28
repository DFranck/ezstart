/**
 * POST /api/forms/configs
 * Create new form configuration (admin only)
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import { FormConfigSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormConfigModel } from '../../../models/FormConfig.js'

export const createFormConfigRegistry = new OpenAPIRegistry()
const router: any = Router()
export const createFormConfigRouter = createRouterWithDoc(
  createFormConfigRegistry,
  router,
  '/configs'
)

createFormConfigRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = FormConfigSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid form configuration', validation.error.errors)
      }

      const FormConfig = await getFormConfigModel()

      const newConfig = new FormConfig(validation.data)
      await newConfig.save()

      sendSuccess(res.status(201), newConfig)
    } catch (error) {
      logger.error('Error creating form config:', error)
      sendError(res, 'Failed to create form configuration')
    }
  },
  {
    summary: 'Create new form configuration',
    tags: ['Forms'],
    bodySchema: FormConfigSchema,
    responseSchema: ApiResponseSchema(FormConfigSchema),
  }
)

export default router
