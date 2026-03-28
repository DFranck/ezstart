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
  AddProjectMemberRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

export const addProjectMemberRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(addProjectMemberRegistry, router, '/projects')

// POST /api/projects/:id/members - Add member to project
docRouter.post('/:id/members', async (req, res) => {
  try {
    const validation = AddProjectMemberRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid request', validation.error.errors)
    }

    const { ownerId } = req.query // User making the request
    const Project = await getProjectModel()

    // @ts-expect-error - Mongoose type inference issue
    const project = await Project.findById(req.params.id)

    if (!project) {
      return sendError(res, 'Project not found', 404)
    }

    // Check if requester is owner
    if (project.ownerId !== ownerId) {
      return sendError(res, 'Only project owner can add members', 403)
    }

    // Check if user already member
    if (project.members.some((m: any) => m.userId === validation.data.userId)) {
      return sendError(res, 'User is already a member', 400)
    }

    // Add member
    project.members.push({
      userId: validation.data.userId,
      role: validation.data.role,
      addedAt: new Date(),
      addedBy: ownerId as string,
    })

    await project.save()

    sendSuccess(res, project)
  } catch (error) {
    logger.error('Error adding project member:', error)
    sendError(res, 'Failed to add member')
  }
}, {
  summary: 'Add member to project (owner only)',
  tags: ['Projects'],
  bodySchema: AddProjectMemberRequestSchema,
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
