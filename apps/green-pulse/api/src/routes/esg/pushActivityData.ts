/**
 * POST /api/esg/activity-data
 * Push activity data to ESG system
 */

import { logger } from '@ezstart/logger/server'
import { Router, OpenAPIRegistry, createRouterWithDoc, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import { esgService } from '../../services/esg.service.js'
import { ESGPayloadSchema } from '@green-pulse/types'

export const pushActivityDataRegistry = new OpenAPIRegistry()
const router: any = Router()
export const pushActivityDataRouter = createRouterWithDoc(
  pushActivityDataRegistry,
  router,
  '/activity-data'
)

pushActivityDataRouter.post(
  '/',
  async (req, res) => {
    try {
      const { project_id, ...payload } = req.body

      if (!project_id) {
        return sendError(res, 'project_id is required', 400)
      }

      const validation = ESGPayloadSchema.safeParse(payload)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid ESG payload format', validation.error.errors)
      }

      const result = await esgService.pushActivityData(project_id, validation.data)

      sendSuccess(res, result)
    } catch (error) {
      logger.error('Activity data error:', error)
      sendError(res, 'Failed to push activity data')
    }
  },
  {
    summary: 'Push activity data to ESG system',
    tags: ['ESG'],
  }
)

export default router
