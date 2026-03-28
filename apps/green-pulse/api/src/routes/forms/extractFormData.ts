/**
 * POST /api/forms/extract
 * Extract form data from conversation using AI
 */

import { logger } from '@ezstart/logger/server'
import { Router, createRouterWithDoc, OpenAPIRegistry, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import {
  ExtractFormDataRequestSchema,
  ExtractFormDataResponseSchema,
  ApiResponseSchema,
} from '@green-pulse/types'

export const extractFormDataRegistry = new OpenAPIRegistry()
const router: any = Router()
export const extractFormDataRouter = createRouterWithDoc(
  extractFormDataRegistry,
  router,
  '/extract'
)

extractFormDataRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = ExtractFormDataRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request', validation.error.errors)
      }

      // Use AI extraction service
      const { extractFormData } = await import('../../services/formExtractor.service.js')
      const result = await extractFormData(
        validation.data.formConfigId,
        validation.data.conversationHistory
      )

      sendSuccess(res, result)
    } catch (error) {
      logger.error('Error extracting form data:', error)
      sendError(res, 'Failed to extract form data')
    }
  },
  {
    summary: 'Extract form data from conversation using AI',
    tags: ['Forms', 'AI'],
    bodySchema: ExtractFormDataRequestSchema,
    responseSchema: ApiResponseSchema(ExtractFormDataResponseSchema),
  }
)

export default router
