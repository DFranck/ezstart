import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { ProjectSchema, ApiResponseSchema } from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

export const getProjectByIdRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(getProjectByIdRegistry, router, '/projects')

// GET /api/projects/:id - Get project by ID
docRouter.get(
  '/:id',
  async (req, res) => {
    try {
      const Project = await getProjectModel()

      // @ts-expect-error - Mongoose type inference issue
      const project = await Project.findById(req.params.id).lean()

      if (!project) {
        return sendError(res, 'Project not found', 404)
      }

      const userId = req.userId!
      const hasAccess =
        project.ownerId === userId ||
        project.members?.some((m: { userId: string }) => m.userId === userId)

      if (!hasAccess) {
        return sendError(res, 'Forbidden - you do not have access to this project', 403)
      }

      sendSuccess(res, project)
    } catch (error) {
      logger.error('Error fetching project:', error)
      sendError(res, 'Failed to fetch project')
    }
  },
  {
    summary: 'Get project by ID',
    tags: ['Projects'],
    responseSchema: ApiResponseSchema(ProjectSchema),
  }
)

export default router
