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

export const listProjectsRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(listProjectsRegistry, router, '/projects')

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

export default router
