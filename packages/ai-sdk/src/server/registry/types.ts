/**
 * Registry types for AI Provider management
 */

import '../_internal/server-only.js'

export type AIProviderType = 'openai' | 'gemini' | 'anthropic' | 'custom'

export interface ProviderCapabilities {
  text: boolean
  vision: boolean
  audio: boolean
  streaming: boolean
  functionCalling: boolean
  jsonMode: boolean
}

/**
 * Health status of an AI provider, managed automatically by
 * {@link ProviderRegistry.runHealthChecks}.
 *
 * - `unknown` — no health check has run yet (default on register)
 * - `active` — last probe succeeded
 * - `degraded` — probe succeeded but crossed a latency threshold, OR recent
 *   probes are intermittently failing (not yet at the circuit-breaker limit)
 * - `disabled` — circuit breaker tripped (N consecutive failures). Requests
 *   are rejected by `getInstance()` until a future probe succeeds.
 */
export type ProviderHealthStatus = 'unknown' | 'active' | 'degraded' | 'disabled'

/**
 * Observable health state attached to every registered provider.
 * Updated by the registry; never set directly by consumers.
 */
export interface ProviderHealthState {
  status: ProviderHealthStatus
  /** Count of consecutive failed health probes. Reset on any success. */
  consecutiveFailures: number
  /** Timestamp (epoch ms) of the last health check, success or failure. */
  lastHealthCheckAt?: number
  /** Latency (ms) of the last probe. */
  lastLatencyMs?: number
  /** Short error message from the last failed probe. */
  lastHealthCheckError?: string
}

export interface ProviderConfig {
  id: string
  name: string
  type: AIProviderType
  enabled: boolean
  apiKey?: string
  model: string
  endpoint?: string
  capabilities: ProviderCapabilities
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
}

export interface AIProviderInfo {
  id: string
  name: string
  type: AIProviderType
  enabled: boolean
  capabilities: ProviderCapabilities
  model?: string
  health?: ProviderHealthState
}

/**
 * Options for {@link ProviderRegistry.runHealthChecks}.
 */
export interface HealthCheckRunnerOptions {
  /** Timeout per provider in ms. Default 5000. */
  timeoutMs?: number
  /**
   * Consecutive failures required to flip a provider into `disabled`.
   * Default 3.
   */
  failureThreshold?: number
  /**
   * Latency (ms) above which a successful probe marks the provider as
   * `degraded` instead of `active`. Default 3000.
   */
  degradedLatencyMs?: number
}

/**
 * Payload emitted by the `provider.status.changed` event on the registry.
 */
export interface ProviderStatusChangedPayload {
  id: string
  previous: ProviderHealthStatus
  current: ProviderHealthStatus
  health: ProviderHealthState
}
