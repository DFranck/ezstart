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
}
