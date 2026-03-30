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

export const getWorkspaceByIdRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
export const getWorkspaceByIdRouter = createRouterWithDoc(
  getWorkspaceByIdRegistry,
  router,
  '/workspaces'
)

// GET /api/workspaces/:id - Get workspace by ID
getWorkspaceByIdRouter.get(
  '/:id',
  async (req, res) => {
    try {
      const userId = req.userId!

      const Workspace = await getWorkspaceModel()
      const Project = await getProjectModel()

      // @ts-expect-error - Mongoose type inference issue
      const workspace = await Workspace.findById(req.params.id).lean()

      if (!workspace) {
        return sendError(res, 'Workspace not found', 404)
      }

      // Check if user has access
      const hasAccess =
        workspace.ownerId === userId ||
        workspace.members?.some((m: { userId: string; role?: string }) => m.userId === userId)

      if (!hasAccess) {
        return sendError(res, 'Forbidden - you do not have access to this workspace', 403)
      }

      // Add stats
      const projectCount = await Project.countDocuments({ workspaceId: workspace._id?.toString() })
      const memberCount = workspace.members?.length || 0
      const currentUserMember = workspace.members?.find(
        (m: { userId: string; role?: string }) => m.userId === userId
      )
      const currentUserRole =
        workspace.ownerId === userId ? 'owner' : currentUserMember?.role || undefined

      sendSuccess(res, {
        ...workspace,
        memberCount,
        projectCount,
        currentUserRole,
      })
    } catch (error) {
      logger.error('Error getting workspace:', error)
      sendError(res, 'Internal server error')
    }
  },
  {
    summary: 'Get workspace by ID',
    tags: ['Workspaces'],
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
