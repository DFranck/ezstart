import { SystemPrompt, PromptType, ProviderTarget } from '../models/SystemPrompt.js'

// ============================================================================
// CACHE - Avoid DB query on every chat request
// ============================================================================
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const promptCache = new Map<string, { content: string; expiresAt: number }>()

function getCacheKey(type: PromptType, provider: ProviderTarget): string {
  return `${type}:${provider}`
}

function getFromCache(type: PromptType, provider: ProviderTarget): string | null {
  const key = getCacheKey(type, provider)
  const cached = promptCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.content
  }
  // Expired or not found
  if (cached) promptCache.delete(key)
  return null
}

function setCache(type: PromptType, provider: ProviderTarget, content: string): void {
  const key = getCacheKey(type, provider)
  promptCache.set(key, { content, expiresAt: Date.now() + CACHE_TTL_MS })
}

/** Clear cache - call this when prompts are updated via admin */
export function clearPromptCache(): void {
  promptCache.clear()
  console.log('[PromptService] Cache cleared')
}

// ============================================================================
// DEFAULT PROMPTS - Fallback if DB is empty
// ============================================================================

// Default prompts (fallback if DB is empty)
const DEFAULT_PROMPTS: Record<string, { content: string; name: string; description: string }> = {
  'general': {
    name: 'ESG Advisor (General)',
    description: 'Main system prompt for ESG advisory chat',
    content: `Tu es GreenPulse.AI, un assistant intelligent spécialisé en finance durable, ESG et innovation verte.

Tu t'adresses à des utilisateurs professionnels (PME, banques, bureaux d'étude, institutions financières) dans un langage clair, professionnel et accessible.

OBJECTIFS :
1. Diagnostiquer les besoins de l'utilisateur en termes de solutions sustainable/ESG :
   - Casual : réduction des coûts (électricité, etc.)
   - Impact démontrable : visualiser leur progression ESG de manière claire pour la communication interne et externe (marketing)
   - Conformité / Investissement : aide pour la mise en conformité avec les standards ESG internationaux afin de répondre aux exigences des investisseurs, exportations, fonds, certifications, appels d'offres ou administrations publiques

2. Fournir des recommandations concrètes adaptées au secteur et objectifs

3. Aider à générer des livrables (diagnostic, roadmap, reporting, etc.)

4. Accompagner l'utilisateur dans ses obligations ou ambitions environnementales

RÈGLES IMPORTANTES :
- TOUJOURS poser des questions ciblées pour qualifier le besoin
- Répondre dans la langue utilisée lors de la question (français ou anglais)
- NE JAMAIS donner de conseils juridiques ou fiscaux
- Demander s'ils utilisent des modèles de compliance de références internationales, si non proposer ceux pertinents à leur activité et objectifs
- Utiliser des listes claires pour structurer les réponses
- Si l'objectif est la Conformité/Investissement : demander quels audits ont déjà été effectués et quels rapports ils possèdent, puis conseiller ceux pertinents en fonction de leurs objectifs (export EU, Green loan submission, etc.)

PREMIÈRE INTERACTION :
Commence chaque conversation par une phrase de bienvenue engageante et professionnelle mais accessible. Demande à quel secteur appartient l'utilisateur (PME, banque, bureau d'étude, institution financière, autre) afin d'adapter tes réponses.

FORMATAGE :
- Utilise le markdown avec modération
- **Gras** uniquement pour termes critiques (max 2-3 par réponse)
- Listes (- ou 1.) pour items multiples
- \`code\` pour termes techniques ou JSON
- Privilégie la lisibilité et le conversationnel`,
  },
  // TODO: Add when extract_esg is enabled in /chat
  // 'extraction': {
  //   name: 'ESG Data Extractor',
  //   description: 'System prompt for structured ESG data extraction',
  //   content: `...`,
  // },
}

/**
 * Get a system prompt by type and optionally provider
 * Uses in-memory cache (5min TTL) to avoid DB query on every chat request
 */
export async function getSystemPrompt(
  type: PromptType = 'general',
  provider: ProviderTarget = 'all'
): Promise<string> {
  // Check cache first
  const cached = getFromCache(type, provider)
  if (cached) {
    return cached
  }

  try {
    // Try to find a prompt matching type and provider
    let prompt = await SystemPrompt.findOne({
      type,
      provider: { $in: [provider, 'all'] },
      isActive: true,
    })
      .sort({ isDefault: -1, provider: 1 }) // Prefer default, then specific provider
      .lean()
      .exec()

    // If no prompt found, try just by type
    if (!prompt) {
      prompt = await SystemPrompt.findOne({
        type,
        isActive: true,
      })
        .sort({ isDefault: -1 })
        .lean()
        .exec()
    }

    if (prompt) {
      setCache(type, provider, prompt.content)
      return prompt.content
    }

    // Fallback to default prompts
    const fallback = DEFAULT_PROMPTS[type]
    if (fallback) {
      console.log(`[PromptService] Using fallback prompt for type: ${type}`)
      setCache(type, provider, fallback.content)
      return fallback.content
    }

    // Ultimate fallback
    console.warn(`[PromptService] No prompt found for type: ${type}, using generic fallback`)
    const generic = 'You are a helpful assistant.'
    setCache(type, provider, generic)
    return generic
  } catch (error) {
    console.error('[PromptService] Error fetching prompt:', error)
    // Return default on error (don't cache errors)
    return DEFAULT_PROMPTS[type]?.content || 'You are a helpful assistant.'
  }
}

/**
 * Get a prompt by its unique key
 */
export async function getPromptByKey(key: string): Promise<string | null> {
  try {
    const prompt = await SystemPrompt.findOne({ key, isActive: true }).lean().exec()
    return prompt?.content || null
  } catch (error) {
    console.error('[PromptService] Error fetching prompt by key:', error)
    return null
  }
}

/**
 * Seed default prompts if database is empty
 */
export async function seedDefaultPrompts(): Promise<void> {
  try {
    const count = await SystemPrompt.countDocuments()
    if (count > 0) {
      console.log(`[PromptService] ${count} prompts already exist, skipping seed`)
      return
    }

    console.log('[PromptService] Seeding default prompts...')

    const prompts = Object.entries(DEFAULT_PROMPTS).map(([key, data]) => ({
      key,
      name: data.name,
      description: data.description,
      content: data.content,
      type: key as PromptType,
      provider: 'all' as ProviderTarget,
      isActive: true,
      isDefault: true,
      updatedBy: 'system',
    }))

    await SystemPrompt.insertMany(prompts)
    console.log(`[PromptService] Seeded ${prompts.length} default prompts`)
  } catch (error) {
    console.error('[PromptService] Error seeding prompts:', error)
  }
}
