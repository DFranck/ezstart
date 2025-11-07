import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
} from '@ezstart/express-core'
import {
  ProjectSchema,
  UpdateProjectMemberRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

export const updateProjectMemberRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(updateProjectMemberRegistry, router, '/projects')

// PUT /api/projects/:id/members/:userId - Update member role
docRouter.put('/:id/members/:userId', async (req, res) => {
  try {
    const validation = UpdateProjectMemberRequestSchema.safeParse(req.body)
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
    const project = await Project.findById(req.params.id)

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date().toISOString(),
      })
    }

    // Find and update member
    const member = project.members.find((m: any) => m.userId === req.params.userId)
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
        timestamp: new Date().toISOString(),
      })
    }

    member.role = validation.data.role
    await project.save()

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating member role:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update member role',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Update member role',
  tags: ['Projects'],
  bodySchema: UpdateProjectMemberRequestSchema,
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
