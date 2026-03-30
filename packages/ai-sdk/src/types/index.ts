/**
 * @ezstart/ai-sdk Types
 *
 * Backend AI SDK types for reusable AI agents
 */

/**
 * Supported AI providers
 */
export type AIProvider = 'openai' | 'anthropic' | 'custom'

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: MessageRole
  content: string
  name?: string
}

/**
 * Streaming options
 */
export interface StreamingOptions {
  /**
   * Enable streaming responses
   * @default false
   */
  enabled: boolean

  /**
   * Callback for each chunk received
   */
  onChunk?: (chunk: string) => void

  /**
   * Callback when streaming completes
   */
  onComplete?: (fullText: string) => void
}

/**
 * Request context passed to hooks
 */
export interface AIRequestContext {
  /**
   * User message
   */
  message: string

  /**
   * Conversation history
   */
  history?: ChatMessage[]

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>

  /**
   * User ID (optional)
   */
  userId?: string

  /**
   * Conversation ID (optional)
   */
  conversationId?: string
}

/**
 * Response context passed to hooks
 */
export interface AIResponseContext extends AIRequestContext {
  /**
   * AI response text
   */
  response: string

  /**
   * Raw API response
   */
  rawResponse?: unknown

  /**
   * Tokens used
   */
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }
}

/**
 * AI Agent Configuration
 */
export interface AIAgentConfig {
  /**
   * AI provider to use
   */
  provider: AIProvider

  /**
   * API key (optional if using env vars)
   */
  apiKey?: string

  /**
   * Model identifier (e.g., 'gpt-4', 'claude-3-opus')
   */
  model: string

  /**
   * System preprompt - defines AI behavior
   */
  preprompt?: string

  /**
   * Temperature (0-2 for OpenAI, 0-1 for others)
   * @default 0.7
   */
  temperature?: number

  /**
   * Maximum tokens in response
   */
  maxTokens?: number

  /**
   * Streaming configuration
   */
  streaming?: StreamingOptions

  /**
   * Hook: Before sending request to AI
   * Can modify message, add context, etc.
   */
  beforeRequest?: (context: AIRequestContext) => Promise<AIRequestContext> | AIRequestContext

  /**
   * Hook: After receiving response from AI
   * Can save to DB, process response, etc.
   */
  afterResponse?: (context: AIResponseContext) => Promise<AIResponseContext> | AIResponseContext

  /**
   * Hook: On error
   */
  onError?: (error: Error, context: AIRequestContext) => Promise<void> | void

  /**
   * Additional provider-specific options
   */
  providerOptions?: Record<string, unknown>
}

/**
 * AI Agent response
 */
export interface AIAgentResponse {
  /**
   * AI response text
   */
  text: string

  /**
   * Tokens used
   */
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }

  /**
   * Raw provider response
   */
  raw?: unknown

  /**
   * Metadata from hooks
   */
  metadata?: Record<string, unknown>
}

/**
 * Base AI Provider interface
 */
export interface IAIProvider {
  /**
   * Send message to AI
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
   * Validate configuration
   */
  validateConfig(): void
}
