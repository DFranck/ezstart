/**
 * Anthropic (Claude) Provider
 *
 * Implements `IAIProvider` on top of `@anthropic-ai/sdk`.
 *
 * Supports:
 * - Non-streaming `sendMessage` via Messages API
 * - Streaming via `messages.stream` (SSE events handled by the SDK)
 * - Vision (base64 images)
 * - System prompts (passed via `system` param, not as a message role)
 * - JSON extraction (`extractJson: true`)
 *
 * Errors are surfaced as `Anthropic.APIError` subclasses:
 * - `AuthenticationError` (401) — invalid API key
 * - `RateLimitError` (429) — rate limit / quota exceeded
 * - `InternalServerError` (5xx) — including `overloaded_error`
 * - `APIConnectionError` — network failures
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  assertValidModelName,
  extractErrorMessage,
  type HealthCheckResult,
  type IAIProvider,
  type ProviderSendOptions,
  type ProviderResponse,
} from './base.js'

export interface AnthropicProviderConfig {
  apiKey?: string
  model?: string
}

/** Default model — latest Sonnet (stable alias). */
const DEFAULT_MODEL = 'claude-sonnet-4-5'

/**
 * Sensible defaults applied when the caller (prompt config, AppProvider config,
 * or direct `options`) does NOT provide an explicit value. Exported so tests
 * and other providers can reference the same source of truth.
 *
 * Mirrored in {@link GeminiProvider} / {@link OpenAIProvider} for consistent
 * conversational behaviour across providers.
 */
export const DEFAULT_MAX_TOKENS = 4096
export const DEFAULT_TEMPERATURE = 0.7

export class AnthropicProvider implements IAIProvider {
  private client: Anthropic
  private model: string

  constructor(config: AnthropicProviderConfig = {}) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY
    this.client = new Anthropic({ apiKey })
    this.model = config.model || DEFAULT_MODEL
    this.validateConfig()
  }

  validateConfig(): void {
    if (!this.client.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required')
    }
  }

  getModel(): string {
    return this.model
  }

  setModel(newModel: string): void {
    assertValidModelName(newModel)
    this.model = newModel
  }

  /**
   * Cheap health check — sends a 1-token ping. Anthropic has no no-cost
   * auth probe (no list-models endpoint equivalent in the SDK), so we use
   * `max_tokens: 1` to minimize cost while still validating credentials.
   */
  async healthCheck(signal?: AbortSignal): Promise<HealthCheckResult> {
    const started = Date.now()
    try {
      await this.client.messages.create(
        {
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        },
        { signal }
      )
      return { ok: true, latencyMs: Date.now() - started }
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: extractErrorMessage(error),
      }
    }
  }

  async sendMessage(message: string, options: ProviderSendOptions = {}): Promise<ProviderResponse> {
    // Per-request model override — does NOT mutate `this.model` so concurrent
    // calls and parallel `setModel()` updates stay isolated.
    const requestModel = options.model ?? this.model
    if (options.model !== undefined) assertValidModelName(options.model)
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
      return this.handleStreaming(messages, options, requestModel)
    }

    // Regular mode (non-streaming)
    const response = await this.client.messages.create({
      model: requestModel,
      messages,
      system: options.systemPrompt || undefined,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
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
    options: ProviderSendOptions,
    model: string
  ): Promise<ProviderResponse> {
    const stream = this.client.messages.stream({
      model,
      messages,
      system: options.systemPrompt || undefined,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
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
