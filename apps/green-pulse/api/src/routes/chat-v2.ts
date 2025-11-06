/**
 * Chat V2 - Using @ezstart/ai-sdk
 *
 * Demonstrates reusable AI SDK integration
 */

import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router
} from '@ezstart/express-core'
import { chatWithLIA, validateEsgData } from '../services/lia.service.js'
import { Conversation } from '../models/Conversation.js'
import {
  ChatRequestSchema,
  ChatResponseSchema,
  ApiResponseSchema,
} from '@green-pulse/types'

export const chatV2Registry = new OpenAPIRegistry()

const router: any = Router()
const docRouter = createRouterWithDoc(chatV2Registry, router, '/chat-v2')

// POST /api/chat-v2 - Chat using @ezstart/ai-sdk
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

    let { message, extract_esg, session_id, conversation_id, userId } = validation.data

    // Auto-create conversation if not provided
    if (!conversation_id) {
      try {
        const newConversation = new Conversation({
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          messages: [],
          userId: userId || null,
        })
        await newConversation.save()
        conversation_id = newConversation._id.toString()
        console.log(
          `✅ [Chat V2] Auto-created conversation: ${conversation_id} (userId: ${userId || 'anonymous'})`
        )
      } catch (createError) {
        console.error('[Chat V2] Failed to auto-create conversation:', createError)
      }
    }

    // Load conversation history
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (conversation_id) {
      try {
        // @ts-expect-error - Mongoose findById type inference issue
        const conversation = await Conversation.findById(conversation_id).lean().exec()
        if (conversation && conversation.messages) {
          conversationHistory = conversation.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          }))
        }
      } catch (loadError) {
        console.error('[Chat V2] Failed to load conversation history:', loadError)
      }
    }

    // Chat using @ezstart/ai-sdk
    const result = await chatWithLIA(message, {
      extractEsg: extract_esg,
      conversationId: conversation_id,
      userId,
      history: conversationHistory,
    })

    // Validate extracted data if present
    let validationResult: any = null
    if (result.extractedData) {
      validationResult = await validateEsgData(result.extractedData)
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
      sdk_version: '@ezstart/ai-sdk@1.0.0', // Indicates using new SDK
    })
  } catch (error) {
    console.error('[Chat V2] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      timestamp: new Date().toISOString(),
    })
  }
}, {
  summary: 'Chat with AI assistant (v2 - using @ezstart/ai-sdk)',
  tags: ['Chat'],
  bodySchema: ChatRequestSchema,
  responseSchema: ApiResponseSchema(ChatResponseSchema),
})

export default router
