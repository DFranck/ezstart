/**
 * @ezstart/ai-sdk - Server exports
 * For use in backend APIs only
 */

// Registry
export { ProviderRegistry, providerRegistry } from './server/registry/ProviderRegistry.js'
export type {
  ProviderConfig,
  AIProviderInfo,
  AIProviderType,
  ProviderCapabilities,
} from './server/registry/types.js'

// Providers
export { AnthropicProvider } from './server/providers/anthropic.js'
export type { AnthropicProviderConfig } from './server/providers/anthropic.js'
export { GeminiProvider } from './server/providers/gemini.js'
export type { GeminiProviderConfig } from './server/providers/gemini.js'
export { OpenAIProvider } from './server/providers/openai.js'
export type { OpenAIProviderConfig } from './server/providers/openai.js'
export type {
  IAIProvider,
  ChatMessage,
  ImageInput,
  ProviderSendOptions,
  ProviderResponse,
} from './server/providers/base.js'
export { assertValidModelName } from './server/providers/base.js'

// Core
export { UnifiedChat } from './server/core/UnifiedChat.js'

// AI Client
export { AIClient, createAIClient } from './ai-client.js'

// Schemas
export * from './schemas.js'

// Types (new schema-based)
export type * from './ai-types.js'
