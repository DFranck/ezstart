import { SystemPrompt, PromptType, ProviderTarget } from '../models/SystemPrompt.js'

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
  'extraction': {
    name: 'ESG Data Extractor',
    description: 'System prompt for structured ESG data extraction',
    content: `You are a structured extractor. From the conversation text,
output ONLY valid JSON conforming to the ESG schema (company, sites, period, scopes, targets, evidence).
Do not include explanations. Fill missing values with null and list them in _missing.`,
  },
  'validation': {
    name: 'ESG Data Validator',
    description: 'System prompt for validating ESG data',
    content: `Validate this ESG data JSON against business rules:
- All numbers must be >= 0
- Period format must be YYYY, YYYY-Q#, or YYYY-MM
- Scope2 items must have site_id
- Company country must be 2-letter code
Return {"ok": true} or {"ok": false, "errors": [...]}`,
  },
}

/**
 * Get a system prompt by type and optionally provider
 */
export async function getSystemPrompt(
  type: PromptType = 'general',
  provider: ProviderTarget = 'all'
): Promise<string> {
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
      return prompt.content
    }

    // Fallback to default prompts
    const fallback = DEFAULT_PROMPTS[type]
    if (fallback) {
      console.log(`[PromptService] Using fallback prompt for type: ${type}`)
      return fallback.content
    }

    // Ultimate fallback
    console.warn(`[PromptService] No prompt found for type: ${type}, using generic fallback`)
    return 'You are a helpful assistant.'
  } catch (error) {
    console.error('[PromptService] Error fetching prompt:', error)
    // Return default on error
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
