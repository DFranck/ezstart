/**
 * @ezstart/ai-sdk - Server exports
 * For use in backend APIs only
 */

// Registry
export { ProviderRegistry, providerRegistry } from './server/registry/ProviderRegistry.js'
export type { ProviderConfig, AIProviderInfo, AIProviderType, ProviderCapabilities } from './server/registry/types.js'

// Providers
export { GeminiProvider } from './server/providers/gemini.js'
export { OpenAIProvider } from './providers/openai.js'
export type { IAIProvider, ChatMessage, ProviderSendOptions, ProviderResponse } from './server/providers/base.js'

// Core
export { UnifiedChat } from './server/core/UnifiedChat.js'

// Legacy exports (backward compatibility)
export { AIAgent } from './AIAgent.js'
export type * from './types/index.js'
