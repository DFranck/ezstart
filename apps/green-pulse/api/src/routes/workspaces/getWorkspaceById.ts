import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  WorkspaceSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'
import { getProjectModel } from '../../models/Project.js'

export const getWorkspaceByIdRegistry = new OpenAPIRegistry()

const router: any = Router()
export const getWorkspaceByIdRouter = createRouterWithDoc(getWorkspaceByIdRegistry, router, '/workspaces')

// GET /api/workspaces/:id - Get workspace by ID
getWorkspaceByIdRouter.get(
  '/:id',
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
      const Project = await getProjectModel()

      // @ts-expect-error - Mongoose type inference issue
      const workspace = await Workspace.findById(req.params.id).lean()

      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found',
          timestamp: new Date().toISOString(),
        })
      }

      // Check if user has access
      const hasAccess = workspace.ownerId === userId || workspace.members?.some((m: any) => m.userId === userId)

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - you do not have access to this workspace',
          timestamp: new Date().toISOString(),
        })
      }

      // Add stats
      const projectCount = await Project.countDocuments({ workspaceId: workspace._id?.toString() })
      const memberCount = workspace.members?.length || 0
      const currentUserMember = workspace.members?.find((m: any) => m.userId === userId)
      const currentUserRole = workspace.ownerId === userId ? 'owner' : currentUserMember?.role || undefined

      res.json({
        success: true,
        data: {
          ...workspace,
          memberCount,
          projectCount,
          currentUserRole,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error getting workspace:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Get workspace by ID',
    tags: ['Workspaces'],
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
