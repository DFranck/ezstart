/**
 * AI Provider Registry
 * Manages multiple AI providers dynamically
 */

import type { ProviderConfig, AIProviderInfo } from './types.js'
import type { IAIProvider } from '../providers/base.js'
import { GeminiProvider } from '../providers/gemini.js'
import { OpenAIProvider } from '../providers/openai.js'

export class ProviderRegistry {
  private providers: Map<string, ProviderConfig> = new Map()
  private instances: Map<string, IAIProvider> = new Map()

  /**
   * Register a new AI provider
   */
  register(config: ProviderConfig): void {
    this.providers.set(config.id, config)

    // Create instance
    const instance = this.createInstance(config)
    this.instances.set(config.id, instance)

    console.log(`✅ Registered AI provider: ${config.name} (${config.type})`)
  }

  /**
   * Unregister a provider
   */
  unregister(id: string): void {
    this.providers.delete(id)
    this.instances.delete(id)
    console.log(`❌ Unregistered AI provider: ${id}`)
  }

  /**
   * Get provider instance
   */
  getInstance(id: string): IAIProvider {
    const instance = this.instances.get(id)
    if (!instance) {
      const available = Array.from(this.providers.keys()).join(', ')
      throw new Error(`Provider "${id}" not found. Available: ${available}`)
    }

    const config = this.providers.get(id)
    if (config && !config.enabled) {
      throw new Error(`Provider "${id}" is disabled`)
    }

    return instance
  }

  /**
   * List all providers (public info only)
   */
  list(): AIProviderInfo[] {
    return Array.from(this.providers.values()).map(config => ({
      id: config.id,
      name: config.name,
      type: config.type,
      enabled: config.enabled,
      capabilities: config.capabilities,
      model: config.model,
    }))
  }

  /**
   * List only enabled providers
   */
  listEnabled(): AIProviderInfo[] {
    return this.list().filter(p => p.enabled)
  }

  /**
   * Get provider config (full)
   */
  getConfig(id: string): ProviderConfig | undefined {
    return this.providers.get(id)
  }

  /**
   * Update provider enabled status
   */
  setEnabled(id: string, enabled: boolean): void {
    const config = this.providers.get(id)
    if (config) {
      config.enabled = enabled
      const status = enabled ? 'enabled' : 'disabled'
      console.log(`${enabled ? '✅' : '❌'} Provider "${id}" ${status}`)
    }
  }

  /**
   * Create provider instance from config
   */
  private createInstance(config: ProviderConfig): IAIProvider {
    switch (config.type) {
      case 'gemini':
        return new GeminiProvider({
          apiKey: config.apiKey,
          model: config.model,
        })

      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey,
          model: config.model,
        })

      case 'anthropic':
        throw new Error('Anthropic provider not yet implemented')

      case 'custom':
        throw new Error('Custom provider must be provided via constructor')

      default:
        throw new Error(`Unknown provider type: ${config.type}`)
    }
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry()
