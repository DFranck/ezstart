import { logger } from '@ezstart/logger/server'
import mongoose from 'mongoose'
import { normalizeLegacyAppProvider } from '../models/AppProvider.js'

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
 *
 * Resolution rules:
 *   1. Providers whose `apps` array includes the queried `appName`
 *   2. "God" providers with `apps: ['*']` (available to every app)
 *   3. Legacy docs with `appName: <queriedApp>` (backward compat)
 *
 * Falls back to hardcoded defaults if no DB config exists.
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

    const providers = await AppProvider.find({
      enabled: true,
      $or: [
        { apps: appName },
        { apps: '*' },
        // backward compat — old docs without `apps` array
        { appName },
      ],
    })
      .sort({ priority: 1 })
      .lean()
      .exec()

    if (providers.length === 0) {
      return getDefaultProviders()
    }

    return providers.map((p: Record<string, unknown>) => {
      const normalized = normalizeLegacyAppProvider(p)
      return {
        providerId: normalized.providerId as string,
        providerType: normalized.providerType as string,
        priority: normalized.priority as number,
        config: normalized.config as ResolvedProvider['config'],
      }
    })
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
