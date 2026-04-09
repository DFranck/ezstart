import { logger } from '@ezstart/logger/server'
import { GlobalProviderAccess, type IGlobalProviderAccess } from '../models/GlobalProviderAccess.js'

/**
 * Check if an app is authorized to use a specific provider.
 * Returns false if the provider doesn't exist or is globally disabled.
 */
export async function isAppAuthorizedForProvider(
  appName: string,
  providerId: string
): Promise<boolean> {
  const access = await GlobalProviderAccess.findOne({
    providerId,
    isGloballyEnabled: true,
  })
    .lean()
    .exec()

  if (!access) return false

  // "*" means all apps are allowed
  if (access.allowedApps.includes('*')) return true

  return access.allowedApps.includes(appName)
}

/**
 * Get all providers an app is authorized to use.
 * Only returns globally enabled providers where the app is in allowedApps (or "*").
 */
export async function getAuthorizedProviders(appName: string): Promise<IGlobalProviderAccess[]> {
  const allProviders = await GlobalProviderAccess.find({
    isGloballyEnabled: true,
  })
    .lean()
    .exec()

  return allProviders.filter(p => p.allowedApps.includes('*') || p.allowedApps.includes(appName))
}

/**
 * Seed default global providers if none exist.
 * Called once after MongoDB connect.
 */
export async function seedGlobalProviders(): Promise<void> {
  const count = await GlobalProviderAccess.countDocuments()
  if (count > 0) return

  await GlobalProviderAccess.create([
    {
      providerId: 'gemini-flash',
      providerType: 'gemini',
      displayName: 'Gemini 2.5 Flash',
      allowedApps: ['*'],
      defaultModel: 'gemini-2.5-flash',
      isGloballyEnabled: true,
    },
    {
      providerId: 'openai-gpt4',
      providerType: 'openai',
      displayName: 'OpenAI GPT-4o',
      allowedApps: ['*'],
      defaultModel: 'gpt-4o',
      isGloballyEnabled: true,
    },
  ])
  logger.info('[AI] Seeded default global providers')
}
