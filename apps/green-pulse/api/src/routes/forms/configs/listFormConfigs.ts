/**
 * GET /api/forms/configs
 * List all form configurations
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { z } from 'zod'
import { FormConfigSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormConfigModel } from '../../../models/FormConfig.js'

const listFormConfigsQuerySchema = z.object({
  category: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export const listFormConfigsRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const listFormConfigsRouter = createRouterWithDoc(
  listFormConfigsRegistry,
  router,
  '/configs'
)

listFormConfigsRouter.get(
  '/',
  async (req, res) => {
    try {
      const validation = listFormConfigsQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const FormConfig = await getFormConfigModel()

      const { category, tags, limit, offset } = validation.data

      const query: Record<string, unknown> = {}
      if (category) query.category = category
      if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] }

      const [configs, total] = await Promise.all([
        // @ts-expect-error - Mongoose type inference issue with dynamic query
        FormConfig.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
        FormConfig.countDocuments(query),
      ])

      sendSuccess(res, configs, { total, limit, offset })
    } catch (error) {
      logger.error('Error fetching form configs:', error)
      sendError(res, 'Failed to fetch form configurations')
    }
  },
  {
    summary: 'List all form configurations',
    tags: ['Forms'],
    responseSchema: ApiResponseSchema(FormConfigSchema.array()),
  }
)

export default router
