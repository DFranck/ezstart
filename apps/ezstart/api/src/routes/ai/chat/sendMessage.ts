/**
 * POST /api/ai/chat
 * Agnostic chat endpoint — scoped by appName
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
import { z } from 'zod'
import { UnifiedChat } from '@ezstart/ai-sdk'
import { AIConversation } from '../../../models/AIConversation.js'
import { getSystemPrompt } from '../../../services/ai-prompt.service.js'

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000).describe('User message'),
  appName: z.string().min(1).max(50).describe('Application name for scoping'),
  providerId: z.string().optional().describe('AI provider ID (default: gemini-flash)'),
  conversationId: z.string().optional().describe('Existing conversation ID'),
  userId: z.string().optional().describe('User ID for conversation ownership'),
  locale: z.string().max(5).optional().describe('Response language locale (en, fr, vi, etc.)'),
})

export const sendMessageRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const sendMessageRouter = createRouterWithDoc(sendMessageRegistry, router, '/')

sendMessageRouter.post(
  '/',
  async (req, res) => {
    try {
      const validation = ChatRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request format', validation.error.errors)
      }

      let { message, appName, conversationId, userId, providerId, locale } = validation.data

      // Default to gemini-flash if not specified
      const selectedProvider = providerId || 'gemini-flash'

      // Auto-create conversation if not provided
      if (!conversationId) {
        try {
          const newConversation = new AIConversation({
            appName,
            title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
            messages: [],
            userId: userId || null,
          })
          await newConversation.save()
          conversationId = newConversation._id.toString()
          logger.info(
            `[AI Chat] Auto-created conversation: ${conversationId} (app: ${appName}, userId: ${userId || 'anonymous'})`
          )
        } catch (createError) {
          logger.error('[AI Chat] Failed to auto-create conversation:', createError)
        }
      }

      // Load conversation history if conversationId provided
      let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
      if (conversationId) {
        try {
          // @ts-expect-error - Mongoose findById type inference issue
          const conversation = await AIConversation.findById(conversationId).lean().exec()
          if (conversation && conversation.messages) {
            conversationHistory = conversation.messages.map(
              (msg: { role: string; content: string }) => ({
                role: msg.role,
                content: msg.content,
              })
            )
          }
        } catch (loadError) {
          logger.error('[AI Chat] Failed to load conversation history:', loadError)
        }
      }

      // Get system prompt from DB (with fallback)
      const baseSystemPrompt = await getSystemPrompt('general', 'all', appName)

      // Add locale instruction to system prompt
      const localeMap: Record<string, string> = {
        en: 'English',
        fr: 'French',
        vi: 'Vietnamese',
        es: 'Spanish',
        de: 'German',
        ja: 'Japanese',
        zh: 'Chinese',
      }
      const langInstruction =
        locale && localeMap[locale] ? `\n\nIMPORTANT: Always respond in ${localeMap[locale]}.` : ''
      const systemPrompt = baseSystemPrompt + langInstruction

      // Chat using UnifiedChat from @ezstart/ai-sdk
      const aiResponse = await UnifiedChat.send(message, selectedProvider, {
        systemPrompt,
        history: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      })

      // Save messages to conversation if conversationId provided
      if (conversationId) {
        try {
          // @ts-expect-error - Mongoose findByIdAndUpdate type inference issue
          await AIConversation.findByIdAndUpdate(conversationId, {
            $push: {
              messages: [
                {
                  role: 'user',
                  content: message,
                  timestamp: new Date(),
                },
                {
                  role: 'assistant',
                  content: aiResponse.text,
                  timestamp: new Date(),
                },
              ],
            },
          })
        } catch (saveError) {
          logger.error('[AI Chat] Failed to save messages to conversation:', saveError)
        }
      }

      sendSuccess(res, {
        response: aiResponse.text,
        conversationId,
        suggestions: [],
      })
    } catch (error) {
      logger.error('[AI Chat] Chat error:', error)

      let statusCode = 500
      let errorMessage = 'Failed to process chat message'

      if (error instanceof Error) {
        if (error.message.includes('503') || error.message.includes('overloaded')) {
          statusCode = 503
          errorMessage = 'AI service temporarily overloaded. Please try again in a few moments.'
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          statusCode = 429
          errorMessage = 'AI service quota exceeded. Please try again later.'
        } else if (error.message.includes('API key') || error.message.includes('authentication')) {
          statusCode = 500
          errorMessage = 'AI service configuration error. Please contact support.'
        }
      }

      sendError(res, errorMessage, statusCode)
    }
  },
  {
    summary: 'Chat with AI assistant (scoped by appName)',
    tags: ['AI Chat'],
    bodySchema: ChatRequestSchema,
  }
)

export default router
