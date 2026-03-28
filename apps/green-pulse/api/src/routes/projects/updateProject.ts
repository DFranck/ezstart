import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import {
  ProjectSchema,
  UpdateProjectRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

export const updateProjectRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(updateProjectRegistry, router, '/projects')

// PUT /api/projects/:id - Update project
docRouter.put('/:id', async (req, res) => {
  try {
    const validation = UpdateProjectRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid request', validation.error.errors)
    }

    const Project = await getProjectModel()

    // @ts-expect-error - Mongoose type inference issue
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      validation.data,
      { new: true }
    )

    if (!project) {
      return sendError(res, 'Project not found', 404)
    }

    sendSuccess(res, project)
  } catch (error) {
    logger.error('Error updating project:', error)
    sendError(res, 'Failed to update project')
  }
}, {
  summary: 'Update project',
  tags: ['Projects'],
  bodySchema: UpdateProjectRequestSchema,
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
