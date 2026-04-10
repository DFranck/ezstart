/**
 * Google Gemini Provider
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { IAIProvider, ProviderSendOptions, ProviderResponse, ChatMessage } from './base.js'

export interface GeminiProviderConfig {
  apiKey?: string
  model?: string
}

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

  async sendMessage(message: string, options: ProviderSendOptions = {}): Promise<ProviderResponse> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: options.systemPrompt,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens,
        responseMimeType: options.extractJson ? 'application/json' : 'text/plain',
      },
    })

    let content: string

    // Streaming mode
    if (options.streaming?.enabled) {
      return this.handleStreaming(model, message, options)
    }

    // With conversation history
    if (options.history && options.history.length > 0) {
      const history = options.history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      const chat = model.startChat({ history })
      const result = await chat.sendMessage(message)
      content = result.response.text()
    } else {
      // Single message
      const result = await model.generateContent(message)
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

    if (options.history && options.history.length > 0) {
      const history = options.history.map(msg => ({
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
      const result = await model.generateContentStream(message)

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
