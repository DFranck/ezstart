/**
 * OpenAI Provider
 */

import OpenAI from 'openai'
import {
  assertValidModelName,
  type IAIProvider,
  type ProviderSendOptions,
  type ProviderResponse,
} from './base.js'

export interface OpenAIProviderConfig {
  apiKey?: string
  model?: string
}

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI
  private model: string

  constructor(config: OpenAIProviderConfig = {}) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY
    this.client = new OpenAI({ apiKey })
    this.model = config.model || 'gpt-4o'
    this.validateConfig()
  }

  validateConfig(): void {
    if (!this.client.apiKey) {
      throw new Error('OPENAI_API_KEY is required')
    }
  }

  getModel(): string {
    return this.model
  }

  setModel(newModel: string): void {
    assertValidModelName(newModel)
    this.model = newModel
  }

  async sendMessage(message: string, options: ProviderSendOptions = {}): Promise<ProviderResponse> {
    // Per-request model override — does NOT mutate `this.model`.
    const requestModel = options.model ?? this.model
    if (options.model !== undefined) assertValidModelName(options.model)
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
      options.history.forEach(msg => {
        const role =
          msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user'
        messages.push({ role, content: msg.content } as OpenAI.Chat.ChatCompletionMessageParam)
      })
    }

    // Add current user message (with images if provided)
    if (options.images && options.images.length > 0) {
      const contentParts: OpenAI.Chat.ChatCompletionContentPart[] = [
        { type: 'text', text: message },
        ...options.images.map(
          img =>
            ({
              type: 'image_url',
              image_url: { url: `data:${img.mimeType};base64,${img.data}` },
            }) as OpenAI.Chat.ChatCompletionContentPart
        ),
      ]
      messages.push({ role: 'user', content: contentParts })
    } else {
      messages.push({ role: 'user', content: message })
    }

    // JSON mode
    const responseFormat = options.extractJson ? { type: 'json_object' as const } : undefined

    // Streaming mode
    if (options.streaming?.enabled) {
      return this.handleStreaming(messages, options, requestModel)
    }

    // Regular mode (non-streaming)
    const response = await this.client.chat.completions.create({
      model: requestModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      response_format: responseFormat,
    })

    const choice = response.choices[0]
    if (!choice) throw new Error('No response from OpenAI')

    const text = choice.message.content || ''

    // Handle JSON extraction
    if (options.extractJson) {
      try {
        return {
          text: 'Data extracted successfully',
          extractedData: JSON.parse(text),
          tokensUsed: {
            prompt: response.usage?.prompt_tokens || 0,
            completion: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0,
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
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      raw: response,
    }
  }

  private async handleStreaming(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: ProviderSendOptions,
    model: string
  ): Promise<ProviderResponse> {
    const stream = await this.client.chat.completions.create({
      model,
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
        if (options.streaming?.onChunk) {
          options.streaming.onChunk(content)
        }
      }
    }

    if (options.streaming?.onComplete) {
      options.streaming.onComplete(fullText)
    }

    return {
      text: fullText,
      tokensUsed: undefined, // Streaming doesn't return token usage
    }
  }
}
