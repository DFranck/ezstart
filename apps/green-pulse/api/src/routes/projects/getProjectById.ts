import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
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
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date().toISOString(),
      })
    }

    // TODO: Check if user has access to this project
    // const { userId } = req.query
    // const hasAccess = project.ownerId === userId || project.members.some(m => m.userId === userId)
    // if (!hasAccess) return 403

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error fetching project:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Get project by ID',
  tags: ['Projects'],
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
