/**
 * Registry types for AI Provider management
 */

export type AIProviderType = 'openai' | 'gemini' | 'anthropic' | 'custom'

export interface ProviderCapabilities {
  text: boolean
  vision: boolean
  audio: boolean
  streaming: boolean
  functionCalling: boolean
  jsonMode: boolean
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
}
