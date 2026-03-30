/**
 * GET /api/esg/reports/:jobId/status
 * Get report generation status
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { esgService } from '../../services/esg.service.js'

export const getReportStatusRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const getReportStatusRouter = createRouterWithDoc(
  getReportStatusRegistry,
  router,
  '/reports/:jobId/status'
)

getReportStatusRouter.get(
  '/',
  async (req, res) => {
    try {
      const { jobId } = req.params

      if (!jobId) {
        return sendError(res, 'jobId is required', 400)
      }

      const status = await esgService.getReportStatus(jobId)

      sendSuccess(res, status)
    } catch (error) {
      logger.error('Report status error:', error)
      sendError(res, 'Failed to get report status')
    }
  },
  {
    summary: 'Get report generation status',
    tags: ['ESG'],
  }
)

export default router
