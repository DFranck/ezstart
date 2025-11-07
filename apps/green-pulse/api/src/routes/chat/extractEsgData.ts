/**
 * POST /api/chat/extract
 * Direct ESG extraction from text
 */

import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router
} from '@ezstart/express-core'
import { extractEsgPayload, validateEsgData } from '../../services/gemini.service.js'
import {
  TextExtractionRequestSchema,
  ESGPayloadSchema,
  ApiResponseSchema,
} from '@green-pulse/types'

export const extractEsgDataRegistry = new OpenAPIRegistry()
const router: any = Router()
export const extractEsgDataRouter = createRouterWithDoc(
  extractEsgDataRegistry,
  router,
  '/extract'
)

extractEsgDataRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = TextExtractionRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request format',
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        })
      }

      const { text } = validation.data
      const extractedData = await extractEsgPayload(text)
      const validationResult = await validateEsgData(extractedData)

      res.json({
        success: true,
        data: {
          extracted_data: extractedData,
          validation: validationResult,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Extraction error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to extract ESG data',
        timestamp: new Date().toISOString(),
      })
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
