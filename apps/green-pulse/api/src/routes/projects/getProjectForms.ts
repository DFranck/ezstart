import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { z } from 'zod'
import { ProjectSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormInstanceModel } from '../../models/FormInstance.js'

const getProjectFormsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export const getProjectFormsRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(getProjectFormsRegistry, router, '/projects')

// GET /api/projects/:id/forms - Get all form instances for project
docRouter.get(
  '/:id/forms',
  async (req, res) => {
    try {
      const validation = getProjectFormsQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const FormInstance = await getFormInstanceModel()
      const { limit, offset } = validation.data

      const filter = { projectId: req.params.id }

      const [forms, total] = await Promise.all([
        FormInstance.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
        FormInstance.countDocuments(filter),
      ])

      sendSuccess(res, forms, { total, limit, offset })
    } catch (error) {
      logger.error('Error fetching project forms:', error)
      sendError(res, 'Failed to fetch project forms')
    }
  },
  {
    summary: 'Get all form instances for a project',
    tags: ['Projects'],
    responseSchema: ApiResponseSchema(ProjectSchema),
  }
)

export default router
