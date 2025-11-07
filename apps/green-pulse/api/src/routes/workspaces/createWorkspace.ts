import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import {
  WorkspaceSchema,
  CreateWorkspaceRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const createWorkspaceRegistry = new OpenAPIRegistry()

const router: any = Router()
export const createWorkspaceRouter = createRouterWithDoc(createWorkspaceRegistry, router, '/workspaces')

// POST /api/workspaces - Create new workspace
createWorkspaceRouter.post(
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

export default router
