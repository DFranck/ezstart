/**
 * Unified Chat Service
 * Single interface to chat with any AI provider
 */

import { providerRegistry } from '../registry/ProviderRegistry.js'
import type { ChatMessage, ProviderSendOptions, ProviderResponse } from '../providers/base.js'
import type { AIProviderInfo } from '../registry/types.js'

export class UnifiedChat {
  /**
   * Send message using specified provider
   */
  static async send(
    message: string,
    providerId: string,
    options?: ProviderSendOptions
  ): Promise<ProviderResponse> {
    const provider = providerRegistry.getInstance(providerId)
    return provider.sendMessage(message, options)
  }

  /**
   * Get list of available providers
   */
  static getProviders(): AIProviderInfo[] {
    return providerRegistry.listEnabled()
  }

  /**
   * Get all providers (including disabled)
   */
  static getAllProviders(): AIProviderInfo[] {
    return providerRegistry.list()
  }

  /**
   * Send message with automatic fallback
   * Tries providers in order until one succeeds
   */
  static async sendWithFallback(
    message: string,
    providerIds: string[],
    options?: ProviderSendOptions
  ): Promise<ProviderResponse> {
    const errors: Error[] = []

    for (const providerId of providerIds) {
      try {
        console.log(`🤖 Trying provider: ${providerId}`)
        return await this.send(message, providerId, options)
      } catch (error) {
        console.warn(`⚠️  Provider ${providerId} failed:`, error)
        errors.push(error as Error)
        continue
      }
    }

    throw new Error(
      `All providers failed. Tried: ${providerIds.join(', ')}. Errors: ${errors.map(e => e.message).join('; ')}`
    )
  }

  /**
   * Send message to multiple providers in parallel
   * Returns first successful response
   */
  static async sendRace(
    message: string,
    providerIds: string[],
    options?: ProviderSendOptions
  ): Promise<ProviderResponse & { providerId: string }> {
    const promises = providerIds.map(async providerId => {
      const response = await this.send(message, providerId, options)
      return { ...response, providerId }
    })

    return Promise.race(promises)
  }
}
