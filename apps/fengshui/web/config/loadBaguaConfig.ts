/* path: /apps/fengshui/web/config/loadBaguaConfig.ts */

import { Direction } from '@/types/directions'
import { YearBaguaConfig } from '@/types/yearBaguaConfig'

export async function loadBaguaConfig(
  year: number,
  locale: string = 'fr-FR'
): Promise<YearBaguaConfig> {
  // @NOTE: en Next.js, l’import JSON statique est tree-shakeable si tu le références explicitement.
  // Pour du dynamique, tu peux mapper année->fichier ici.
  if (year === 2025 && locale.startsWith('fr')) {
    const cfg = await import('./bagua.2025.fr.json')
    return validateConfig(cfg.default ?? cfg)
  }
  throw new Error(`No Bagua config for year=${year} locale=${locale}`)
}

function validateConfig(raw: unknown): YearBaguaConfig {
  const cfg = raw as YearBaguaConfig
  if (!cfg || typeof cfg.year !== 'number' || typeof cfg.rotationOffsetDeg !== 'number') {
    throw new Error('Invalid Bagua config: missing year/rotationOffsetDeg')
  }
  const dirs: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  for (const d of dirs) {
    const s = cfg.sectors[d]
    if (!s || typeof s.title !== 'string' || typeof s.element !== 'string') {
      throw new Error(`Invalid Bagua config: sector ${d} missing fields`)
    }
  }
  return cfg
}
