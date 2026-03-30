/**
 * Chat V2 - Using @ezstart/ai-sdk
 *
 * Demonstrates reusable AI SDK integration
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { chatWithLIA, validateEsgData } from '../services/lia.service.js'
import { Conversation } from '../models/Conversation.js'
import { ChatRequestSchema, ChatResponseSchema, ApiResponseSchema } from '@green-pulse/types'

export const chatV2Registry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(chatV2Registry, router, '/chat-v2')

// POST /api/chat-v2 - Chat using @ezstart/ai-sdk
docRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = ChatRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request format', validation.error.errors, 400)
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
          logger.info(
            `✅ [Chat V2] Auto-created conversation: ${conversation_id} (userId: ${userId || 'anonymous'})`
          )
        } catch (createError) {
          logger.error('[Chat V2] Failed to auto-create conversation:', createError)
        }
      }

      // Load conversation history
      let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
      if (conversation_id) {
        try {
          // @ts-expect-error - Mongoose findById type inference issue
          const conversation = await Conversation.findById(conversation_id).lean().exec()
          if (conversation && conversation.messages) {
            conversationHistory = conversation.messages.map(
              (msg: { role: string; content: string }) => ({
                role: msg.role,
                content: msg.content,
              })
            )
          }
        } catch (loadError) {
          logger.error('[Chat V2] Failed to load conversation history:', loadError)
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
      let validationResult: Record<string, unknown> | null = null
      if (result.extractedData) {
        validationResult = await validateEsgData(result.extractedData)
      }

      sendSuccess(res, {
        response: result.response,
        extracted_data: result.extractedData,
        validation: validationResult,
        session_id: session_id || `session_${Date.now()}`,
        conversation_id,
        suggestions: result.extractedData
          ? ['Review extracted data', 'Submit to ESG system', 'Add more details']
          : [
              'Tell me about your energy usage',
              'Upload a utility bill',
              'Take a photo of your meter',
            ],
      })
    } catch (error) {
      logger.error('[Chat V2] Error:', error)
      sendError(res, 'Failed to process chat message')
    }
  },
  {
    summary: 'Chat with AI assistant (v2 - using @ezstart/ai-sdk)',
    tags: ['Chat'],
    bodySchema: ChatRequestSchema,
    responseSchema: ApiResponseSchema(ChatResponseSchema),
  }
)

export default router
