import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  WorkspaceSchema,
  ListWorkspacesQuerySchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'
import { getProjectModel } from '../../models/Project.js'

export const listWorkspacesRegistry = new OpenAPIRegistry()

const router: any = Router()
export const listWorkspacesRouter = createRouterWithDoc(listWorkspacesRegistry, router, '/workspaces')

// GET /api/workspaces - List user's workspaces
listWorkspacesRouter.get(
  '/',
  async (req, res) => {
    try {
      const userId = req.userId!

      const validation = ListWorkspacesQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const { status, limit, offset } = validation.data

      const Workspace = await getWorkspaceModel()
      const Project = await getProjectModel()

      // Find workspaces where user is owner or member
      const query: Record<string, unknown> = {
        $or: [{ ownerId: userId }, { 'members.userId': userId }],
      }
      if (status) {
        query.status = status
      }

      // @ts-expect-error - Mongoose type inference issue
      const workspaces = await Workspace.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean()

      const total = await Workspace.countDocuments(query)

      // Add stats to each workspace
      const workspacesWithStats = await Promise.all(
        workspaces.map(async (workspace: any) => {
          const projectCount = await Project.countDocuments({ workspaceId: workspace._id?.toString() })
          const memberCount = workspace.members?.length || 0
          const currentUserMember = workspace.members?.find((m: any) => m.userId === userId)
          const currentUserRole = workspace.ownerId === userId ? 'owner' : currentUserMember?.role || undefined

          return {
            ...workspace,
            memberCount,
            projectCount,
            currentUserRole,
          }
        })
      )

      res.json({
        success: true,
        data: { workspaces: workspacesWithStats, total },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Error listing workspaces:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'List user workspaces',
    tags: ['Workspaces'],
    responseSchema: ApiResponseSchema(WorkspaceSchema.array()),
  }
)

export default router
