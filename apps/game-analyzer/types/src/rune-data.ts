import type { StatType, RuneSet } from './rune'

// ============================================
// SUBSTAT ROLL RANGES (6★)
// ============================================
export const SUBSTAT_ROLL_RANGES: Record<StatType, { min: number; max: number }> = {
  'hp': { min: 135, max: 375 },
  'hp%': { min: 5, max: 8 },
  'atk': { min: 10, max: 20 },
  'atk%': { min: 5, max: 8 },
  'def': { min: 10, max: 20 },
  'def%': { min: 5, max: 8 },
  'spd': { min: 4, max: 6 },
  'cr': { min: 4, max: 6 },
  'cd': { min: 4, max: 7 },
  'res': { min: 4, max: 8 },
  'acc': { min: 4, max: 8 },
}

// ============================================
// MAIN STAT VALUES AT +15 (6★)
// ============================================
// Slot 1: ATK flat only = 160
// Slot 3: DEF flat only = 160
// Slot 5: HP flat only = 2448
// Slot 2: SPD=42, ATK%=63, DEF%=63, HP%=63
// Slot 4: CR%=58, CD%=80, ATK%=63, DEF%=63, HP%=63
// Slot 6: ACC%=64, RES%=64, ATK%=63, DEF%=63, HP%=63
export const MAIN_STAT_MAX: Record<string, Partial<Record<StatType, number>>> = {
  '1': { 'atk': 160 },
  '2': { 'spd': 42, 'atk%': 63, 'def%': 63, 'hp%': 63 },
  '3': { 'def': 160 },
  '4': { 'cr': 58, 'cd': 80, 'atk%': 63, 'def%': 63, 'hp%': 63 },
  '5': { 'hp': 2448 },
  '6': { 'acc': 64, 'res': 64, 'atk%': 63, 'def%': 63, 'hp%': 63 },
}

// ============================================
// GRINDSTONE RANGES BY RARITY
// ============================================
// Only grindable: hp, hp%, atk, atk%, def, def%, spd
export type GrindRarity = 'magic' | 'rare' | 'hero' | 'legend'

export const GRIND_RANGES: Record<GrindRarity, Partial<Record<StatType, { min: number; max: number }>>> = {
  magic: {
    'hp%': { min: 2, max: 5 }, 'atk%': { min: 2, max: 5 }, 'def%': { min: 2, max: 5 },
    'hp': { min: 100, max: 200 }, 'atk': { min: 6, max: 12 }, 'def': { min: 6, max: 12 },
    'spd': { min: 1, max: 2 },
  },
  rare: {
    'hp%': { min: 3, max: 6 }, 'atk%': { min: 3, max: 6 }, 'def%': { min: 3, max: 6 },
    'hp': { min: 180, max: 250 }, 'atk': { min: 10, max: 18 }, 'def': { min: 10, max: 18 },
    'spd': { min: 2, max: 3 },
  },
  hero: {
    'hp%': { min: 4, max: 7 }, 'atk%': { min: 4, max: 7 }, 'def%': { min: 4, max: 7 },
    'hp': { min: 230, max: 450 }, 'atk': { min: 12, max: 22 }, 'def': { min: 12, max: 22 },
    'spd': { min: 3, max: 4 },
  },
  legend: {
    'hp%': { min: 5, max: 10 }, 'atk%': { min: 5, max: 10 }, 'def%': { min: 5, max: 10 },
    'hp': { min: 430, max: 550 }, 'atk': { min: 18, max: 30 }, 'def': { min: 18, max: 30 },
    'spd': { min: 4, max: 5 },
  },
}

// Stats that CAN be grinded
export const GRINDABLE_STATS: StatType[] = ['hp', 'hp%', 'atk', 'atk%', 'def', 'def%', 'spd']

// ============================================
// ENCHANTED GEM RANGES BY RARITY
// ============================================
export const GEM_RANGES: Record<GrindRarity, Record<StatType, { min: number; max: number }>> = {
  magic: {
    'hp%': { min: 2, max: 4 }, 'atk%': { min: 2, max: 4 }, 'def%': { min: 2, max: 4 },
    'hp': { min: 100, max: 200 }, 'atk': { min: 8, max: 12 }, 'def': { min: 8, max: 12 },
    'spd': { min: 1, max: 3 },
    'cr': { min: 2, max: 3 }, 'cd': { min: 2, max: 4 },
    'res': { min: 2, max: 4 }, 'acc': { min: 2, max: 4 },
  },
  rare: {
    'hp%': { min: 4, max: 6 }, 'atk%': { min: 4, max: 6 }, 'def%': { min: 4, max: 6 },
    'hp': { min: 180, max: 280 }, 'atk': { min: 10, max: 16 }, 'def': { min: 10, max: 16 },
    'spd': { min: 2, max: 4 },
    'cr': { min: 3, max: 5 }, 'cd': { min: 3, max: 5 },
    'res': { min: 4, max: 6 }, 'acc': { min: 4, max: 6 },
  },
  hero: {
    'hp%': { min: 5, max: 9 }, 'atk%': { min: 5, max: 9 }, 'def%': { min: 5, max: 9 },
    'hp': { min: 250, max: 420 }, 'atk': { min: 15, max: 23 }, 'def': { min: 15, max: 23 },
    'spd': { min: 3, max: 6 },
    'cr': { min: 4, max: 6 }, 'cd': { min: 4, max: 7 },
    'res': { min: 5, max: 9 }, 'acc': { min: 5, max: 9 },
  },
  legend: {
    'hp%': { min: 7, max: 11 }, 'atk%': { min: 7, max: 11 }, 'def%': { min: 7, max: 11 },
    'hp': { min: 400, max: 580 }, 'atk': { min: 20, max: 30 }, 'def': { min: 20, max: 30 },
    'spd': { min: 5, max: 8 },
    'cr': { min: 5, max: 8 }, 'cd': { min: 5, max: 9 },
    'res': { min: 7, max: 11 }, 'acc': { min: 7, max: 11 },
  },
}

// ============================================
// RUNE SET INFO
// ============================================
export const RUNE_SET_INFO: Record<RuneSet, { pieces: number; bonus: string }> = {
  'energy': { pieces: 2, bonus: 'HP +15%' },
  'fatal': { pieces: 4, bonus: 'ATK +35%' },
  'blade': { pieces: 2, bonus: 'CRI Rate +12%' },
  'swift': { pieces: 4, bonus: 'SPD +25%' },
  'focus': { pieces: 2, bonus: 'ACC +20%' },
  'guard': { pieces: 2, bonus: 'DEF +15%' },
  'endure': { pieces: 2, bonus: 'RES +20%' },
  'shield': { pieces: 2, bonus: 'Ally Shield 3 turns (15% HP)' },
  'revenge': { pieces: 2, bonus: 'Counterattack +15%' },
  'will': { pieces: 2, bonus: 'Immunity 1 turn' },
  'nemesis': { pieces: 2, bonus: 'ATB +4% per 7% HP lost' },
  'vampire': { pieces: 4, bonus: 'Lifedrain +35%' },
  'destroy': { pieces: 2, bonus: 'Destroy 30% of damage dealt (4% max HP)' },
  'despair': { pieces: 4, bonus: 'Stun Rate +25%' },
  'violent': { pieces: 4, bonus: 'Extra Turn +22%' },
  'rage': { pieces: 4, bonus: 'CRI Dmg +40%' },
  'fight': { pieces: 2, bonus: 'Ally ATK +8%' },
  'determination': { pieces: 2, bonus: 'Ally DEF +8%' },
  'enhance': { pieces: 2, bonus: 'Ally HP +8%' },
  'accuracy': { pieces: 2, bonus: 'Ally ACC +10%' },
  'tolerance': { pieces: 2, bonus: 'Ally RES +10%' },
  'cruel': { pieces: 2, bonus: 'ATK +12%' },
}

// ============================================
// QUALITY / RARITY
// ============================================
export type RuneQuality = 'normal' | 'magic' | 'rare' | 'hero' | 'legend'

// Number of substats by quality at +0
export const SUBSTATS_BY_QUALITY: Record<RuneQuality, number> = {
  normal: 0,
  magic: 1,
  rare: 2,
  hero: 3,
  legend: 4,
}

// Nombre total d'upgrades (rolls) à +12 par qualité
// C'est le nombre de fois qu'une substat est rollée/augmentée
export const UPGRADES_BY_QUALITY: Record<RuneQuality, number> = {
  normal: 0,
  magic: 1,
  rare: 2,
  hero: 3,
  legend: 4,
}

/** @deprecated Use UPGRADES_BY_QUALITY instead */
export const MAX_ROLLS_BY_QUALITY = UPGRADES_BY_QUALITY

// Nombre de substats attendu à un level donné pour une qualité donnée
// SW rules: upgrades d'abord (autant que de subs existantes), puis nouvelles subs
export function getExpectedSubstatCount(quality: RuneQuality, level: number): number {
  const base = SUBSTATS_BY_QUALITY[quality]
  const powerups = Math.floor(Math.min(level, 12) / 3) // 0,1,2,3,4 powerups
  const upgrades = Math.min(powerups, base) // upgrade les existantes d'abord
  const newSubs = powerups - upgrades // le reste = nouvelles subs
  return Math.min(base + newSubs, 4)
}

// Nombre de rolls/upgrades à un level donné
// Seules les upgrades de subs existantes comptent comme rolls
export function getRollCount(quality: RuneQuality, level: number): number {
  const base = SUBSTATS_BY_QUALITY[quality]
  const powerups = Math.floor(Math.min(level, 12) / 3)
  return Math.min(powerups, base) // seules les upgrades comptent comme rolls
}

// ============================================
// BUILD ARCHETYPES & SYNERGY
// ============================================

export type BuildArchetype =
  | 'speed-dps' | 'bruiser' | 'cleave' | 'cc-debuffer' | 'tank-support'
  | 'bomber' | 'strip-cleanse' | 'healer' | 'one-shot-nuker'
  | 'vampire-bruiser' | 'revenge-proc' | 'speed-leader' | 'raid-support' | 'def-nuker'

export const BUILD_ARCHETYPES: Record<BuildArchetype, {
  name: string
  emoji: string
  desiredStats: StatType[]
  description: string
}> = {
  'speed-dps': {
    name: 'Speed DPS',
    emoji: '⚡',
    desiredStats: ['spd', 'cr', 'cd', 'atk%'],
    description: 'Lushen, Kaki, Alicia',
  },
  'bruiser': {
    name: 'Bruiser',
    emoji: '💪',
    desiredStats: ['hp%', 'cr', 'cd', 'spd'],
    description: 'Vigor, Karnal, Mo Long',
  },
  'cleave': {
    name: 'Cleave',
    emoji: '💀',
    desiredStats: ['atk%', 'cr', 'cd', 'spd'],
    description: 'Poseidon, Zaiross, Julie',
  },
  'cc-debuffer': {
    name: 'CC/Debuffer',
    emoji: '🎯',
    desiredStats: ['spd', 'acc', 'hp%', 'def%'],
    description: 'Tyron, Loren, Spectra',
  },
  'tank-support': {
    name: 'Tank/Support',
    emoji: '🛡️',
    desiredStats: ['hp%', 'def%', 'spd', 'res'],
    description: 'Fran, Riley, Lulu',
  },
  'bomber': {
    name: 'Bomber',
    emoji: '💣',
    desiredStats: ['atk%', 'spd', 'acc', 'hp%'],
    description: 'Seara, Malaka, Liebli',
  },
  'strip-cleanse': {
    name: 'Strip/Cleanse',
    emoji: '✨',
    desiredStats: ['spd', 'hp%', 'acc', 'res'],
    description: 'Juno, Praha, Velajuel',
  },
  'healer': {
    name: 'Healer',
    emoji: '💚',
    desiredStats: ['spd', 'hp%', 'def%', 'acc'],
    description: 'Fran, Ariel, Chasun',
  },
  'one-shot-nuker': {
    name: 'One-Shot',
    emoji: '🔫',
    desiredStats: ['atk%', 'cr', 'cd', 'spd'],
    description: 'Copper, Bulldozer, Kahli',
  },
  'def-nuker': {
    name: 'DEF Nuker',
    emoji: '🏰',
    desiredStats: ['def%', 'cr', 'cd', 'spd'],
    description: 'Copper, Bulldozer, Feng Yan',
  },
  'vampire-bruiser': {
    name: 'Vamp Bruiser',
    emoji: '🧛',
    desiredStats: ['atk%', 'cr', 'cd', 'hp%'],
    description: 'Laika, Rakan',
  },
  'revenge-proc': {
    name: 'Revenge',
    emoji: '🔄',
    desiredStats: ['hp%', 'def%', 'cr', 'cd'],
    description: 'Miho, Rina',
  },
  'speed-leader': {
    name: 'Speed Lead',
    emoji: '🏃',
    desiredStats: ['spd', 'hp%', 'def%', 'res'],
    description: 'Bernard, Kabilla, Orion',
  },
  'raid-support': {
    name: 'Raid',
    emoji: '⚔️',
    desiredStats: ['spd', 'hp%', 'def%', 'res'],
    description: 'Colleen, Fran (R5)',
  },
}

export const SYNERGY_BONUS = {
  PERFECT_4: 8,         // 4/4 substats match
  THREE_NO_ROLL: 8,     // 3/4 match + 4th has 0-1 roll → gem without loss = like 4/4
  THREE_WITH_ROLLS: 4,  // 3/4 match + 4th has 2+ rolls → gem possible but loss
  TWO_NO_ROLLS: 4,      // 2/4 match + 2 others have 0-1 roll → gem possible
  TWO_WITH_ROLLS: 0,    // 2/4 match + rolls in bad stats → too much loss
  INCOHERENT: -3,       // < 2 match
} as const

export interface SynergyResult {
  bestArchetype: BuildArchetype | null
  matchCount: number
  synergyBonus: number
  allArchetypes: { archetype: BuildArchetype; matchCount: number; matchedStats: StatType[] }[]
}

// ============================================
// RUNE ANALYSIS TYPES (computed server-side)
// ============================================

export type EfficiencyTier = 'sell' | 'keep' | 'good' | 'great' | 'godlike'

export type PlayerProfile = 'early' | 'mid' | 'late'

export const EFFICIENCY_THRESHOLDS: Record<PlayerProfile, Record<EfficiencyTier, number>> = {
  early: { sell: 0, keep: 50, good: 60, great: 70, godlike: 80 },
  mid:   { sell: 0, keep: 60, good: 70, great: 80, godlike: 85 },
  late:  { sell: 0, keep: 70, good: 80, great: 85, godlike: 90 },
}

/** Strictness malus by rune level — added to threshold */
export const LEVEL_STRICTNESS: Record<number, number> = {
  0: 15, 3: 10, 6: 7, 9: 3, 12: 0, 15: 0,
}

export interface SubstatAnalysis {
  type: StatType
  value: number
  /** Efficiency percentage for this substat (0-100) */
  efficiency: number
  /** Estimated number of rolls into this substat */
  rolls: number
  /** Whether this substat can be grinded */
  grindable: boolean
  /** Value after best grind (legend) — undefined if not grindable */
  grindedValue?: number
  /** Grind amount added (legend max) */
  grindAmount?: number
}

export interface RuneAnalysis {
  /** Overall efficiency score (0-100) — Barion raw */
  efficiency: number
  /** Weighted efficiency — stat importance-adjusted score (primary display, used for tier) */
  weightedEfficiency: number
  /** Tier label based on weightedEfficiency */
  tier: EfficiencyTier
  /** Projected efficiency at +12 if not yet +12 — undefined if already +12 */
  maxEfficiency?: number
  /** Efficiency after applying legend grinds to all grindable substats */
  grindedEfficiency?: number
  /** Grind efficiency gain */
  grindGain?: number
  /** Per-substat analysis */
  substats: SubstatAnalysis[]
  /** Tier with level strictness applied */
  adjustedTier: EfficiencyTier
  /** Level strictness malus applied (0-15) */
  levelStrictness: number
  /** Set bonus description */
  setBonus: string
  /** Number of pieces for set bonus */
  setPieces: number
  /** Build archetype synergy analysis */
  synergy?: {
    bestArchetype: string | null
    matchCount: number
    synergyBonus: number
    allArchetypes: { archetype: string; matchCount: number; matchedStats: string[] }[]
  }
}
