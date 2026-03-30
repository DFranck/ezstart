/* path: /apps/fengshui/web/config/loadBaguaConfig.ts */

import { Direction } from '@/types/directions'
import { logger } from '@ezstart/logger'
import {
  YearBaguaConfig,
  BaguaBaseConfig,
  BaguaStarsConfig,
  CombinedOrientation,
} from '@/types/yearBaguaConfig'

// Version client : utilise les données des messages next-intl
export function loadBaguaConfigFromMessages(messages: Record<string, unknown>): YearBaguaConfig {
  if (!messages.bagua) {
    throw new Error(`No Bagua config found in messages`)
  }

  const baguaMessages = messages.bagua as Record<string, unknown>
  const baseConfig = validateBaseConfig(baguaMessages)
  const starsConfig = validateStarsConfig(baguaMessages.stars)

  // Combiner les deux configurations
  return combineConfigs(baseConfig, starsConfig)
}

// Version serveur : import direct pour fallback
export async function loadBaguaConfig(
  year: number,
  locale: string = 'fr-FR'
): Promise<YearBaguaConfig> {
  try {
    let localeCode = 'fr' // Default
    if (locale.startsWith('en')) {
      localeCode = 'en'
    } else if (locale.startsWith('es')) {
      localeCode = 'es'
    }

    const baseConfig = await import(`../messages/${localeCode}/base.json`)
    const starsConfig = await import(`../messages/${localeCode}/stars.json`)

    return combineConfigs(
      validateBaseConfig(baseConfig.default ?? baseConfig),
      validateStarsConfig(starsConfig.default ?? starsConfig)
    )
  } catch (error) {
    logger.error(`Failed to load Bagua config for locale ${locale}:`, error)
    // Fallback to French
    const baseConfig = await import('../messages/fr/base.json')
    const starsConfig = await import('../messages/fr/stars.json')

    return combineConfigs(
      validateBaseConfig(baseConfig.default ?? baseConfig),
      validateStarsConfig(starsConfig.default ?? starsConfig)
    )
  }
}

function combineConfigs(base: BaguaBaseConfig, stars: BaguaStarsConfig): YearBaguaConfig {
  const orientations: Record<Direction, CombinedOrientation> = {} as any

  // Directions principales + Centre
  const dirs: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'C']

  for (const dir of dirs) {
    const baseSector = base.sectors[dir]
    const star = stars.stars[dir]

    if (baseSector) {
      orientations[dir] = {
        ...baseSector,
        star: star || undefined,
        // Compatibilité avec l'ancienne structure
        colorHex: baseSector.colorHexes?.[0], // Première couleur principale
        keywords: [], // À remplir depuis la nouvelle structure si nécessaire
        tips: [], // À migrer depuis enhancers si nécessaire
        remedies: star?.remedies || [],
        avoid: [],
        symbols: [],
        notes: undefined,
      }
    }
  }

  return {
    year: stars.year,
    locale: base.locale,
    rotationOffsetDeg: 0,
    orientations,
  }
}

function validateBaseConfig(raw: unknown): BaguaBaseConfig {
  const cfg = raw as BaguaBaseConfig
  if (!cfg || typeof cfg.locale !== 'string') {
    throw new Error('Invalid base Bagua config: missing locale')
  }

  const dirs: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'C']
  for (const d of dirs) {
    const s = cfg.sectors[d]
    if (!s || typeof s.title !== 'string' || typeof s.element !== 'string') {
      throw new Error(`Invalid base Bagua config: sector ${d} missing fields`)
    }
  }
  return cfg
}

function validateStarsConfig(raw: unknown): BaguaStarsConfig {
  const cfg = raw as BaguaStarsConfig
  if (!cfg || typeof cfg.year !== 'number' || typeof cfg.locale !== 'string') {
    throw new Error('Invalid stars Bagua config: missing year/locale')
  }

  const dirs: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'C']
  for (const d of dirs) {
    const s = cfg.stars[d]
    if (s && (!s.star || !s.status)) {
      throw new Error(`Invalid stars Bagua config: star ${d} missing fields`)
    }
  }
  return cfg
}
