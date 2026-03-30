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
  UpdateWorkspaceRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getWorkspaceModel } from '../../models/Workspace.js'

export const updateWorkspaceRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
export const updateWorkspaceRouter = createRouterWithDoc(
  updateWorkspaceRegistry,
  router,
  '/workspaces'
)

// PUT /api/workspaces/:id - Update workspace
updateWorkspaceRouter.put(
  '/:id',
  async (req, res) => {
    try {
      const userId = req.userId!

      const validation = UpdateWorkspaceRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors, 400)
      }

      const Workspace = await getWorkspaceModel()

      // @ts-expect-error - Mongoose type inference issue
      const workspace = await Workspace.findById(req.params.id)

      if (!workspace) {
        return sendError(res, 'Workspace not found', 404)
      }

      // Check permissions: only owner or admin can update
      const member = workspace.members?.find(
        (m: { userId: string; role?: string }) => m.userId === userId
      )
      const isOwner = workspace.ownerId === userId
      const isAdmin = member?.role === 'admin'

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Forbidden - only owner or admin can update workspace', 403)
      }

      // Update workspace
      Object.assign(workspace, validation.data)
      await workspace.save()

      sendSuccess(res, workspace)
    } catch (error) {
      logger.error('Error updating workspace:', error)
      sendError(res, 'Internal server error')
    }
  },
  {
    summary: 'Update workspace',
    tags: ['Workspaces'],
    bodySchema: UpdateWorkspaceRequestSchema,
    responseSchema: ApiResponseSchema(WorkspaceSchema),
  }
)

export default router
