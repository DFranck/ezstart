/**
 * POST /api/chat/extract
 * Direct ESG extraction from text
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { extractEsgPayload, validateEsgData } from '../../services/gemini.service.js'
import {
  TextExtractionRequestSchema,
  ESGPayloadSchema,
  ApiResponseSchema,
} from '@green-pulse/types'

export const extractEsgDataRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const extractEsgDataRouter = createRouterWithDoc(extractEsgDataRegistry, router, '/extract')

extractEsgDataRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = TextExtractionRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request format', validation.error.errors)
      }

      const { text } = validation.data
      const extractedData = await extractEsgPayload(text)
      const validationResult = await validateEsgData(extractedData)

      sendSuccess(res, {
        extracted_data: extractedData,
        validation: validationResult,
      })
    } catch (error) {
      logger.error('Extraction error:', error)
      sendError(res, 'Failed to extract ESG data')
    }
  },
  {
    summary: 'Extract ESG data from text',
    tags: ['Chat', 'ESG'],
    bodySchema: TextExtractionRequestSchema,
    responseSchema: ApiResponseSchema(ESGPayloadSchema),
  }
)

export default router
