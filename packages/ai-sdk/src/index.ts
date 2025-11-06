/**
 * @ezstart/ai-sdk
 *
 * Reusable AI SDK for backend APIs
 * Supports multiple providers, streaming, hooks, and custom configurations
 */

// Main class
export { AIAgent } from './AIAgent.js'

// Types
export type {
  AIProvider,
  MessageRole,
  ChatMessage,
  StreamingOptions,
  AIRequestContext,
  AIResponseContext,
  AIAgentConfig,
  AIAgentResponse,
  IAIProvider,
} from './types/index.js'

// Providers (for advanced use cases)
export { OpenAIProvider } from './providers/openai.js'
export type { IAIProvider as BaseProvider } from './providers/base.js'
