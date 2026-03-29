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
  UpdateWorkspaceMemberRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const updateWorkspaceMemberRegistry = new OpenAPIRegistry()

const router: any = Router()
export const updateWorkspaceMemberRouter = createRouterWithDoc(
  updateWorkspaceMemberRegistry,
  router,
  '/workspaces'
)

// PUT /api/workspaces/:id/members/:uid - Update member role
updateWorkspaceMemberRouter.put(
  '/:id/members/:uid',
  async (req, res) => {
    try {
      const userId = req.userId!

      const validation = UpdateWorkspaceMemberRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors, 400)
      }

      const Workspace = await getWorkspaceModel()

      // @ts-expect-error - Mongoose type inference issue
      const workspace = await Workspace.findById(req.params.id)

      if (!workspace) {
        return sendError(res, 'Workspace not found', 404)
      }

      // Only owner can update roles
      if (workspace.ownerId !== userId) {
        return sendError(res, 'Forbidden - only owner can update member roles', 403)
      }

      // Find member
      const member = workspace.members?.find((m: any) => m.userId === req.params.uid)
      if (!member) {
        return sendError(res, 'Member not found in workspace', 404)
      }

      // Update role
      member.role = validation.data.role
      await workspace.save()

      sendSuccess(res, workspace)
    } catch (error) {
      logger.error('Error updating workspace member:', error)
      sendError(res, 'Internal server error')
    }
  },
  {
    summary: 'Update member role',
    tags: ['Workspaces'],
    bodySchema: UpdateWorkspaceMemberRequestSchema,
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
