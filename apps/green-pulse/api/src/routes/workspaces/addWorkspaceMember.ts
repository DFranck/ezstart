import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  WorkspaceSchema,
  AddWorkspaceMemberRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const addWorkspaceMemberRegistry = new OpenAPIRegistry()

const router: any = Router()
export const addWorkspaceMemberRouter = createRouterWithDoc(addWorkspaceMemberRegistry, router, '/workspaces')

// POST /api/workspaces/:id/members - Add member to workspace
addWorkspaceMemberRouter.post(
  '/:id/members',
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

      const validation = AddWorkspaceMemberRequestSchema.safeParse(req.body)
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

      // Check permissions: only owner or admin can add members
      const member = workspace.members?.find((m: any) => m.userId === userId)
      const isOwner = workspace.ownerId === userId
      const isAdmin = member?.role === 'admin'

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - only owner or admin can add members',
          timestamp: new Date().toISOString(),
        })
      }

      // Check if user already a member
      const existingMember = workspace.members?.find((m: any) => m.userId === validation.data.userId)
      if (existingMember) {
        return res.status(409).json({
          success: false,
          error: 'User is already a member of this workspace',
          timestamp: new Date().toISOString(),
        })
      }

      // Add member
      workspace.members = workspace.members || []
      workspace.members.push({
        userId: validation.data.userId,
        role: validation.data.role,
        joinedAt: new Date(),
      })

      await workspace.save()

      res.json({
        success: true,
        data: workspace,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error adding workspace member:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Add member to workspace',
    tags: ['Workspaces'],
    bodySchema: AddWorkspaceMemberRequestSchema,
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
