/* path: /apps/fengshui/web/config/loadBaguaConfig.ts */

import { Direction } from '@/types/directions'
import { YearBaguaConfig, BaguaBaseConfig, BaguaStarsConfig, CombinedOrientation } from '@/types/yearBaguaConfig'

export async function loadBaguaConfig(
  year: number,
  locale: string = 'fr-FR'
): Promise<YearBaguaConfig> {
  // Charger la configuration de base
  const baseConfig = await loadBaseConfig(locale)
  
  // Charger les étoiles volantes pour l'année
  const starsConfig = await loadStarsConfig(year, locale)
  
  // Combiner les deux configurations
  return combineConfigs(baseConfig, starsConfig)
}

async function loadBaseConfig(locale: string): Promise<BaguaBaseConfig> {
  if (locale.startsWith('fr')) {
    const cfg = await import('./bagua.fr.base.json')
    return validateBaseConfig(cfg.default ?? cfg)
  }
  throw new Error(`No base Bagua config for locale=${locale}`)
}

async function loadStarsConfig(year: number, locale: string): Promise<BaguaStarsConfig> {
  if (year === 2025 && locale.startsWith('fr')) {
    const cfg = await import('./bagua.2025.fr.stars.json')
    return validateStarsConfig(cfg.default ?? cfg)
  }
  throw new Error(`No stars config for year=${year} locale=${locale}`)
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
        notes: undefined
      }
    }
  }
  
  return {
    year: stars.year,
    locale: base.locale,
    rotationOffsetDeg: 0,
    orientations
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
