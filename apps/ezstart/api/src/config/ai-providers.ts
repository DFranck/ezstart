/**
 * AI Providers Configuration for EZStart
 *
 * Registers available AI providers from @ezstart/ai-sdk
 */

import { logger } from '@ezstart/logger/server'
import { providerRegistry } from '@ezstart/ai-sdk/server'

/** Default scheduler interval when no override is set — 5 minutes. */
const DEFAULT_HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000

/**
 * Stop handle for the active health-check scheduler. Exposed so tests can
 * cancel the background timer when they tear down the module.
 */
let stopScheduler: (() => void) | null = null

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

  // Start the periodic health-check scheduler. Env override supported so
  // staging/dev can shorten the loop during debugging. Disable entirely with
  // AI_HEALTH_CHECK_INTERVAL_MS=0.
  const intervalRaw = process.env.AI_HEALTH_CHECK_INTERVAL_MS
  const intervalMs = intervalRaw
    ? Number.parseInt(intervalRaw, 10)
    : DEFAULT_HEALTH_CHECK_INTERVAL_MS
  if (enabledCount > 0 && Number.isFinite(intervalMs) && intervalMs > 0) {
    stopScheduler = providerRegistry.startHealthCheckScheduler({ intervalMs })
    logger.info(`[AI SDK] Health-check scheduler started (every ${intervalMs}ms)`)
  }
}

/**
 * Stop the health-check scheduler. Intended for graceful shutdown + test
 * teardown. Safe to call when no scheduler is running.
 */
export function stopAIHealthCheckScheduler(): void {
  if (stopScheduler) {
    stopScheduler()
    stopScheduler = null
    logger.info('[AI SDK] Health-check scheduler stopped')
  }
}
