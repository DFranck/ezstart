/**
 * GET /api/forms/configs/:id
 * Get form configuration by ID
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
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
        return res.status(404).json({
          success: false,
          error: 'Form configuration not found',
          timestamp: new Date().toISOString(),
        })
      }

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error fetching form config:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch form configuration',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Get form configuration by ID',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormConfigSchema),
  }
)

export default router
