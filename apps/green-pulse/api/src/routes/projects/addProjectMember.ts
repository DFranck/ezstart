import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
} from '@ezstart/express-core'
import {
  ProjectSchema,
  AddProjectMemberRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

export const addProjectMemberRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(addProjectMemberRegistry, router, '/projects')

// POST /api/projects/:id/members - Add member to project
docRouter.post('/:id/members', async (req, res) => {
  try {
    const validation = AddProjectMemberRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const { ownerId } = req.query // User making the request
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

    // Check if requester is owner
    if (project.ownerId !== ownerId) {
      return res.status(403).json({
        success: false,
        error: 'Only project owner can add members',
        timestamp: new Date().toISOString(),
      })
    }

    // Check if user already member
    if (project.members.some((m: any) => m.userId === validation.data.userId)) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member',
        timestamp: new Date().toISOString(),
      })
    }

    // Add member
    project.members.push({
      userId: validation.data.userId,
      role: validation.data.role,
      addedAt: new Date(),
      addedBy: ownerId as string,
    })

    await project.save()

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error adding project member:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add member',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Add member to project (owner only)',
  tags: ['Projects'],
  bodySchema: AddProjectMemberRequestSchema,
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
