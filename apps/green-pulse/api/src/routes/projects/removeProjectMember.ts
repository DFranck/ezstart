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

export const removeProjectMemberRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(removeProjectMemberRegistry, router, '/projects')

// DELETE /api/projects/:id/members/:userId - Remove member
docRouter.delete('/:id/members/:userId', async (req, res) => {
  try {
    const Project = await getProjectModel()

    // @ts-expect-error - Mongoose type inference issue
    const project = await Project.findById(req.params.id)

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date().toISOString(),
      })
    }

    // Remove member
    project.members = project.members.filter((m: any) => m.userId !== req.params.userId)
    await project.save()

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error removing member:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to remove member',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Remove member from project',
  tags: ['Projects'],
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
