import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  WorkspaceSchema,
  UpdateWorkspaceMemberRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const updateWorkspaceMemberRegistry = new OpenAPIRegistry()

const router: any = Router()
export const updateWorkspaceMemberRouter = createRouterWithDoc(updateWorkspaceMemberRegistry, router, '/workspaces')

// PUT /api/workspaces/:id/members/:uid - Update member role
updateWorkspaceMemberRouter.put(
  '/:id/members/:uid',
  async (req, res) => {
    try {
      const userId = req.userId!

      const validation = UpdateWorkspaceMemberRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
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

      // Only owner can update roles
      if (workspace.ownerId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - only owner can update member roles',
          timestamp: new Date().toISOString(),
        })
      }

      // Find member
      const member = workspace.members?.find((m: any) => m.userId === req.params.uid)
      if (!member) {
        return res.status(404).json({
          success: false,
          error: 'Member not found in workspace',
          timestamp: new Date().toISOString(),
        })
      }

      // Update role
      member.role = validation.data.role
      await workspace.save()

      res.json({
        success: true,
        data: workspace,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error updating workspace member:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      })
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
