/**
 * AIAgent - Main class for AI interactions with hooks
 *
 * Provides a unified interface for AI chat with:
 * - Multiple provider support (OpenAI, Anthropic, custom)
 * - beforeRequest / afterResponse hooks
 * - Streaming support
 * - Error handling
 * - Token tracking
 */

import type {
  AIAgentConfig,
  AIAgentResponse,
  AIRequestContext,
  AIResponseContext,
  ChatMessage,
} from './types/index.js'
import type { IAIProvider } from './providers/base.js'
import { OpenAIProvider } from './providers/openai.js'

export class AIAgent {
  private provider: IAIProvider
  private config: AIAgentConfig

  constructor(config: AIAgentConfig) {
    this.config = config
    this.provider = this.createProvider()
  }

  /**
   * Create AI provider based on config
   */
  private createProvider(): IAIProvider {
    switch (this.config.provider) {
      case 'openai':
        return new OpenAIProvider({
          apiKey: this.config.apiKey,
          model: this.config.model,
        })

      case 'anthropic':
        throw new Error('Anthropic provider not yet implemented')

      case 'custom':
        throw new Error('Custom provider must be provided in config')

      default:
        throw new Error(`Unknown provider: ${this.config.provider}`)
    }
  }

  /**
   * Send message to AI with hooks
   */
  async chat(
    message: string,
    options?: {
      history?: ChatMessage[]
      userId?: string
      conversationId?: string
      metadata?: Record<string, any>
    }
  ): Promise<AIAgentResponse> {
    try {
      // Build request context
      let context: AIRequestContext = {
        message,
        history: options?.history,
        metadata: options?.metadata,
        userId: options?.userId,
        conversationId: options?.conversationId,
      }

      // Call beforeRequest hook
      if (this.config.beforeRequest) {
        context = await this.config.beforeRequest(context)
      }

      // Send to AI provider
      const response = await this.provider.sendMessage(context.message, {
        systemPrompt: this.config.preprompt,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        history: context.history,
        streaming: this.config.streaming,
      })

      // Build response context
      let responseContext: AIResponseContext = {
        ...context,
        response: response.text,
        rawResponse: response.raw,
        tokensUsed: response.tokensUsed,
      }

      // Call afterResponse hook
      if (this.config.afterResponse) {
        responseContext = await this.config.afterResponse(responseContext)
      }

      return {
        text: responseContext.response,
        tokensUsed: responseContext.tokensUsed,
        raw: responseContext.rawResponse,
        metadata: responseContext.metadata,
      }
    } catch (error) {
      // Call onError hook
      if (this.config.onError) {
        await this.config.onError(
          error as Error,
          {
            message,
            history: options?.history,
            metadata: options?.metadata,
            userId: options?.userId,
            conversationId: options?.conversationId,
          }
        )
      }

      throw error
    }
  }

  /**
   * Get provider info
   */
  getInfo() {
    return {
      provider: this.config.provider,
      model: this.config.model,
      temperature: this.config.temperature,
      streaming: this.config.streaming?.enabled || false,
    }
  }
}
