/**
 * POST /api/chat
 * Main chat endpoint with optional ESG extraction
 * Now supports multiple AI providers via @ezstart/ai-sdk
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router
} from '@ezstart/express-core'
import { UnifiedChat } from '@ezstart/ai-sdk'
import { validateEsgData } from '../../services/gemini.service.js'
import { Conversation } from '../../models/Conversation.js'
import {
  ChatRequestSchema,
  ChatResponseSchema,
  ESGPayloadSchema,
  ApiResponseSchema,
} from '@green-pulse/types'
import { getSystemPrompt } from '../../services/prompt.service.js'

export const sendMessageRegistry = new OpenAPIRegistry()
const router: any = Router()
export const sendMessageRouter = createRouterWithDoc(
  sendMessageRegistry,
  router,
  '/'
)

sendMessageRouter.post(
  '/',
  async (req, res) => {
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

      let { message, extract_esg, session_id, conversation_id, userId, providerId } = validation.data

      // Default to gemini-flash if not specified
      const selectedProvider = providerId || 'gemini-flash'

      // Auto-create conversation if not provided
      if (!conversation_id) {
        try {
          const newConversation = new Conversation({
            title: message.slice(0, 50) + (message.length > 50 ? '...' : ''), // First 50 chars as title
            messages: [],
            userId: userId || null, // null if anonymous, userID if authenticated
          })
          await newConversation.save()
          conversation_id = newConversation._id.toString()
          logger.info(
            `✅ Auto-created conversation: ${conversation_id} (userId: ${userId || 'anonymous'})`
          )
        } catch (createError) {
          logger.error('Failed to auto-create conversation:', createError)
          // Continue without conversation_id if creation fails
        }
      }

      // Load conversation history if conversation_id provided
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
          logger.error('Failed to load conversation history:', loadError)
          // Continue without history if load fails
        }
      }

      // Get system prompt from DB (with fallback)
      const promptType = extract_esg ? 'extraction' : 'general'
      const systemPrompt = await getSystemPrompt(promptType, 'all')

      // Chat using UnifiedChat from @ezstart/ai-sdk
      const aiResponse = await UnifiedChat.send(message, selectedProvider, {
        systemPrompt,
        history: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        extractJson: extract_esg,
      })

      const result = {
        response: aiResponse.text,
        extractedData: aiResponse.extractedData,
      }

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
          logger.error('Failed to save messages to conversation:', saveError)
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
      logger.error('Chat error:', error)

      // Detect specific error types for better user feedback
      let statusCode = 500
      let errorMessage = 'Failed to process chat message'

      if (error instanceof Error) {
        // Check if it's a 503 Service Unavailable (AI provider overload)
        if (error.message.includes('503') || error.message.includes('overloaded')) {
          statusCode = 503
          errorMessage = 'AI service temporarily overloaded. Please try again in a few moments.'
        }
        // Check if it's a quota/rate limit error
        else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          statusCode = 429
          errorMessage = 'AI service quota exceeded. Please try again later.'
        }
        // Check if it's an API key error
        else if (error.message.includes('API key') || error.message.includes('authentication')) {
          statusCode = 500
          errorMessage = 'AI service configuration error. Please contact support.'
        }
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Chat with AI assistant',
    tags: ['Chat'],
    bodySchema: ChatRequestSchema,
    responseSchema: ApiResponseSchema(ChatResponseSchema),
  }
)

export default router
