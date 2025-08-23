import { ELEMENTAL_COLORS, type ElementalType } from '@tower-defense/config'

export type ElementalUnion = ElementalType | readonly [ElementalType, ElementalType]

export type TowerPaint = {
  kind: 'solid' | 'dual'
  /** CSS color for solid (mono) OR left color for dual */
  color: `#${string}`
  /** right color if dual, else undefined */
  colorB?: `#${string}`
  /** Convenient CSS background value (solid or linear-gradient) */
  background: string
}

/** Decide how to paint a tower given its elemental typing */
export function paintFromElement(elemental: ElementalUnion): TowerPaint {
  if (Array.isArray(elemental)) {
    const [a, b] = elemental
    const c1 = ELEMENTAL_COLORS[a as ElementalType]
    const c2 = ELEMENTAL_COLORS[b as ElementalType]
    return {
      kind: 'dual',
      color: c1,
      colorB: c2,
      background: `linear-gradient(135deg, ${c1} 0%, ${c1} 50%, ${c2} 50%, ${c2} 100%)`,
    }
  }
  const c = ELEMENTAL_COLORS[elemental as ElementalType]
  return {
    kind: 'solid',
    color: c,
    background: c,
  }
}

/** Optional: pick a contrasting text color for labels on top of a tile */
export function contrastText(bgHex: `#${string}`): '#000000' | '#ffffff' {
  const hex = bgHex.slice(1)
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  // YIQ luma heuristic
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 140 ? '#000000' : '#ffffff'
}
