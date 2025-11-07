import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
} from '@ezstart/express-core'
import {
  ProjectSchema,
  CreateProjectRequestSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

export const createProjectRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(createProjectRegistry, router, '/projects')

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

export default router
