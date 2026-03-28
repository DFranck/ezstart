/**
 * POST /api/esg/activity-data
 * Push activity data to ESG system
 */

import { logger } from '@ezstart/logger/server'
import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
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
        return res.status(400).json({
          success: false,
          error: 'project_id is required',
          timestamp: new Date().toISOString(),
        })
      }

      const validation = ESGPayloadSchema.safeParse(payload)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ESG payload format',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const result = await esgService.pushActivityData(project_id, validation.data)

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Activity data error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to push activity data',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Push activity data to ESG system',
    tags: ['ESG'],
  }
)

export default router
