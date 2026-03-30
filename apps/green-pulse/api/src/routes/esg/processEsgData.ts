/**
 * POST /api/esg/process
 * Complete ESG workflow (project + data + report)
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

export const processEsgDataRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const processEsgDataRouter = createRouterWithDoc(processEsgDataRegistry, router, '/process')

processEsgDataRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = ESGPayloadSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid ESG payload format', validation.error.errors)
      }

      const result = await esgService.processESGData(validation.data)

      sendSuccess(res, {
        message: 'ESG data processing initiated',
        ...result,
      })
    } catch (error) {
      logger.error('ESG processing error:', error)
      sendError(res, 'Failed to process ESG data')
    }
  },
  {
    summary: 'Complete ESG workflow (project + data + report)',
    tags: ['ESG'],
    bodySchema: ESGPayloadSchema,
  }
)

export default router
