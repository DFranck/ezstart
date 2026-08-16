export type RuneSet =
  | 'violent'
  | 'swift'
  | 'rage'
  | 'fatal'
  | 'despair'
  | 'blade'
  | 'focus'
  | 'guard'
  | 'energy'
  | 'endure'
  | 'shield'
  | 'revenge'
  | 'will'
  | 'nemesis'
  | 'vampire'
  | 'destroy'
  | 'fight'
  | 'determination'
  | 'enhance'
  | 'accuracy'
  | 'tolerance'
  | 'cruel'

export type RuneSlot = 1 | 2 | 3 | 4 | 5 | 6

export type StatType =
  | 'hp'
  | 'hp%'
  | 'atk'
  | 'atk%'
  | 'def'
  | 'def%'
  | 'spd'
  | 'cr'
  | 'cd'
  | 'res'
  | 'acc'

export interface RuneStat {
  type: StatType
  value: number
}

export type RuneQuality = 'normal' | 'magic' | 'rare' | 'hero' | 'legend'

export interface RuneData {
  set: RuneSet
  slot: RuneSlot
  grade: number
  level: number
  quality?: RuneQuality
  mainStat: RuneStat
  subStats: RuneStat[]
  innateStat?: RuneStat
  isAncient?: boolean
  /** Last power-up roll values extracted from OCR hints like "(6%)" after substat values */
  rollHints?: Partial<Record<StatType, number>>
}

export type RuneMarker =
  | 'TRUE_LEG_MIN'
  | 'TRUE_HERO_MIN'
  | 'TRUE_RARE_MIN'
  | 'REAPP'
  | 'GEM'
  | 'GRIND'
  | 'TEST'
  | 'SELL'

export const RUNE_MARKER_COLORS: Record<RuneMarker, string> = {
  TRUE_LEG_MIN: 'text-yellow-400',
  TRUE_HERO_MIN: 'text-purple-400',
  TRUE_RARE_MIN: 'text-blue-400',
  REAPP: 'text-cyan-400',
  GEM: 'text-orange-400',
  GRIND: 'text-green-400',
  TEST: 'text-muted-foreground',
  SELL: 'text-destructive',
}
