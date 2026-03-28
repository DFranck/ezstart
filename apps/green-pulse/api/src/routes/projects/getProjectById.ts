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
import { getProjectModel } from '../../models/Project.js'

export const getProjectByIdRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(getProjectByIdRegistry, router, '/projects')

// GET /api/projects/:id - Get project by ID
docRouter.get('/:id', async (req, res) => {
  try {
    const Project = await getProjectModel()

    // @ts-expect-error - Mongoose type inference issue
    const project = await Project.findById(req.params.id).lean()

    if (!project) {
      return sendError(res, 'Project not found', 404)
    }

    // TODO: Check if user has access to this project
    // const { userId } = req.query
    // const hasAccess = project.ownerId === userId || project.members.some(m => m.userId === userId)
    // if (!hasAccess) return 403

    sendSuccess(res, project)
  } catch (error) {
    logger.error('Error fetching project:', error)
    sendError(res, 'Failed to fetch project')
  }
}, {
  summary: 'Get project by ID',
  tags: ['Projects'],
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
