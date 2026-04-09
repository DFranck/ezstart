import { logger } from '@ezstart/logger/server'
import {
  AISystemPrompt,
  type IAISystemPrompt,
  type PromptType,
  type ProviderTarget,
} from '../models/AISystemPrompt.js'
import { AppProvider } from '../models/AppProvider.js'

// ============================================================================
// CACHE - Avoid DB query on every chat request
// ============================================================================
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const promptCache = new Map<string, { content: string; expiresAt: number }>()

function getCacheKey(appName: string, type: PromptType, provider: ProviderTarget): string {
  return `${appName}:${type}:${provider}`
}

function getFromCache(appName: string, type: PromptType, provider: ProviderTarget): string | null {
  const key = getCacheKey(appName, type, provider)
  const cached = promptCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.content
  }
  if (cached) promptCache.delete(key)
  return null
}

function setCache(
  appName: string,
  type: PromptType,
  provider: ProviderTarget,
  content: string
): void {
  const key = getCacheKey(appName, type, provider)
  promptCache.set(key, { content, expiresAt: Date.now() + CACHE_TTL_MS })
}

/** Clear cache - call this when prompts are updated via admin */
export function clearPromptCache(): void {
  promptCache.clear()
  logger.info('[AIPromptService] Cache cleared')
}

// ============================================================================
// DEFAULT PROMPTS - Generic fallback (NOT app-specific)
// ============================================================================
const DEFAULT_PROMPTS: Record<string, { content: string; name: string; description: string }> = {
  general: {
    name: 'AI Assistant (General)',
    description: 'Generic system prompt for AI advisory chat',
    content: `You are a helpful AI assistant. You provide clear, accurate, and well-structured responses.

RULES:
- Always respond in the language used by the user
- Use markdown formatting with moderation
- **Bold** only for critical terms (max 2-3 per response)
- Use lists for multiple items
- Prioritize clarity and conversational tone
- Ask clarifying questions when the request is ambiguous`,
  },
}

/**
 * Get a system prompt by type, provider, and appName
 * Uses in-memory cache (5min TTL) to avoid DB query on every chat request
 */
export async function getSystemPrompt(
  type: PromptType = 'general',
  provider: ProviderTarget = 'all',
  appName: string
): Promise<string> {
  // Check cache first
  const cached = getFromCache(appName, type, provider)
  if (cached) {
    return cached
  }

  try {
    // Try to find a prompt matching type, provider, and appName
    let prompt = await AISystemPrompt.findOne({
      appName,
      type,
      provider: { $in: [provider, 'all'] },
      isActive: true,
    })
      .sort({ isDefault: -1, provider: 1 })
      .lean()
      .exec()

    // If no prompt found, try just by type and appName
    if (!prompt) {
      prompt = await AISystemPrompt.findOne({
        appName,
        type,
        isActive: true,
      })
        .sort({ isDefault: -1 })
        .lean()
        .exec()
    }

    if (prompt) {
      setCache(appName, type, provider, prompt.content)
      return prompt.content
    }

    // Fallback to default prompts
    const fallback = DEFAULT_PROMPTS[type]
    if (fallback) {
      logger.info(`[AIPromptService] Using fallback prompt for app: ${appName}, type: ${type}`)
      setCache(appName, type, provider, fallback.content)
      return fallback.content
    }

    // Ultimate fallback
    logger.warn(
      `[AIPromptService] No prompt found for app: ${appName}, type: ${type}, using generic fallback`
    )
    const generic = 'You are a helpful assistant.'
    setCache(appName, type, provider, generic)
    return generic
  } catch (error) {
    logger.error('[AIPromptService] Error fetching prompt:', error)
    return DEFAULT_PROMPTS[type]?.content || 'You are a helpful assistant.'
  }
}

/**
 * Get full prompt document by type and appName (not just content string).
 * Useful when caller needs config, provider target, variables, etc.
 */
export async function getSystemPromptDoc(
  type: PromptType = 'general',
  appName: string
): Promise<IAISystemPrompt | null> {
  try {
    const cached = getFromCache(appName, type, 'all')
    // Cache only stores content strings; for full doc we query DB
    const prompt = await AISystemPrompt.findOne({
      appName,
      type,
      isActive: true,
    })
      .sort({ isDefault: -1 })
      .lean()
      .exec()

    if (prompt) {
      // Also populate content cache as a side-effect
      if (!cached) {
        setCache(appName, type, prompt.provider, prompt.content)
      }
      return prompt as IAISystemPrompt
    }

    return null
  } catch (error) {
    logger.error('[AIPromptService] Error fetching prompt doc:', error)
    return null
  }
}

/**
 * Get a prompt by its unique key and appName
 */
export async function getPromptByKey(key: string, appName: string): Promise<string | null> {
  try {
    const prompt = await AISystemPrompt.findOne({ key, appName, isActive: true }).lean().exec()
    return prompt?.content || null
  } catch (error) {
    logger.error('[AIPromptService] Error fetching prompt by key:', error)
    return null
  }
}

/**
 * Seed default prompts for a specific app if none exist
 */
export async function seedDefaultPrompts(appName: string): Promise<void> {
  try {
    const count = await AISystemPrompt.countDocuments({ appName })
    if (count > 0) {
      logger.info(
        `[AIPromptService] ${count} prompts already exist for app: ${appName}, skipping seed`
      )
      return
    }

    logger.info(`[AIPromptService] Seeding default prompts for app: ${appName}...`)

    const prompts = Object.entries(DEFAULT_PROMPTS).map(([key, data]) => ({
      key,
      appName,
      name: data.name,
      description: data.description,
      content: data.content,
      type: key as PromptType,
      provider: 'all' as ProviderTarget,
      isActive: true,
      isDefault: true,
      updatedBy: 'system',
    }))

    await AISystemPrompt.insertMany(prompts)
    logger.info(`[AIPromptService] Seeded ${prompts.length} default prompts for app: ${appName}`)
  } catch (error) {
    logger.error('[AIPromptService] Error seeding prompts:', error)
  }
}

// ============================================================================
// DEFAULT APP PROVIDERS - Seed per-app provider configurations
// ============================================================================

interface DefaultProviderDef {
  providerId: string
  providerType: 'gemini' | 'openai' | 'anthropic'
  priority: number
  enabled: boolean
  config?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
}

const DEFAULT_APP_PROVIDERS: DefaultProviderDef[] = [
  {
    providerId: 'gemini-flash',
    providerType: 'gemini',
    priority: 1,
    enabled: true,
    config: { model: 'gemini-2.5-flash-preview-04-17' },
  },
  {
    providerId: 'openai-gpt4',
    providerType: 'openai',
    priority: 2,
    enabled: true,
    config: { model: 'gpt-4o' },
  },
]

/**
 * Seed default app providers for a specific app if none exist
 */
export async function seedDefaultAppProviders(appName: string): Promise<void> {
  try {
    const count = await AppProvider.countDocuments({ appName })
    if (count > 0) {
      logger.info(
        `[AIPromptService] ${count} app providers already exist for app: ${appName}, skipping seed`
      )
      return
    }

    logger.info(`[AIPromptService] Seeding default app providers for app: ${appName}...`)

    const providers = DEFAULT_APP_PROVIDERS.map(def => ({
      ...def,
      appName,
    }))

    await AppProvider.insertMany(providers)
    logger.info(
      `[AIPromptService] Seeded ${providers.length} default app providers for app: ${appName}`
    )
  } catch (error) {
    logger.error('[AIPromptService] Error seeding app providers:', error)
  }
}
