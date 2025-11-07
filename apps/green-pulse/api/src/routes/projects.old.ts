import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
} from '@ezstart/express-core'
import {
  ProjectSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  AddProjectMemberRequestSchema,
  UpdateProjectMemberRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getProjectModel } from '../models/Project.js'
import { getFormInstanceModel } from '../models/FormInstance.js'

export const projectRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(projectRegistry, router, '/projects')

// ==================== PROJECTS CRUD ====================

// GET /api/projects - List user's projects
docRouter.get('/', async (req, res) => {
  try {
    const { userId, status } = req.query

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
        timestamp: new Date().toISOString(),
      })
    }

    const Project = await getProjectModel()

    const query: any = {
      $or: [
        { ownerId: userId },
        { 'members.userId': userId },
      ],
    }

    if (status) {
      query.status = status
    }

    // @ts-expect-error - Mongoose type inference issue
    const projects = await Project.find(query).sort({ updatedAt: -1 }).lean()

    res.json({
      success: true,
      data: projects,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'List user projects (owned or shared)',
  tags: ['Projects'],
  responseSchema: ApiResponseSchema(ProjectSchema.array()),
})

// GET /api/projects/:id - Get project by ID
docRouter.get('/:id', async (req, res) => {
  try {
    const Project = await getProjectModel()

    // @ts-expect-error - Mongoose type inference issue
    const project = await Project.findById(req.params.id).lean()

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date().toISOString(),
      })
    }

    // TODO: Check if user has access to this project
    // const { userId } = req.query
    // const hasAccess = project.ownerId === userId || project.members.some(m => m.userId === userId)
    // if (!hasAccess) return 403

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Get project by ID',
  tags: ['Projects'],
  responseSchema: ApiResponseSchema(ProjectSchema),
})

// POST /api/projects - Create new project
docRouter.post('/', async (req, res) => {
  try {
    const validation = CreateProjectRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const { userId } = req.query
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
        timestamp: new Date().toISOString(),
      })
    }

    const Project = await getProjectModel()

    const newProject = new Project({
      ...validation.data,
      ownerId: userId,
      status: 'active',
      members: [],
    })
    await newProject.save()

    res.status(201).json({
      success: true,
      data: newProject,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Create new project',
  tags: ['Projects'],
  bodySchema: CreateProjectRequestSchema,
  responseSchema: ApiResponseSchema(ProjectSchema),
})

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
    console.error('Error updating project:', error)
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
    console.error('Error deleting project:', error)
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

// ==================== PROJECT MEMBERS ====================

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
    console.error('Error removing member:', error)
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

// ==================== PROJECT FORMS ====================

// GET /api/projects/:id/forms - Get all form instances for project
docRouter.get('/:id/forms', async (req, res) => {
  try {
    const FormInstance = await getFormInstanceModel()

    // @ts-expect-error - Mongoose type inference issue
    const forms = await FormInstance.find({ projectId: req.params.id }).sort({ createdAt: -1 }).lean()

    res.json({
      success: true,
      data: forms,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching project forms:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project forms',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Get all form instances for a project',
  tags: ['Projects'],
  responseSchema: ApiResponseSchema(ProjectSchema),
})

export default router
