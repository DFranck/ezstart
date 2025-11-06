/**
 * Base AI Provider Interface
 *
 * All providers (OpenAI, Anthropic, custom) must implement this interface
 */

import type { AIAgentResponse, ChatMessage, StreamingOptions } from '../types/index.js'

export interface IAIProvider {
  /**
   * Send message to AI and get response
   */
  sendMessage(
    message: string,
    options: {
      systemPrompt?: string
      temperature?: number
      maxTokens?: number
      history?: ChatMessage[]
      streaming?: StreamingOptions
    }
  ): Promise<AIAgentResponse>

  /**
   * Validate provider configuration
   */
  validateConfig(): void
}
