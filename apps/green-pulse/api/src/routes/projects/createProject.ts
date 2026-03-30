import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { ProjectSchema, CreateProjectRequestSchema, ApiResponseSchema } from '@green-pulse/types'
import { getProjectModel } from '../../models/Project.js'

export const createProjectRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(createProjectRegistry, router, '/projects')

// POST /api/projects - Create new project
docRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = CreateProjectRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors)
      }

      const { userId } = req.query
      if (!userId) {
        return sendError(res, 'userId is required', 400)
      }

      const Project = await getProjectModel()

      const newProject = new Project({
        ...validation.data,
        ownerId: userId,
        status: 'active',
        members: [],
      })
      await newProject.save()

      sendSuccess(res.status(201), newProject)
    } catch (error) {
      logger.error('Error creating project:', error)
      sendError(res, 'Failed to create project')
    }
  },
  {
    summary: 'Create new project',
    tags: ['Projects'],
    bodySchema: CreateProjectRequestSchema,
    responseSchema: ApiResponseSchema(ProjectSchema),
  }
)

export default router
