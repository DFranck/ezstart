/**
 * POST /api/chat
 * Main chat endpoint with optional ESG extraction
 * Now supports multiple AI providers via @ezstart/ai-sdk
 */

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

      // Default to gemini-pro if not specified
      const selectedProvider = providerId || 'gemini-pro'

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
          console.log(
            `✅ Auto-created conversation: ${conversation_id} (userId: ${userId || 'anonymous'})`
          )
        } catch (createError) {
          console.error('Failed to auto-create conversation:', createError)
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
          console.error('Failed to load conversation history:', loadError)
          // Continue without history if load fails
        }
      }

      // System prompt for ESG context
      const systemPrompt = extract_esg
        ? `You are a structured extractor. From the conversation text, output ONLY valid JSON conforming to the ESG schema (company, sites, period, scopes, targets, evidence). Do not include explanations. Fill missing values with null and list them in _missing.`
        : `You are GreenPulse.AI, an ESG advisor for SMEs in Southeast Asia. Speak clearly and practically. When the user shares data, confirm assumptions, surface missing fields, and prepare normalized JSON for ESG reporting.`

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
  },
  {
    summary: 'Chat with AI assistant',
    tags: ['Chat'],
    bodySchema: ChatRequestSchema,
    responseSchema: ApiResponseSchema(ChatResponseSchema),
  }
)

export default router
