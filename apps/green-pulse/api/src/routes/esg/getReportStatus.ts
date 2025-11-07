/**
 * GET /api/esg/reports/:jobId/status
 * Get report generation status
 */

import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
import { esgService } from '../../services/esg.service.js'

export const getReportStatusRegistry = new OpenAPIRegistry()
const router: any = Router()
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
        return res.status(400).json({
          success: false,
          error: 'jobId is required',
          timestamp: new Date().toISOString(),
        })
      }

      const status = await esgService.getReportStatus(jobId)

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Report status error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get report status',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Get report generation status',
    tags: ['ESG'],
  }
)

export default router
