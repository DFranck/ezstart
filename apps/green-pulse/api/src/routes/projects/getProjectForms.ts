import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import {
  ProjectSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getFormInstanceModel } from '../../models/FormInstance.js'

export const getProjectFormsRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(getProjectFormsRegistry, router, '/projects')

// GET /api/projects/:id/forms - Get all form instances for project
docRouter.get('/:id/forms', async (req, res) => {
  try {
    const FormInstance = await getFormInstanceModel()

    // @ts-expect-error - Mongoose type inference issue
    const forms = await FormInstance.find({ projectId: req.params.id }).sort({ createdAt: -1 }).lean()

    sendSuccess(res, forms)
  } catch (error) {
    logger.error('Error fetching project forms:', error)
    sendError(res, 'Failed to fetch project forms')
  }
}, {
  summary: 'Get all form instances for a project',
  tags: ['Projects'],
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
