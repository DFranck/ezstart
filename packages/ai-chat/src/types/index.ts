/**
 * @ezstart/ai-chat Types
 *
 * AI-agnostic types for chat configuration across projects
 */

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

/**
 * AI Provider configuration
 * Can be OpenAI, Anthropic, local models, etc.
 */
export interface AIProviderConfig {
  /**
   * Provider name (openai, anthropic, local, custom)
   */
  provider: 'openai' | 'anthropic' | 'local' | 'custom'

  /**
   * API endpoint URL
   */
  endpoint: string

  /**
   * Model identifier (gpt-4, claude-3, etc.)
   */
  model?: string

  /**
   * API key (optional, can be handled server-side)
   */
  apiKey?: string

  /**
   * Temperature for response randomness (0-1)
   * @default 0.7
   */
  temperature?: number

  /**
   * Maximum tokens in response
   */
  maxTokens?: number

  /**
   * Stream responses token by token
   * @default true
   */
  streaming?: boolean
}

/**
 * Preprompt configuration
 * Defines AI behavior and context
 */
export interface PrepromptConfig {
  /**
   * System preprompt - defines AI personality and rules
   */
  system?: string

  /**
   * Context to inject before user message
   */
  context?: string

  /**
   * Examples for few-shot learning
   */
  examples?: Array<{
    user: string
    assistant: string
  }>

  /**
   * Constraints and guidelines
   */
  constraints?: string[]

  /**
   * Output format instructions
   */
  outputFormat?: string
}

/**
 * Complete AI Chat Configuration
 * App-specific settings that customize the AI behavior
 */
export interface AIChatConfig {
  /**
   * Unique identifier for this config (e.g., 'green-pulse-forms', 'ezbill-support')
   */
  id: string

  /**
   * Display name
   */
  name: string

  /**
   * AI provider configuration
   */
  provider: AIProviderConfig

  /**
   * Preprompts and context
   */
  preprompt: PrepromptConfig

  /**
   * Request formatting function
   * Transforms user message + context into API request
   */
  formatRequest?: (message: string, context?: Record<string, any>) => any

  /**
   * Response formatting function
   * Extracts AI response from API response
   */
  formatResponse?: (data: any) => string

  /**
   * Success callback
   */
  onSuccess?: (data: any) => void

  /**
   * Error callback
   */
  onError?: (error: Error) => void

  /**
   * Streaming chunk processor
   */
  onStreamChunk?: (chunk: string) => void

  /**
   * Enable conversation persistence
   * @default false
   */
  enableConversations?: boolean

  /**
   * Custom headers for API requests
   */
  headers?: Record<string, string>

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>
}

/**
 * Conversation structure
 */
export interface Conversation {
  id: string
  title: string
  preview?: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

/**
 * Hook return type for useAIChat
 */
export interface UseAIChatReturn {
  messages: ChatMessage[]
  loading: boolean
  streamingText: string
  error: Error | null
  sendMessage: (content: string, context?: Record<string, any>) => Promise<void>
  clearMessages: () => void
  loadMessages: (messages: ChatMessage[]) => void
  retryLastMessage: () => Promise<void>
}