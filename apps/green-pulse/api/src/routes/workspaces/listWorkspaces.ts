import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { WorkspaceSchema, ListWorkspacesQuerySchema, ApiResponseSchema } from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'
import { getProjectModel } from '../../models/Project.js'

export const listWorkspacesRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
export const listWorkspacesRouter = createRouterWithDoc(
  listWorkspacesRegistry,
  router,
  '/workspaces'
)

// GET /api/workspaces - List user's workspaces
listWorkspacesRouter.get(
  '/',
  async (req, res) => {
    try {
      const userId = req.userId!

      const validation = ListWorkspacesQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors, 400)
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

      const workspaces = await (Workspace.find as Function)(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()

      const total = await Workspace.countDocuments(query)

      // Add stats to each workspace
      const workspacesWithStats = await Promise.all(
        workspaces.map(
          async (
            workspace: Record<string, unknown> & {
              _id?: { toString(): string }
              members?: Array<{ userId: string; role?: string }>
              ownerId?: string
            }
          ) => {
            const projectCount = await Project.countDocuments({
              workspaceId: workspace._id?.toString(),
            })
            const memberCount = workspace.members?.length || 0
            const currentUserMember = workspace.members?.find(
              (m: { userId: string; role?: string }) => m.userId === userId
            )
            const currentUserRole =
              workspace.ownerId === userId ? 'owner' : currentUserMember?.role || undefined

            return {
              ...workspace,
              memberCount,
              projectCount,
              currentUserRole,
            }
          }
        )
      )

      sendSuccess(res, workspacesWithStats, { total, limit, offset })
    } catch (error) {
      logger.error('Error listing workspaces:', error)
      sendError(res, 'Internal server error')
    }
  },
  {
    summary: 'List user workspaces',
    tags: ['Workspaces'],
    responseSchema: ApiResponseSchema(WorkspaceSchema.array()),
  }
)

export default router
