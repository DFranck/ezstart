/**
 * POST /api/esg/reports
 * Generate ESG report
 */

import { logger } from '@ezstart/logger/server'
import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
import { esgService } from '../../services/esg.service.js'

export const generateReportRegistry = new OpenAPIRegistry()
const router: any = Router()
export const generateReportRouter = createRouterWithDoc(
  generateReportRegistry,
  router,
  '/reports'
)

generateReportRouter.post(
  '/',
  async (req, res) => {
    try {
      const { project_id, standard = 'GHG-Protocol' } = req.body

      if (!project_id) {
        return res.status(400).json({
          success: false,
          error: 'project_id is required',
          timestamp: new Date().toISOString(),
        })
      }

      const report = await esgService.generateReport(project_id, standard)

      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Report generation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Generate ESG report',
    tags: ['ESG'],
  }
)

export default router
