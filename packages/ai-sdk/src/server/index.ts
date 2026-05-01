/**
 * `@ezstart/ai-sdk/server` — server-only exports.
 *
 * Server-side primitives for the AI SDK: provider registry, individual
 * provider client wrappers (Anthropic, Gemini, OpenAI), and the unified
 * chat dispatcher. Everything in this entry point requires server-side
 * credentials (provider API keys) and MUST NOT be imported from a client
 * component or browser bundle.
 *
 * Imported via:
 *
 * ```ts
 * import { providerRegistry, UnifiedChat } from '@ezstart/ai-sdk/server'
 * ```
 *
 * The `import 'server-only'` guard at the top of every file in this entry
 * throws at build time if a client component accidentally imports from
 * here, preventing API-key / token leaks to the browser bundle.
 */

import 'server-only'

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export {
  ProviderRegistry,
  providerRegistry,
  PROVIDER_STATUS_CHANGED_EVENT,
} from './registry/ProviderRegistry.js'
export type { ProviderStatusSnapshot } from './registry/ProviderRegistry.js'
export type {
  ProviderConfig,
  AIProviderInfo,
  AIProviderType,
  ProviderCapabilities,
  ProviderHealthState,
  ProviderHealthStatus,
  HealthCheckRunnerOptions,
  ProviderStatusChangedPayload,
} from './registry/types.js'

// ---------------------------------------------------------------------------
// Providers (concrete adapters)
// ---------------------------------------------------------------------------

export { AnthropicProvider } from './providers/anthropic.js'
export type { AnthropicProviderConfig } from './providers/anthropic.js'
export { GeminiProvider } from './providers/gemini.js'
export type { GeminiProviderConfig } from './providers/gemini.js'
export { OpenAIProvider } from './providers/openai.js'
export type { OpenAIProviderConfig } from './providers/openai.js'

// ---------------------------------------------------------------------------
// Provider base contract — types + helpers shared by every provider
// ---------------------------------------------------------------------------

export type {
  IAIProvider,
  ChatMessage,
  ImageInput,
  ProviderSendOptions,
  ProviderResponse,
  HealthCheckResult,
} from './providers/base.js'
export { assertValidModelName, defaultHealthCheck, extractErrorMessage } from './providers/base.js'

// ---------------------------------------------------------------------------
// Unified dispatcher
// ---------------------------------------------------------------------------

export { UnifiedChat } from './core/UnifiedChat.js'
