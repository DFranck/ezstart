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
import { getProjectModel } from '../../models/Project.js'

export const deleteWorkspaceRegistry = new OpenAPIRegistry()

const router: any = Router()
export const deleteWorkspaceRouter = createRouterWithDoc(
  deleteWorkspaceRegistry,
  router,
  '/workspaces'
)

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
        return sendError(res, 'Workspace not found', 404)
      }

      // Only owner can delete workspace
      if (workspace.ownerId !== userId) {
        return sendError(res, 'Forbidden - only owner can delete workspace', 403)
      }

      // Delete all projects in workspace
      await Project.deleteMany({ workspaceId: req.params.id })

      // Delete workspace
      // @ts-expect-error - Mongoose type inference issue
      await Workspace.findByIdAndDelete(req.params.id)

      sendSuccess(res, { deleted: true })
    } catch (error) {
      logger.error('Error deleting workspace:', error)
      sendError(res, 'Internal server error')
    }
  },
  {
    summary: 'Delete workspace and all projects',
    tags: ['Workspaces'],
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
