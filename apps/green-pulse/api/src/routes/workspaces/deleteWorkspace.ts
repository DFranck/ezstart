import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  WorkspaceSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'
import { getProjectModel } from '../../models/Project.js'

export const deleteWorkspaceRegistry = new OpenAPIRegistry()

const router: any = Router()
export const deleteWorkspaceRouter = createRouterWithDoc(deleteWorkspaceRegistry, router, '/workspaces')

// DELETE /api/workspaces/:id - Delete workspace
deleteWorkspaceRouter.delete(
  '/:id',
  async (req, res) => {
    try {
      const userId = req.userId!

      const Workspace = await getWorkspaceModel()
      const Project = await getProjectModel()

      // @ts-expect-error - Mongoose type inference issue
      const workspace = await Workspace.findById(req.params.id)

      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found',
          timestamp: new Date().toISOString(),
        })
      }

      // Only owner can delete workspace
      if (workspace.ownerId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - only owner can delete workspace',
          timestamp: new Date().toISOString(),
        })
      }

      // Delete all projects in workspace
      await Project.deleteMany({ workspaceId: req.params.id })

      // Delete workspace
      // @ts-expect-error - Mongoose type inference issue
      await Workspace.findByIdAndDelete(req.params.id)

      res.json({
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error deleting workspace:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Delete workspace and all projects',
    tags: ['Workspaces'],
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
