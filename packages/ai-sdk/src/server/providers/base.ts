/**
 * Base AI Provider Interface
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
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
}

export interface ProviderResponse {
  text: string
  extractedData?: any
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }
  raw?: any
}

export interface IAIProvider {
  sendMessage(message: string, options?: ProviderSendOptions): Promise<ProviderResponse>
  validateConfig(): void
}
