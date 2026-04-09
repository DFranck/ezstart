import { logger } from '@ezstart/logger/server'
import mongoose from 'mongoose'

interface ResolvedProvider {
  providerId: string
  providerType: string
  priority: number
  config?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
}

/**
 * Get enabled providers for an app, ordered by priority.
 * Falls back to global defaults if no app-specific config exists.
 */
export async function getAppProviders(appName: string): Promise<ResolvedProvider[]> {
  try {
    // Dynamic import to avoid circular deps — model may not exist yet
    const AppProvider = mongoose.models.AppProvider as
      | mongoose.Model<Record<string, unknown>>
      | undefined

    if (!AppProvider) {
      // Model not registered yet — return defaults
      return getDefaultProviders()
    }

    const providers = await AppProvider.find({ appName, enabled: true })
      .sort({ priority: 1 })
      .lean()
      .exec()

    if (providers.length === 0) {
      return getDefaultProviders()
    }

    return providers.map((p: Record<string, unknown>) => ({
      providerId: p.providerId as string,
      providerType: p.providerType as string,
      priority: p.priority as number,
      config: p.config as ResolvedProvider['config'],
    }))
  } catch (error) {
    logger.warn('[AppProvider] Failed to resolve, using defaults:', error)
    return getDefaultProviders()
  }
}

function getDefaultProviders(): ResolvedProvider[] {
  return [
    { providerId: 'gemini-flash', providerType: 'gemini', priority: 1 },
    { providerId: 'openai-gpt4', providerType: 'openai', priority: 2 },
  ]
}
