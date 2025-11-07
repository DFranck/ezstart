import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  WorkspaceSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const removeWorkspaceMemberRegistry = new OpenAPIRegistry()

const router: any = Router()
export const removeWorkspaceMemberRouter = createRouterWithDoc(removeWorkspaceMemberRegistry, router, '/workspaces')

// DELETE /api/workspaces/:id/members/:uid - Remove member from workspace
removeWorkspaceMemberRouter.delete(
  '/:id/members/:uid',
  async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - x-user-id header required',
          timestamp: new Date().toISOString(),
        })
      }

      const Workspace = await getWorkspaceModel()

      // @ts-expect-error - Mongoose type inference issue
      const workspace = await Workspace.findById(req.params.id)

      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found',
          timestamp: new Date().toISOString(),
        })
      }

      // Check permissions: only owner or admin can remove members
      const member = workspace.members?.find((m: any) => m.userId === userId)
      const isOwner = workspace.ownerId === userId
      const isAdmin = member?.role === 'admin'

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - only owner or admin can remove members',
          timestamp: new Date().toISOString(),
        })
      }

      // Cannot remove owner
      if (req.params.uid === workspace.ownerId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove workspace owner',
          timestamp: new Date().toISOString(),
        })
      }

      // Find and remove member
      const memberToRemove = workspace.members?.find((m: any) => m.userId === req.params.uid)
      if (!memberToRemove) {
        return res.status(404).json({
          success: false,
          error: 'Member not found in workspace',
          timestamp: new Date().toISOString(),
        })
      }

      workspace.members = workspace.members?.filter((m: any) => m.userId !== req.params.uid) || []
      await workspace.save()

      res.json({
        success: true,
        data: workspace,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error removing workspace member:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Remove member from workspace',
    tags: ['Workspaces'],
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
