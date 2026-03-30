/**
 * POST /api/esg/reports
 * Generate ESG report
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { z } from 'zod'

const generateReportSchema = z.object({
  project_id: z.string().min(1).describe('ESG project identifier'),
  standard: z.string().default('GHG-Protocol').describe('ESG reporting standard'),
})
import { esgService } from '../../services/esg.service.js'

export const generateReportRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const generateReportRouter = createRouterWithDoc(generateReportRegistry, router, '/reports')

generateReportRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = generateReportSchema.safeParse(req.body)
      if (!validation.success) {
        return sendError(res, 'project_id is required', 400)
      }

      const { project_id, standard } = validation.data
      const report = await esgService.generateReport(project_id, standard)

      sendSuccess(res, report)
    } catch (error) {
      logger.error('Report generation error:', error)
      sendError(res, 'Failed to generate report')
    }
  },
  {
    summary: 'Generate ESG report',
    tags: ['ESG'],
  }
)

export default router
