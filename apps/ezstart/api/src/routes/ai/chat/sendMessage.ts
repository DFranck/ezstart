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
import type { ProviderResponse } from '@ezstart/ai-sdk'
import { AIConversation } from '../../../models/AIConversation.js'
import { getSystemPrompt, getSystemPromptDoc } from '../../../services/ai-prompt.service.js'
import { getAppProviders } from '../../../services/app-provider.service.js'
import { isAppAuthorizedForProvider } from '../../../services/provider-access.service.js'
import { trackAIUsage } from '../../../services/ai-usage.service.js'

const ImageInputSchema = z.object({
  data: z.string().min(1).describe('Base64-encoded image data (without data URL prefix)'),
  mimeType: z
    .string()
    .regex(/^image\/(jpeg|png|gif|webp)$/)
    .describe('Image MIME type'),
})

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000).describe('User message'),
  appName: z.string().min(1).max(50).describe('Application name for scoping'),
  providerId: z.string().optional().describe('AI provider ID (default: gemini-flash)'),
  conversationId: z.string().optional().describe('Existing conversation ID'),
  locale: z.string().max(5).optional().describe('Response language locale (en, fr, vi, etc.)'),
  images: z.array(ImageInputSchema).max(10).optional().describe('Images for vision models'),
})

export const sendMessageRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const sendMessageRouter = createRouterWithDoc(sendMessageRegistry, router, '/')

sendMessageRouter.post(
  '/',
  async (req, res) => {
    const startTime = Date.now()
    try {
      const validation = ChatRequestSchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request format', validation.error.errors)
      }

      const { message, appName, providerId, locale, images } = validation.data
      let { conversationId } = validation.data

      // userId comes from auth middleware (JWT), not from request body
      const userId = req.userId

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
          const conversation = await AIConversation.findById(conversationId).lean().exec()
          if (conversation && conversation.messages) {
            conversationHistory = conversation.messages.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
            }))
          }
        } catch (loadError) {
          logger.error('[AI Chat] Failed to load conversation history:', loadError)
        }
      }

      // Get full prompt doc from DB (single query) with fallback
      const promptDoc = await getSystemPromptDoc('general', appName)
      const baseSystemPrompt =
        promptDoc?.content || (await getSystemPrompt('general', 'all', appName))

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

      // Build shared send options
      const sendOptions = {
        systemPrompt,
        history: conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        // Apply prompt-level config overrides if available
        ...(promptDoc?.config?.temperature !== undefined && {
          temperature: promptDoc.config.temperature,
        }),
        ...(promptDoc?.config?.maxTokens !== undefined && {
          maxTokens: promptDoc.config.maxTokens,
        }),
        // Pass images for vision support
        ...(images && images.length > 0 && { images }),
      }

      // Resolve provider: explicit choice → cascade through app providers
      let aiResponse: ProviderResponse = { text: '' }
      let usedProvider = 'unknown'

      if (providerId) {
        // Client explicitly chose a provider — check global authorization first
        const isAuthorized = await isAppAuthorizedForProvider(appName, providerId)
        if (!isAuthorized) {
          return sendError(res, `Provider "${providerId}" is not available for this app`, 403)
        }
        aiResponse = await UnifiedChat.send(message, providerId, sendOptions)
        usedProvider = providerId
      } else {
        // Cascade through app's enabled providers in priority order
        const allAppProviders = await getAppProviders(appName)

        // Filter out providers not authorized via GlobalProviderAccess
        const appProviders = []
        for (const provider of allAppProviders) {
          const isAuthorized = await isAppAuthorizedForProvider(appName, provider.providerId)
          if (isAuthorized) appProviders.push(provider)
        }
        let lastError: Error | null = null
        let resolved = false

        for (const provider of appProviders) {
          try {
            const providerOptions = {
              ...sendOptions,
              // Provider-level config overrides (prompt config takes precedence if set)
              ...(provider.config?.temperature !== undefined &&
                promptDoc?.config?.temperature === undefined && {
                  temperature: provider.config.temperature,
                }),
              ...(provider.config?.maxTokens !== undefined &&
                promptDoc?.config?.maxTokens === undefined && {
                  maxTokens: provider.config.maxTokens,
                }),
            }
            aiResponse = await UnifiedChat.send(message, provider.providerId, providerOptions)
            usedProvider = provider.providerId
            resolved = true
            break
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            logger.warn(`[AI Chat] Provider ${provider.providerId} failed, trying next...`, {
              error: lastError.message,
            })
          }
        }

        if (!resolved) {
          throw lastError || new Error('All AI providers failed')
        }
      }

      // Save messages to conversation if conversationId provided
      if (conversationId) {
        try {
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

      // Track usage (fire-and-forget)
      const endTime = Date.now()
      trackAIUsage({
        appName,
        providerId: usedProvider,
        userId: userId || undefined,
        conversationId: conversationId || undefined,
        tokensUsed: aiResponse.tokensUsed,
        responseTime: endTime - startTime,
        success: true,
      }).catch(() => {}) // silent

      sendSuccess(res, {
        response: aiResponse.text,
        conversationId,
        provider: usedProvider,
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
        } else if (error.message.includes('does not exist') || error.message.includes('model')) {
          statusCode = 400
          errorMessage = 'AI model not available. Provider configuration may need updating.'
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
