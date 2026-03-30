import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { z } from 'zod'
import { ProjectSchema, ApiResponseSchema } from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

const listProjectsQuerySchema = z.object({
  userId: z.string().optional().describe('User ID (auto-filled from auth)'),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
})

export const listProjectsRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(listProjectsRegistry, router, '/projects')

// GET /api/projects - List user's projects
docRouter.get(
  '/',
  async (req, res) => {
    try {
      const validation = listProjectsQuerySchema.safeParse(req.query)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid query parameters', validation.error.errors)
      }

      const { userId: queryUserId, status, limit, offset } = validation.data
      const userId = queryUserId || req.userId
      if (!userId) {
        return sendError(res, 'userId is required (via query or authentication)', 401)
      }

      const Project = await getProjectModel()

      const query: Record<string, unknown> = {
        $or: [{ ownerId: userId }, { 'members.userId': userId }],
      }

      if (status) {
        query.status = status
      }

      const [projects, total] = await Promise.all([
        // @ts-expect-error - Mongoose type inference issue with dynamic query
        Project.find(query).sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
        Project.countDocuments(query),
      ])

      sendSuccess(res, projects, { total, limit, offset })
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
