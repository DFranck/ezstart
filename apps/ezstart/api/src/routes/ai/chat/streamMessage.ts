/**
 * POST /api/ai/chat/stream
 * SSE streaming chat endpoint — token-by-token responses
 */

import { logger } from '@ezstart/logger/server'
import { Router } from '@ezstart/express-core'
import { z } from 'zod'
import { UnifiedChat } from '@ezstart/ai-sdk'
import { AIConversation } from '../../../models/AIConversation.js'
import { getSystemPrompt, getSystemPromptDoc } from '../../../services/ai-prompt.service.js'
import { getAppProviders } from '../../../services/app-provider.service.js'
import { isAppAuthorizedForProvider } from '../../../services/provider-access.service.js'
import { trackAIUsage } from '../../../services/ai-usage.service.js'

const StreamRequestSchema = z.object({
  message: z.string().min(1).max(10000).describe('User message'),
  appName: z.string().min(1).max(50).describe('Application name for scoping'),
  providerId: z.string().optional().describe('AI provider ID (default: gemini-flash)'),
  conversationId: z.string().optional().describe('Existing conversation ID'),
  locale: z.string().max(5).optional().describe('Response language locale (en, fr, vi, etc.)'),
})

const router: import('express').Router = Router()

router.post('/', async (req, res) => {
  const startTime = Date.now()

  try {
    const validation = StreamRequestSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: validation.error.errors,
      })
      return
    }

    const { message, appName, providerId, locale } = validation.data
    let { conversationId } = validation.data

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
          `[AI Stream] Auto-created conversation: ${conversationId} (app: ${appName}, userId: ${userId || 'anonymous'})`
        )
      } catch (createError) {
        logger.error('[AI Stream] Failed to auto-create conversation:', createError)
      }
    }

    // Load conversation history
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
        logger.error('[AI Stream] Failed to load conversation history:', loadError)
      }
    }

    // Build system prompt
    const promptDoc = await getSystemPromptDoc('general', appName)
    const baseSystemPrompt =
      promptDoc?.content || (await getSystemPrompt('general', 'all', appName))

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

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    // Resolve provider
    let usedProvider = 'unknown'
    let resolvedProviderId = providerId

    if (!resolvedProviderId) {
      const allAppProviders = await getAppProviders(appName)
      const appProviders = []
      for (const provider of allAppProviders) {
        const isAuthorized = await isAppAuthorizedForProvider(appName, provider.providerId)
        if (isAuthorized) appProviders.push(provider)
      }
      if (appProviders.length > 0) {
        resolvedProviderId = appProviders[0]!.providerId
      } else {
        res.write(`data: ${JSON.stringify({ error: 'No providers available for this app' })}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }
    } else {
      const isAuthorized = await isAppAuthorizedForProvider(appName, resolvedProviderId)
      if (!isAuthorized) {
        res.write(
          `data: ${JSON.stringify({ error: `Provider "${resolvedProviderId}" is not available for this app` })}\n\n`
        )
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }
    }

    usedProvider = resolvedProviderId

    // Send initial metadata event
    res.write(
      `data: ${JSON.stringify({ type: 'meta', provider: usedProvider, conversationId })}\n\n`
    )

    // Build send options with streaming callbacks
    const sendOptions = {
      systemPrompt,
      history: conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      ...(promptDoc?.config?.temperature !== undefined && {
        temperature: promptDoc.config.temperature,
      }),
      ...(promptDoc?.config?.maxTokens !== undefined && {
        maxTokens: promptDoc.config.maxTokens,
      }),
      streaming: {
        enabled: true,
        onChunk: (chunk: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
        },
      },
    }

    // Send message with streaming
    const aiResponse = await UnifiedChat.send(message, usedProvider, sendOptions)

    // Send done event
    res.write('data: [DONE]\n\n')
    res.end()

    // Save messages to conversation (after stream completes)
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
        logger.error('[AI Stream] Failed to save messages to conversation:', saveError)
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
    }).catch(() => {})
  } catch (error) {
    logger.error('[AI Stream] Stream error:', error)

    // If headers not sent yet, return JSON error
    if (!res.headersSent) {
      let statusCode = 500
      let errorMessage = 'Failed to process streaming chat message'

      if (error instanceof Error) {
        if (error.message.includes('503') || error.message.includes('overloaded')) {
          statusCode = 503
          errorMessage = 'AI service temporarily overloaded. Please try again in a few moments.'
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          statusCode = 429
          errorMessage = 'AI service quota exceeded. Please try again later.'
        }
      }

      res.status(statusCode).json({ success: false, error: errorMessage })
    } else {
      // Headers already sent (stream in progress), send error as SSE event
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to process streaming chat message'
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    }
  }
})

export const streamMessageRouter = router
export default router
