import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  WorkspaceSchema,
  UpdateWorkspaceRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const updateWorkspaceRegistry = new OpenAPIRegistry()

const router: any = Router()
export const updateWorkspaceRouter = createRouterWithDoc(updateWorkspaceRegistry, router, '/workspaces')

// PUT /api/workspaces/:id - Update workspace
updateWorkspaceRouter.put(
  '/:id',
  async (req, res) => {
    try {
      const userId = req.userId!

      const validation = UpdateWorkspaceRequestSchema.safeParse(req.body)
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

      // Check permissions: only owner or admin can update
      const member = workspace.members?.find((m: any) => m.userId === userId)
      const isOwner = workspace.ownerId === userId
      const isAdmin = member?.role === 'admin'

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - only owner or admin can update workspace',
          timestamp: new Date().toISOString(),
        })
      }

      // Update workspace
      Object.assign(workspace, validation.data)
      await workspace.save()

      res.json({
        success: true,
        data: workspace,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error updating workspace:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Update workspace',
    tags: ['Workspaces'],
    bodySchema: UpdateWorkspaceRequestSchema,
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
