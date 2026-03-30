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

export const removeProjectMemberRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(removeProjectMemberRegistry, router, '/projects')

// DELETE /api/projects/:id/members/:userId - Remove member
docRouter.delete(
  '/:id/members/:userId',
  async (req, res) => {
    try {
      const Project = await getProjectModel()

      // @ts-expect-error - Mongoose type inference issue
      const project = await Project.findById(req.params.id)

      if (!project) {
        return sendError(res, 'Project not found', 404)
      }

      // Remove member
      project.members = project.members.filter(
        (m: { userId: string; role?: string }) => m.userId !== req.params.userId
      )
      await project.save()

      sendSuccess(res, project)
    } catch (error) {
      logger.error('Error removing member:', error)
      sendError(res, 'Failed to remove member')
    }
  },
  {
    summary: 'Remove member from project',
    tags: ['Projects'],
    responseSchema: ApiResponseSchema(ProjectSchema),
  }
)

export default router
