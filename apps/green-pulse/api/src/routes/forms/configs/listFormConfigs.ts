/**
 * GET /api/forms/configs
 * List all form configurations
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { FormConfigSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormConfigModel } from '../../../models/FormConfig.js'

export const listFormConfigsRegistry = new OpenAPIRegistry()
const router: any = Router()
export const listFormConfigsRouter = createRouterWithDoc(
  listFormConfigsRegistry,
  router,
  '/configs'
)

listFormConfigsRouter.get(
  '/',
  async (req, res) => {
    try {
      const FormConfig = await getFormConfigModel()

      const { category, tags, limit = 20, offset = 0 } = req.query

      const query: any = {}
      if (category) query.category = category
      if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] }

      // @ts-expect-error - Mongoose type inference issue
      const [configs, total] = await Promise.all([
        FormConfig.find(query).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit)).lean(),
        FormConfig.countDocuments(query),
      ])

      res.json({
        success: true,
        data: configs,
        meta: { total, limit: Number(limit), offset: Number(offset) },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error fetching form configs:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch form configurations',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'List all form configurations',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormConfigSchema.array()),
  }
)

export default router
