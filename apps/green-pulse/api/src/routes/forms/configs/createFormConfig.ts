/**
 * POST /api/forms/configs
 * Create new form configuration (admin only)
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
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
        return res.status(400).json({
          success: false,
          error: 'Invalid form configuration',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const FormConfig = await getFormConfigModel()

      const newConfig = new FormConfig(validation.data)
      await newConfig.save()

      res.status(201).json({
        success: true,
        data: newConfig,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error creating form config:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create form configuration',
        timestamp: new Date().toISOString(),
      })
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
