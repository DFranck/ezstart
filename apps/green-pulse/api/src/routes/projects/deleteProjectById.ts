import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
} from '@ezstart/express-core'
import {
  ProjectSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'
import { getFormInstanceModel } from '../../models/FormInstance.js'

export const deleteProjectByIdRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(deleteProjectByIdRegistry, router, '/projects')

// DELETE /api/projects/:id - Delete project
docRouter.delete('/:id', async (req, res) => {
  try {
    const Project = await getProjectModel()

    // @ts-expect-error - Mongoose type inference issue
    const project = await Project.findByIdAndDelete(req.params.id)

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date().toISOString(),
      })
    }

    // Also delete all form instances associated with this project
    const FormInstance = await getFormInstanceModel()
    await FormInstance.deleteMany({ projectId: req.params.id })

    res.json({
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error deleting project:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Delete project and all associated forms',
  tags: ['Projects'],
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
