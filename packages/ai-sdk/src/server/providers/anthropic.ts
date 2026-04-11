/**
 * Anthropic (Claude) Provider
 */

import Anthropic from '@anthropic-ai/sdk'
import type { IAIProvider, ProviderSendOptions, ProviderResponse, ChatMessage } from './base.js'

export interface AnthropicProviderConfig {
  apiKey?: string
  model?: string
}

export class AnthropicProvider implements IAIProvider {
  private client: Anthropic
  private model: string

  constructor(config: AnthropicProviderConfig = {}) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY
    this.client = new Anthropic({ apiKey })
    this.model = config.model || 'claude-sonnet-4-20250514'
    this.validateConfig()
  }

  validateConfig(): void {
    if (!this.client.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required')
    }
  }

  async sendMessage(message: string, options: ProviderSendOptions = {}): Promise<ProviderResponse> {
    // Build messages array (Anthropic uses user/assistant roles only, system is separate)
    const messages: Anthropic.MessageParam[] = []

    // Add conversation history (filter out system messages — handled via system param)
    if (options.history && options.history.length > 0) {
      options.history.forEach(msg => {
        if (msg.role === 'system') return // System messages go in system param
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })
      })
    }

    // Add current user message (with images if provided)
    if (options.images && options.images.length > 0) {
      const contentParts: Anthropic.ContentBlockParam[] = [
        { type: 'text', text: message },
        ...options.images.map(
          img =>
            ({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: img.data,
              },
            }) as Anthropic.ImageBlockParam
        ),
      ]
      messages.push({ role: 'user', content: contentParts })
    } else {
      messages.push({ role: 'user', content: message })
    }

    // Streaming mode
    if (options.streaming?.enabled) {
      return this.handleStreaming(messages, options)
    }

    // Regular mode (non-streaming)
    const response = await this.client.messages.create({
      model: this.model,
      messages,
      system: options.systemPrompt || undefined,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
    })

    const textBlock = response.content.find(block => block.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    // Handle JSON extraction
    if (options.extractJson) {
      try {
        return {
          text: 'Data extracted successfully',
          extractedData: JSON.parse(text),
          tokensUsed: {
            prompt: response.usage.input_tokens,
            completion: response.usage.output_tokens,
            total: response.usage.input_tokens + response.usage.output_tokens,
          },
          raw: response,
        }
      } catch {
        return {
          text: 'Failed to parse extracted data',
          extractedData: null,
        }
      }
    }

    return {
      text,
      tokensUsed: {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      raw: response,
    }
  }

  private async handleStreaming(
    messages: Anthropic.MessageParam[],
    options: ProviderSendOptions
  ): Promise<ProviderResponse> {
    const stream = this.client.messages.stream({
      model: this.model,
      messages,
      system: options.systemPrompt || undefined,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
    })

    let fullText = ''

    stream.on('text', text => {
      fullText += text
      if (options.streaming?.onChunk) {
        options.streaming.onChunk(text)
      }
    })

    const finalMessage = await stream.finalMessage()

    if (options.streaming?.onComplete) {
      options.streaming.onComplete(fullText)
    }

    return {
      text: fullText,
      tokensUsed: {
        prompt: finalMessage.usage.input_tokens,
        completion: finalMessage.usage.output_tokens,
        total: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      },
    }
  }
}
