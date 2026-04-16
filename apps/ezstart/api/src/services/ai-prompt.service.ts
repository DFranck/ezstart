import { logger } from '@ezstart/logger/server'
import {
  AISystemPrompt,
  APPS_WILDCARD,
  PROVIDERS_WILDCARD,
  normalizeLegacyPrompt,
  type IAISystemPrompt,
  type PromptType,
  type ProviderTarget,
} from '../models/AISystemPrompt.js'
import { AppProvider } from '../models/AppProvider.js'

// ============================================================================
// CACHE - Avoid DB query on every chat request
// Both caches are cleared on any prompt mutation (create/update/delete).
// ============================================================================
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour (cleared on admin mutations)
const promptCache = new Map<string, { content: string; expiresAt: number }>()
const docCache = new Map<string, { doc: IAISystemPrompt | null; expiresAt: number }>()

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

function getDocCacheKey(appName: string, type: PromptType): string {
  return `${appName}:${type}`
}

/** Clear cache - call this when prompts are updated via admin */
export function clearPromptCache(): void {
  promptCache.clear()
  docCache.clear()
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

// ============================================================================
// COMPOSED RESOLVER
// ============================================================================

/**
 * Resolve and COMPOSE all active system prompts that match the given
 * (type, provider, appName) tuple.
 *
 * Matching rules:
 *  - `apps[]` contains `appName` OR `apps[]` contains `'*'` (god-level)
 *  - `providers[]` contains `provider` OR `providers[]` contains `'all'`
 *  - `type` strict match
 *  - `isActive: true`
 *
 * Composition order:
 *  1. God-level prompts (`apps` includes `'*'`) injected FIRST
 *  2. App-scoped prompts injected AFTER (so they can specialize / override)
 *  Within each group, ordering: `isDefault` desc, `priority` desc, `createdAt` asc.
 *
 * Backward compat: documents lacking the new `apps[]` / `providers[]` arrays
 * (legacy `appName` / `provider`) are normalized in-memory before composition.
 */
export async function getComposedSystemPrompt(
  type: PromptType = 'general',
  provider: ProviderTarget = 'all',
  appName: string
): Promise<string> {
  const cached = getFromCache(appName, type, provider)
  if (cached) return cached

  try {
    // Build a query that tolerates BOTH new (apps[]/providers[]) and legacy
    // (appName/provider) document shapes during the soft migration window.
    const appMatch = {
      $or: [
        { apps: appName },
        { apps: APPS_WILDCARD },
        // Legacy fallback for un-migrated docs
        { appName },
      ],
    }
    const providerMatch = {
      $or: [
        { providers: provider },
        { providers: PROVIDERS_WILDCARD },
        // Legacy fallback
        { provider },
        { provider: PROVIDERS_WILDCARD },
      ],
    }

    const raw = await AISystemPrompt.find({
      $and: [appMatch, providerMatch, { type }, { isActive: true }],
    })
      .sort({ isDefault: -1, priority: -1, createdAt: 1 })
      .lean()
      .exec()

    const prompts = raw.map(p => normalizeLegacyPrompt(p as Partial<IAISystemPrompt>))

    if (prompts.length === 0) {
      const fallback = DEFAULT_PROMPTS[type]
      const content = fallback?.content || 'You are a helpful assistant.'
      logger.info(
        `[AIPromptService] No prompts matched for app=${appName} type=${type} provider=${provider}, using fallback`
      )
      setCache(appName, type, provider, content)
      return content
    }

    // God-level first, then app-scoped (so app-scoped can specialize)
    const godPrompts = prompts.filter(p => (p.apps ?? []).includes(APPS_WILDCARD))
    const appPrompts = prompts.filter(p => !(p.apps ?? []).includes(APPS_WILDCARD))

    const composed = [...godPrompts, ...appPrompts]
      .map(p => p.content)
      .filter((c): c is string => Boolean(c && c.trim().length > 0))
      .join('\n\n---\n\n')

    const finalContent =
      composed || DEFAULT_PROMPTS[type]?.content || 'You are a helpful assistant.'
    setCache(appName, type, provider, finalContent)
    return finalContent
  } catch (error) {
    logger.error('[AIPromptService] Error composing prompt:', error)
    return DEFAULT_PROMPTS[type]?.content || 'You are a helpful assistant.'
  }
}

/**
 * @deprecated Use {@link getComposedSystemPrompt}. Wrapper kept for backward
 * compatibility with existing call sites.
 */
export async function getSystemPrompt(
  type: PromptType = 'general',
  provider: ProviderTarget = 'all',
  appName: string
): Promise<string> {
  return getComposedSystemPrompt(type, provider, appName)
}

/**
 * Get a single full prompt document for a (type, appName) — used by callers
 * that need metadata (config, variables, providers list) rather than the
 * composed string. Returns the highest-priority active doc.
 */
export async function getSystemPromptDoc(
  type: PromptType = 'general',
  appName: string
): Promise<IAISystemPrompt | null> {
  const cacheKey = getDocCacheKey(appName, type)
  const cached = docCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.doc
  }
  if (cached) docCache.delete(cacheKey)

  try {
    // App-specific prompts ALWAYS win over god-level (apps: ['*']) defaults,
    // regardless of isDefault. Otherwise a global isDefault: true prompt would
    // shadow every per-app customization.
    const appSpecific = await AISystemPrompt.findOne({
      $and: [{ $or: [{ apps: appName }, { appName }] }, { type }, { isActive: true }],
    })
      .sort({ isDefault: -1, priority: -1, createdAt: 1 })
      .lean()
      .exec()

    const raw =
      appSpecific ??
      (await AISystemPrompt.findOne({
        $and: [{ apps: APPS_WILDCARD }, { type }, { isActive: true }],
      })
        .sort({ isDefault: -1, priority: -1, createdAt: 1 })
        .lean()
        .exec())

    const doc = raw
      ? (normalizeLegacyPrompt(raw as Partial<IAISystemPrompt>) as IAISystemPrompt)
      : null
    docCache.set(cacheKey, { doc, expiresAt: Date.now() + CACHE_TTL_MS })
    logger.warn(
      `[AIPromptService] Loaded prompt doc app=${appName} type=${type} name="${doc?.name ?? 'NONE'}" key="${doc?.key ?? 'NONE'}" scope=${doc?.apps?.includes(APPS_WILDCARD) ? 'god' : 'app'}`
    )
    return doc
  } catch (error) {
    logger.error('[AIPromptService] Error fetching prompt doc:', error)
    return null
  }
}

/**
 * Get a prompt by its unique key (optionally constrained to an app scope).
 */
export async function getPromptByKey(key: string, appName: string): Promise<string | null> {
  try {
    const raw = await AISystemPrompt.findOne({
      key,
      isActive: true,
      $or: [{ apps: appName }, { apps: APPS_WILDCARD }, { appName }],
    })
      .lean()
      .exec()
    if (!raw) return null
    const doc = normalizeLegacyPrompt(raw as Partial<IAISystemPrompt>)
    return doc?.content || null
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
    // Match both new shape (apps array) and legacy (appName) docs
    const count = await AISystemPrompt.countDocuments({
      $or: [{ apps: appName }, { appName }],
    })
    if (count > 0) {
      logger.info(
        `[AIPromptService] ${count} prompts already exist for app: ${appName}, skipping seed`
      )
      return
    }

    logger.info(`[AIPromptService] Seeding default prompts for app: ${appName}...`)

    const prompts = Object.entries(DEFAULT_PROMPTS).map(([key, data]) => ({
      key,
      apps: [appName],
      providers: [PROVIDERS_WILDCARD],
      name: data.name,
      description: data.description,
      content: data.content,
      type: key as PromptType,
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
    const count = await AppProvider.countDocuments({
      $or: [{ apps: appName }, { appName }],
    })
    if (count > 0) {
      logger.info(
        `[AIPromptService] ${count} app providers already exist for app: ${appName}, skipping seed`
      )
      return
    }

    logger.info(`[AIPromptService] Seeding default app providers for app: ${appName}...`)

    const providers = DEFAULT_APP_PROVIDERS.map(def => ({
      ...def,
      apps: [appName],
    }))

    await AppProvider.insertMany(providers)
    logger.info(
      `[AIPromptService] Seeded ${providers.length} default app providers for app: ${appName}`
    )
  } catch (error) {
    logger.error('[AIPromptService] Error seeding app providers:', error)
  }
}
