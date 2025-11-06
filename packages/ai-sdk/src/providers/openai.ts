/**
 * OpenAI Provider Implementation
 */

import OpenAI from 'openai'
import type { AIAgentResponse, ChatMessage, StreamingOptions } from '../types/index.js'
import type { IAIProvider } from './base.js'

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI
  private model: string

  constructor(config: { apiKey?: string; model: string }) {
    this.model = config.model
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    })
  }

  validateConfig(): void {
    if (!this.client.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY env var or pass apiKey in config.')
    }
  }

  async sendMessage(
    message: string,
    options: {
      systemPrompt?: string
      temperature?: number
      maxTokens?: number
      history?: ChatMessage[]
      streaming?: StreamingOptions
    }
  ): Promise<AIAgentResponse> {
    this.validateConfig()

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    // Add system prompt
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      })
    }

    // Add conversation history
    if (options.history && options.history.length > 0) {
      options.history.forEach((msg) => {
        const role = msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user'
        messages.push({
          role,
          content: msg.content,
        } as OpenAI.Chat.ChatCompletionMessageParam)
      })
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    })

    // Streaming mode
    if (options.streaming?.enabled) {
      return this.handleStreaming(messages, options)
    }

    // Regular mode (non-streaming)
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    })

    const choice = response.choices[0]
    if (!choice) {
      throw new Error('No response from OpenAI')
    }
    const text = choice.message.content || ''

    return {
      text,
      tokensUsed: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      raw: response,
    }
  }

  private async handleStreaming(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: {
      temperature?: number
      maxTokens?: number
      streaming?: StreamingOptions
    }
  ): Promise<AIAgentResponse> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: true,
    })

    let fullText = ''

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        fullText += content
        // Call onChunk callback
        if (options.streaming?.onChunk) {
          options.streaming.onChunk(content)
        }
      }
    }

    // Call onComplete callback
    if (options.streaming?.onComplete) {
      options.streaming.onComplete(fullText)
    }

    return {
      text: fullText,
      // Note: streaming doesn't return token usage in OpenAI
      tokensUsed: undefined,
    }
  }
}
