import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router
} from '@ezstart/express-core'
import { chatWithExtraction, extractEsgPayload, validateEsgData } from '../services/gemini.service.js'
import { Conversation } from '../models/Conversation.js'
import {
  ChatRequestSchema,
  ChatResponseSchema,
  TextExtractionRequestSchema,
  ESGPayloadSchema,
  ApiResponseSchema,
  ErrorResponseSchema
} from '@green-pulse/types'

export const chatRegistry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(chatRegistry, router, '/chat')

// POST /api/chat - Main chat endpoint with optional ESG extraction
docRouter.post('/', async (req, res) => {
  try {
    const validation = ChatRequestSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: validation.error.errors,
        timestamp: new Date().toISOString(),
      })
    }

    const { message, extract_esg, session_id, conversation_id } = validation.data

    // Chat with optional ESG extraction
    const result = await chatWithExtraction(message, extract_esg)

    // If ESG extraction was successful, validate the data
    let validationResult: any = null
    if (result.extractedData) {
      const esgValidation = ESGPayloadSchema.safeParse(result.extractedData)
      if (esgValidation.success) {
        validationResult = await validateEsgData(esgValidation.data)
      } else {
        validationResult = { ok: false, errors: ['Invalid ESG data format'] }
      }
    }

    // Save messages to conversation if conversation_id provided
    if (conversation_id) {
      try {
        // @ts-expect-error - Mongoose findByIdAndUpdate type inference issue
        await Conversation.findByIdAndUpdate(conversation_id, {
          $push: {
            messages: [
              {
                role: 'user',
                content: message,
                timestamp: new Date(),
              },
              {
                role: 'assistant',
                content: result.response,
                timestamp: new Date(),
                metadata: result.extractedData ? { extractedData: result.extractedData } : undefined,
              },
            ],
          },
        })
      } catch (saveError) {
        console.error('Failed to save messages to conversation:', saveError)
        // Don't fail the request, just log the error
      }
    }

    res.json({
      success: true,
      data: {
        response: result.response,
        extracted_data: result.extractedData,
        validation: validationResult,
        session_id: session_id || `session_${Date.now()}`,
        conversation_id,
        suggestions: result.extractedData
          ? ['Review extracted data', 'Submit to ESG system', 'Add more details']
          : ['Tell me about your energy usage', 'Upload a utility bill', 'Take a photo of your meter']
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Chat with AI assistant',
  tags: ['Chat'],
  bodySchema: ChatRequestSchema,
  responseSchema: ApiResponseSchema(ChatResponseSchema),
})

// POST /api/chat/extract - Direct ESG extraction from text
docRouter.post('/extract', async (req, res) => {
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
}, {
  summary: 'Extract ESG data from text',
  tags: ['Chat', 'ESG'],
  bodySchema: TextExtractionRequestSchema,
  responseSchema: ApiResponseSchema(ESGPayloadSchema),
})

export default router