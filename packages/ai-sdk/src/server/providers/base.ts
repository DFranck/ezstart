/**
 * Base AI Provider Interface
 */

import '../_internal/server-only.js'

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
  /**
   * Per-request model override. When set, this model is used for THIS call
   * only — the provider's default model (set via constructor or `setModel()`)
   * is not mutated. This is the concurrency-safe way to switch models per
   * request without affecting in-flight or parallel requests.
   */
  model?: string
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

/**
 * Validate a model name string used by `setModel()` or `options.model`.
 * Throws when the value is not a non-empty trimmed string.
 *
 * Centralized here so all providers use the same rule and tests can rely on
 * a stable error message.
 */
export function assertValidModelName(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Invalid model name: expected a non-empty string')
  }
}

/**
 * Result of a provider health check ping.
 *
 * - `ok: true` — provider responded successfully within the timeout window.
 * - `ok: false` — provider failed (auth error, network error, timeout, 5xx,
 *   etc.). `error` carries a short human-readable message.
 * - `latencyMs` — round-trip time of the ping. Present even on failure when
 *   the failure came from a response (e.g. 401/429), absent on timeout or
 *   connection error.
 */
export interface HealthCheckResult {
  ok: boolean
  latencyMs?: number
  error?: string
}

export interface IAIProvider {
  sendMessage(message: string, options?: ProviderSendOptions): Promise<ProviderResponse>
  validateConfig(): void
  /**
   * Get the current default model used by this provider when no per-request
   * `options.model` override is supplied.
   */
  getModel(): string
  /**
   * Update the default model at runtime. Subsequent `sendMessage()` calls
   * (without a per-request `options.model` override) use the new model.
   * Throws if `newModel` is empty / not a non-blank string.
   */
  setModel(newModel: string): void
  /**
   * Optional — cheap ping to verify the provider credentials + connectivity
   * are currently working. Implementations SHOULD use the lightest available
   * upstream call (auth probe, list-models, minimal completion) so this can
   * run on a short interval without burning budget.
   *
   * Default implementation (provided via {@link defaultHealthCheck}) returns
   * `{ ok: true }` so providers that don't implement it are considered
   * healthy by default — the registry can still disable them explicitly.
   */
  healthCheck?(signal?: AbortSignal): Promise<HealthCheckResult>
}

/**
 * Default no-op health check used by providers that don't implement one.
 * Returns `{ ok: true, latencyMs: 0 }`.
 */
export async function defaultHealthCheck(): Promise<HealthCheckResult> {
  return { ok: true, latencyMs: 0 }
}

/**
 * Helper to extract a short error message from an unknown thrown value.
 * Used by provider healthCheck implementations so error strings are stable.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}
