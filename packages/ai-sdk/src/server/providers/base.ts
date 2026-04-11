/**
 * Base AI Provider Interface
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** Image data for vision-capable models */
export interface ImageInput {
  /** Base64-encoded image data (without data URL prefix) */
  data: string
  /** MIME type (e.g., 'image/jpeg', 'image/png', 'image/webp') */
  mimeType: string
}

export interface ProviderSendOptions {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  history?: ChatMessage[]
  streaming?: {
    enabled: boolean
    onChunk?: (chunk: string) => void
    onComplete?: (fullText: string) => void
  }
  extractJson?: boolean
  /** Images to include with the message (vision support) */
  images?: ImageInput[]
}

export interface ProviderResponse {
  text: string
  extractedData?: unknown
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }
  raw?: unknown
}

export interface IAIProvider {
  sendMessage(message: string, options?: ProviderSendOptions): Promise<ProviderResponse>
  validateConfig(): void
}
