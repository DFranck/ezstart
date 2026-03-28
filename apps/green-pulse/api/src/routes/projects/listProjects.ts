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

export const listProjectsRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(listProjectsRegistry, router, '/projects')

// GET /api/projects - List user's projects
docRouter.get(
  '/',
  async (req, res) => {
    try {
      const { userId, status } = req.query

      if (!userId) {
        return sendError(res, 'userId is required', 400)
      }

      const Project = await getProjectModel()

      const { limit = 20, offset = 0 } = req.query

      const query: any = {
        $or: [{ ownerId: userId }, { 'members.userId': userId }],
      }

      if (status) {
        query.status = status
      }

      const [projects, total] = await Promise.all([
        (Project.find as any)(query)
          .sort({ updatedAt: -1 })
          .skip(Number(offset))
          .limit(Number(limit))
          .lean(),
        Project.countDocuments(query),
      ])

      sendSuccess(res, projects, { total, limit: Number(limit), offset: Number(offset) })
    } catch (error) {
      logger.error('Error fetching projects:', error)
      sendError(res, 'Failed to fetch projects')
    }
  },
  {
    summary: 'List user projects (owned or shared)',
    tags: ['Projects'],
    responseSchema: ApiResponseSchema(ProjectSchema.array()),
  }
)

export default router
