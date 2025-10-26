import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  WorkspaceSchema,
  CreateWorkspaceRequestSchema,
  UpdateWorkspaceRequestSchema,
  AddWorkspaceMemberRequestSchema,
  UpdateWorkspaceMemberRequestSchema,
  ListWorkspacesQuerySchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../models/Workspace.js'
import { getProjectModel } from '../models/Project.js'

export const workspaceRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(workspaceRegistry, router, '/workspaces')

// ==================== WORKSPACES CRUD ====================

// GET /api/workspaces - List user's workspaces
docRouter.get(
  '/',
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
      console.error('Error listing workspaces:', error)
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

// GET /api/workspaces/:id - Get workspace by ID
docRouter.get(
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

// POST /api/workspaces - Create new workspace
docRouter.post(
  '/',
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

      const validation = CreateWorkspaceRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const Workspace = await getWorkspaceModel()

      // Check if slug already exists
      // @ts-expect-error - Mongoose type inference issue
      const existing = await Workspace.findOne({ slug: validation.data.slug })
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Workspace with this slug already exists',
          timestamp: new Date().toISOString(),
        })
      }

      // Create workspace
      const workspace = new Workspace({
        ...validation.data,
        ownerId: userId,
        members: [],
        status: 'active',
      })

      await workspace.save()

      res.status(201).json({
        success: true,
        data: workspace,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error creating workspace:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Create workspace',
    tags: ['Workspaces'],
    bodySchema: CreateWorkspaceRequestSchema,
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

// PUT /api/workspaces/:id - Update workspace
docRouter.put(
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
      console.error('Error updating workspace:', error)
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

// DELETE /api/workspaces/:id - Delete workspace
docRouter.delete(
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
      console.error('Error deleting workspace:', error)
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

// ==================== WORKSPACE MEMBERS ====================

// POST /api/workspaces/:id/members - Add member to workspace
docRouter.post(
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

// PUT /api/workspaces/:id/members/:uid - Update member role
docRouter.put(
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
      console.error('Error updating workspace member:', error)
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

// DELETE /api/workspaces/:id/members/:uid - Remove member from workspace
docRouter.delete(
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
