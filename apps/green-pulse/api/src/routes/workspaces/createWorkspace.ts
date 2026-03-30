import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import {
  WorkspaceSchema,
  CreateWorkspaceRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const createWorkspaceRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
export const createWorkspaceRouter = createRouterWithDoc(
  createWorkspaceRegistry,
  router,
  '/workspaces'
)

// POST /api/workspaces - Create new workspace
createWorkspaceRouter.post(
  '/',
  async (req, res) => {
    try {
      const userId = req.userId!

      const validation = CreateWorkspaceRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors, 400)
      }

      const Workspace = await getWorkspaceModel()

      // Check if slug already exists
      // @ts-expect-error - Mongoose type inference issue
      const existing = await Workspace.findOne({ slug: validation.data.slug })
      if (existing) {
        return sendError(res, 'Workspace with this slug already exists', 409)
      }

      // Create workspace
      const workspace = new Workspace({
        ...validation.data,
        ownerId: userId,
        members: [],
        status: 'active',
      })

      await workspace.save()

      res.status(201)
      sendSuccess(res, workspace)
    } catch (error) {
      logger.error('Error creating workspace:', error)
      sendError(res, 'Internal server error')
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
