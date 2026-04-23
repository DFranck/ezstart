/**
 * Google Gemini Provider
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Content, Part } from '@google/generative-ai'
import {
  assertValidModelName,
  extractErrorMessage,
  type HealthCheckResult,
  type IAIProvider,
  type ProviderSendOptions,
  type ProviderResponse,
} from './base.js'

export interface GeminiProviderConfig {
  apiKey?: string
  model?: string
}

/**
 * Sensible defaults applied when the caller (prompt config, AppProvider config,
 * or direct `options`) does NOT provide an explicit value. These mirror
 * {@link AnthropicProvider} so every provider behaves consistently.
 *
 * - `DEFAULT_MAX_TOKENS = 4096` keeps conversational answers substantive;
 *   without it, a missing `maxOutputTokens` relies on the Gemini SDK default
 *   (historically low for some models), producing truncated, shallow replies.
 * - `DEFAULT_TEMPERATURE = 0.7` matches Anthropic/OpenAI defaults and is the
 *   industry-standard value for conversational agents.
 */
export const DEFAULT_MAX_TOKENS = 4096
export const DEFAULT_TEMPERATURE = 0.7

export class GeminiProvider implements IAIProvider {
  private genAI: GoogleGenerativeAI
  private model: string

  constructor(config: GeminiProviderConfig = {}) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY || ''
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = config.model || 'gemini-2.5-flash'
    this.validateConfig()
  }

  validateConfig(): void {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY is required')
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
   * Cheap health check — sends a minimal generateContent call with
   * `maxOutputTokens: 1`. The Gemini SDK does not expose a no-cost auth
   * probe, so a 1-token ping is the cheapest path that still validates
   * credentials and network. Aborts with the provided signal.
   */
  async healthCheck(signal?: AbortSignal): Promise<HealthCheckResult> {
    const started = Date.now()
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: { maxOutputTokens: 1 },
      })
      await model.generateContent(
        {
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          // Gemini SDK supports AbortSignal via the request options arg
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

  /**
   * Build Gemini content parts from message text and optional images
   */
  private buildContentParts(message: string, options: ProviderSendOptions): Part[] {
    const parts: Part[] = [{ text: message }]

    if (options.images && options.images.length > 0) {
      for (const image of options.images) {
        parts.push({
          inlineData: {
            data: image.data,
            mimeType: image.mimeType,
          },
        })
      }
    }

    return parts
  }

  async sendMessage(message: string, options: ProviderSendOptions = {}): Promise<ProviderResponse> {
    // Per-request model override — does NOT mutate `this.model`.
    if (options.model !== undefined) assertValidModelName(options.model)
    const requestModel = options.model ?? this.model

    const model = this.genAI.getGenerativeModel({
      model: requestModel,
      systemInstruction: options.systemPrompt,
      generationConfig: {
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        // Fall back to DEFAULT_MAX_TOKENS so a missing caller value never
        // bottoms out on an undocumented SDK default that can truncate
        // conversational replies.
        maxOutputTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        responseMimeType: options.extractJson ? 'application/json' : 'text/plain',
      },
    })

    const contentParts = this.buildContentParts(message, options)
    const hasImages = options.images && options.images.length > 0
    let content: string

    // Streaming mode
    if (options.streaming?.enabled) {
      return this.handleStreaming(model, message, options)
    }

    // With conversation history (images not supported in chat mode — use generateContent)
    if (options.history && options.history.length > 0 && !hasImages) {
      const history: Content[] = options.history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      const chat = model.startChat({ history })
      const result = await chat.sendMessage(message)
      content = result.response.text()
    } else {
      // Single message or message with images
      const result = await model.generateContent(contentParts)
      content = result.response.text()
    }

    // Handle JSON extraction
    if (options.extractJson) {
      try {
        return {
          text: 'Data extracted successfully',
          extractedData: JSON.parse(content),
        }
      } catch {
        return {
          text: 'Failed to parse extracted data',
          extractedData: null,
        }
      }
    }

    return {
      text: content,
      extractedData: null,
    }
  }

  private async handleStreaming(
    model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
    message: string,
    options: ProviderSendOptions
  ): Promise<ProviderResponse> {
    let fullText = ''
    const contentParts = this.buildContentParts(message, options)
    const hasImages = options.images && options.images.length > 0

    if (options.history && options.history.length > 0 && !hasImages) {
      const history: Content[] = options.history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      const chat = model.startChat({ history })
      const result = await chat.sendMessageStream(message)

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          fullText += text
          if (options.streaming?.onChunk) {
            options.streaming.onChunk(text)
          }
        }
      }
    } else {
      const result = await model.generateContentStream(contentParts)

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          fullText += text
          if (options.streaming?.onChunk) {
            options.streaming.onChunk(text)
          }
        }
      }
    }

    if (options.streaming?.onComplete) {
      options.streaming.onComplete(fullText)
    }

    return {
      text: fullText,
      tokensUsed: undefined,
    }
  }
}
