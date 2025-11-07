/**
 * POST /api/esg/process
 * Complete ESG workflow (project + data + report)
 */

import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
import { esgService } from '../../services/esg.service.js'
import { ESGPayloadSchema } from '@green-pulse/types'

export const processEsgDataRegistry = new OpenAPIRegistry()
const router: any = Router()
export const processEsgDataRouter = createRouterWithDoc(
  processEsgDataRegistry,
  router,
  '/process'
)

processEsgDataRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = ESGPayloadSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ESG payload format',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const result = await esgService.processESGData(validation.data)

      res.json({
        success: true,
        data: {
          message: 'ESG data processing initiated',
          ...result,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('ESG processing error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process ESG data',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Complete ESG workflow (project + data + report)',
    tags: ['ESG'],
    bodySchema: ESGPayloadSchema,
  }
)

export default router
