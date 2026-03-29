import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { ProjectSchema, ApiResponseSchema } from '@green-pulse/types'
import { getFormInstanceModel } from '../../models/FormInstance.js'

export const getProjectFormsRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(getProjectFormsRegistry, router, '/projects')

// GET /api/projects/:id/forms - Get all form instances for project
docRouter.get(
  '/:id/forms',
  async (req, res) => {
    try {
      const FormInstance = await getFormInstanceModel()
      const limit = Math.min(Number(req.query.limit) || 20, 100)
      const offset = Math.max(Number(req.query.offset) || 0, 0)

      const filter = { projectId: req.params.id }

      const [forms, total] = await Promise.all([
        (FormInstance as any).find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
        (FormInstance as any).countDocuments(filter),
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
