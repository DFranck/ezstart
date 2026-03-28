/**
 * GET /api/forms/configs/:id
 * Get form configuration by ID
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError } from '@ezstart/express-core'
import { FormConfigSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormConfigModel } from '../../../models/FormConfig.js'

export const getFormConfigByIdRegistry = new OpenAPIRegistry()
const router: any = Router()
export const getFormConfigByIdRouter = createRouterWithDoc(
  getFormConfigByIdRegistry,
  router,
  '/configs/:id'
)

getFormConfigByIdRouter.get(
  '/',
  async (req, res) => {
    try {
      const FormConfig = await getFormConfigModel()

      // @ts-expect-error - Mongoose type inference issue
      const config = await FormConfig.findOne({ id: req.params.id }).lean()

      if (!config) {
        return sendError(res, 'Form configuration not found', 404)
      }

      sendSuccess(res, config)
    } catch (error) {
      logger.error('Error fetching form config:', error)
      sendError(res, 'Failed to fetch form configuration')
    }
  },
  {
    summary: 'Get form configuration by ID',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormConfigSchema),
  }
)

export default router
