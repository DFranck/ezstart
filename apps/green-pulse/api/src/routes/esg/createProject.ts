/**
 * POST /api/esg/projects
 * Create or update ESG project
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { esgService } from '../../services/esg.service.js'
import { ESGPayloadSchema } from '@green-pulse/types'

export const createProjectRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const createProjectRouter = createRouterWithDoc(createProjectRegistry, router, '/projects')

createProjectRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = ESGPayloadSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid ESG payload format', validation.error.errors)
      }

      const project = await esgService.createProject(validation.data)

      sendSuccess(res, project)
    } catch (error) {
      logger.error('Project creation error:', error)
      sendError(res, 'Failed to create ESG project')
    }
  },
  {
    summary: 'Create or update ESG project',
    tags: ['ESG'],
    bodySchema: ESGPayloadSchema,
  }
)

export default router
