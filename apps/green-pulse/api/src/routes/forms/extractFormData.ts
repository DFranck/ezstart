/**
 * POST /api/forms/extract
 * Extract form data from conversation using AI
 */

import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
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
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      // Use AI extraction service
      const { extractFormData } = await import('../../services/formExtractor.service.js')
      const result = await extractFormData(
        validation.data.formConfigId,
        validation.data.conversationHistory
      )

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error extracting form data:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to extract form data',
        timestamp: new Date().toISOString(),
      })
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
