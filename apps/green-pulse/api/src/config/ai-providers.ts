/**
 * AI Providers Configuration for GreenPulse
 *
 * Registers available AI providers from @ezstart/ai-sdk
 */

import { providerRegistry } from '@ezstart/ai-sdk'

/**
 * Initialize AI providers
 * Called at app startup
 */
export function initializeAIProviders() {
  console.log('[AI SDK] Initializing providers...')

  // Register Gemini (primary)
  if (process.env.GEMINI_API_KEY) {
    providerRegistry.register({
      id: 'gemini-flash',
      name: 'Gemini 2.0 Flash',
      type: 'gemini',
      enabled: true,
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.0-flash-exp',
      capabilities: {
        text: true,
        vision: true,
        audio: true,
        streaming: true,
        functionCalling: false,
        jsonMode: true,
      },
    })
    console.log('✅ [AI SDK] Registered: Gemini 2.0 Flash')
  } else {
    console.warn('⚠️  [AI SDK] Gemini API key not found - provider disabled')
  }

  // Register OpenAI (optional)
  if (process.env.OPENAI_API_KEY) {
    providerRegistry.register({
      id: 'openai-gpt4',
      name: 'OpenAI GPT-4',
      type: 'openai',
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview',
      capabilities: {
        text: true,
        vision: true,
        audio: false,
        streaming: true,
        functionCalling: true,
        jsonMode: true,
      },
    })
    console.log('✅ [AI SDK] Registered: OpenAI GPT-4')
  }

  const enabledCount = providerRegistry.listEnabled().length
  console.log(`[AI SDK] ${enabledCount} provider(s) enabled`)
}
