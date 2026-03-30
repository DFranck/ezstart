import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { ProjectSchema, ApiResponseSchema } from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'
import { getFormInstanceModel } from '../../models/FormInstance.js'

export const deleteProjectByIdRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(deleteProjectByIdRegistry, router, '/projects')

// DELETE /api/projects/:id - Delete project
docRouter.delete(
  '/:id',
  async (req, res) => {
    try {
      const Project = await getProjectModel()

      // @ts-expect-error - Mongoose type inference issue
      const project = await Project.findByIdAndDelete(req.params.id)

      if (!project) {
        return sendError(res, 'Project not found', 404)
      }

      // Also delete all form instances associated with this project
      const FormInstance = await getFormInstanceModel()
      await FormInstance.deleteMany({ projectId: req.params.id })

      sendSuccess(res, { deleted: true })
    } catch (error) {
      logger.error('Error deleting project:', error)
      sendError(res, 'Failed to delete project')
    }
  },
  {
    summary: 'Delete project and all associated forms',
    tags: ['Projects'],
    responseSchema: ApiResponseSchema(ProjectSchema),
  }
)

export default router
