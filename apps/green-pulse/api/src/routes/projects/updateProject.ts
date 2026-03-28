import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
} from '@ezstart/express-core'
import {
  ProjectSchema,
  UpdateProjectRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

export const updateProjectRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(updateProjectRegistry, router, '/projects')

// PUT /api/projects/:id - Update project
docRouter.put('/:id', async (req, res) => {
  try {
    const validation = UpdateProjectRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const Project = await getProjectModel()

    // @ts-expect-error - Mongoose type inference issue
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      validation.data,
      { new: true }
    )

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error updating project:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Update project',
  tags: ['Projects'],
  bodySchema: UpdateProjectRequestSchema,
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
