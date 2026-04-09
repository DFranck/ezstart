/**
 * AI Providers Configuration for EZStart
 *
 * Registers available AI providers from @ezstart/ai-sdk
 */

import { logger } from '@ezstart/logger/server'
import { providerRegistry } from '@ezstart/ai-sdk'

/**
 * Initialize AI providers
 * Called at app startup
 */
export function initializeAIProviders() {
  logger.info('[AI SDK] Initializing providers...')

  // Register Gemini (primary)
  if (process.env.GEMINI_API_KEY) {
    providerRegistry.register({
      id: 'gemini-flash',
      name: 'Gemini 2.5 Flash',
      type: 'gemini',
      enabled: true,
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.5-flash',
      capabilities: {
        text: true,
        vision: true,
        audio: true,
        streaming: true,
        functionCalling: false,
        jsonMode: true,
      },
    })
    logger.info('[AI SDK] Registered: Gemini 2.5 Flash')
  } else {
    logger.warn('[AI SDK] Gemini API key not found - provider disabled')
  }

  // Register OpenAI (optional)
  if (process.env.OPENAI_API_KEY) {
    providerRegistry.register({
      id: 'openai-gpt4',
      name: 'OpenAI GPT-4',
      type: 'openai',
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o',
      capabilities: {
        text: true,
        vision: true,
        audio: false,
        streaming: true,
        functionCalling: true,
        jsonMode: true,
      },
    })
    logger.info('[AI SDK] Registered: OpenAI GPT-4')
  }

  const enabledCount = providerRegistry.listEnabled().length
  logger.info(`[AI SDK] ${enabledCount} provider(s) enabled`)
}
