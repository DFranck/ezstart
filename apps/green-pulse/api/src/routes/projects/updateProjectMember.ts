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
  UpdateProjectMemberRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

export const updateProjectMemberRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(updateProjectMemberRegistry, router, '/projects')

// PUT /api/projects/:id/members/:userId - Update member role
docRouter.put(
  '/:id/members/:userId',
  async (req, res) => {
    try {
      const validation = UpdateProjectMemberRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors)
      }

      const Project = await getProjectModel()

      // @ts-expect-error - Mongoose type inference issue
      const project = await Project.findById(req.params.id)

      if (!project) {
        return sendError(res, 'Project not found', 404)
      }

      // Find and update member
      const member = project.members.find(
        (m: { userId: string; role?: string }) => m.userId === req.params.userId
      )
      if (!member) {
        return sendError(res, 'Member not found', 404)
      }

      member.role = validation.data.role
      await project.save()

      sendSuccess(res, project)
    } catch (error) {
      logger.error('Error updating member role:', error)
      sendError(res, 'Failed to update member role')
    }
  },
  {
    summary: 'Update member role',
    tags: ['Projects'],
    bodySchema: UpdateProjectMemberRequestSchema,
    responseSchema: ApiResponseSchema(ProjectSchema),
  }
)

export default router
