/**
 * AI Provider Registry
 * Manages multiple AI providers dynamically
 */

import { logger } from '@ezstart/logger'
import type { ProviderConfig, AIProviderInfo } from './types.js'
import type { IAIProvider } from '../providers/base.js'
import { AnthropicProvider } from '../providers/anthropic.js'
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

    logger.info(`Registered AI provider: ${config.name} (${config.type})`)
  }

  /**
   * Unregister a provider
   */
  unregister(id: string): void {
    this.providers.delete(id)
    this.instances.delete(id)
    logger.info(`Unregistered AI provider: ${id}`)
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
      logger.info(`Provider "${id}" ${status}`)
    }
  }

  /**
   * Update the default model of a registered provider at runtime.
   *
   * - Updates the live provider instance (next `sendMessage()` calls without
   *   a per-request `options.model` override use the new model).
   * - Updates the stored `ProviderConfig.model` so `list()` / `getConfig()`
   *   reflect the change.
   * - Does NOT affect requests already in flight (each request captures its
   *   model at the start of `sendMessage`), so this is safe to call
   *   concurrently with running requests.
   *
   * Throws if the provider id is unknown or the new model is invalid.
   */
  updateModel(id: string, newModel: string): void {
    const instance = this.instances.get(id)
    const config = this.providers.get(id)
    if (!instance || !config) {
      const available = Array.from(this.providers.keys()).join(', ')
      throw new Error(`Provider "${id}" not found. Available: ${available}`)
    }
    instance.setModel(newModel) // also validates the model name
    config.model = newModel
    logger.info(`Provider "${id}" model updated to "${newModel}"`)
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
        return new AnthropicProvider({
          apiKey: config.apiKey,
          model: config.model,
        })

      case 'custom':
        throw new Error('Custom provider must be provided via constructor')

      default:
        throw new Error(`Unknown provider type: ${config.type}`)
    }
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry()
