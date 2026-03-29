import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import {
  WorkspaceSchema,
  AddWorkspaceMemberRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const addWorkspaceMemberRegistry = new OpenAPIRegistry()

const router: any = Router()
export const addWorkspaceMemberRouter = createRouterWithDoc(
  addWorkspaceMemberRegistry,
  router,
  '/workspaces'
)

// POST /api/workspaces/:id/members - Add member to workspace
addWorkspaceMemberRouter.post(
  '/:id/members',
  async (req, res) => {
    try {
      const userId = req.userId!

      const validation = AddWorkspaceMemberRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors, 400)
      }

      const Workspace = await getWorkspaceModel()

      // @ts-expect-error - Mongoose type inference issue
      const workspace = await Workspace.findById(req.params.id)

      if (!workspace) {
        return sendError(res, 'Workspace not found', 404)
      }

      // Check permissions: only owner or admin can add members
      const member = workspace.members?.find((m: any) => m.userId === userId)
      const isOwner = workspace.ownerId === userId
      const isAdmin = member?.role === 'admin'

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Forbidden - only owner or admin can add members', 403)
      }

      // Check if user already a member
      const existingMember = workspace.members?.find(
        (m: any) => m.userId === validation.data.userId
      )
      if (existingMember) {
        return sendError(res, 'User is already a member of this workspace', 409)
      }

      // Add member
      workspace.members = workspace.members || []
      workspace.members.push({
        userId: validation.data.userId,
        role: validation.data.role,
        joinedAt: new Date(),
      })

      await workspace.save()

      sendSuccess(res, workspace)
    } catch (error) {
      logger.error('Error adding workspace member:', error)
      sendError(res, 'Internal server error')
    }
  },
  {
    summary: 'Add member to workspace',
    tags: ['Workspaces'],
    bodySchema: AddWorkspaceMemberRequestSchema,
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
