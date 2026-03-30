import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { WorkspaceSchema, ApiResponseSchema } from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const removeWorkspaceMemberRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
export const removeWorkspaceMemberRouter = createRouterWithDoc(
  removeWorkspaceMemberRegistry,
  router,
  '/workspaces'
)

// DELETE /api/workspaces/:id/members/:uid - Remove member from workspace
removeWorkspaceMemberRouter.delete(
  '/:id/members/:uid',
  async (req, res) => {
    try {
      const userId = req.userId!

      const Workspace = await getWorkspaceModel()

      // @ts-expect-error - Mongoose type inference issue
      const workspace = await Workspace.findById(req.params.id)

      if (!workspace) {
        return sendError(res, 'Workspace not found', 404)
      }

      // Check permissions: only owner or admin can remove members
      const member = workspace.members?.find(
        (m: { userId: string; role?: string }) => m.userId === userId
      )
      const isOwner = workspace.ownerId === userId
      const isAdmin = member?.role === 'admin'

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Forbidden - only owner or admin can remove members', 403)
      }

      // Cannot remove owner
      if (req.params.uid === workspace.ownerId) {
        return sendError(res, 'Cannot remove workspace owner', 400)
      }

      // Find and remove member
      const memberToRemove = workspace.members?.find(
        (m: { userId: string; role?: string }) => m.userId === req.params.uid
      )
      if (!memberToRemove) {
        return sendError(res, 'Member not found in workspace', 404)
      }

      workspace.members =
        workspace.members?.filter(
          (m: { userId: string; role?: string }) => m.userId !== req.params.uid
        ) || []
      await workspace.save()

      sendSuccess(res, workspace)
    } catch (error) {
      logger.error('Error removing workspace member:', error)
      sendError(res, 'Internal server error')
    }
  },
  {
    summary: 'Remove member from workspace',
    tags: ['Workspaces'],
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
