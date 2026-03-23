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

// Max number of rolls at +12 by quality
export const MAX_ROLLS_BY_QUALITY: Record<RuneQuality, number> = {
  normal: 4,
  magic: 4,
  rare: 4,
  hero: 4,
  legend: 4,
}

// ============================================
// RUNE ANALYSIS TYPES (computed server-side)
// ============================================

export type EfficiencyTier = 'sell' | 'keep' | 'great' | 'godlike'

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
  /** Overall efficiency score (0-100) */
  efficiency: number
  /** Tier label based on efficiency */
  tier: EfficiencyTier
  /** Projected efficiency at +12 if not yet +12 — undefined if already +12 */
  maxEfficiency?: number
  /** Efficiency after applying legend grinds to all grindable substats */
  grindedEfficiency?: number
  /** Grind efficiency gain */
  grindGain?: number
  /** Per-substat analysis */
  substats: SubstatAnalysis[]
  /** Set bonus description */
  setBonus: string
  /** Number of pieces for set bonus */
  setPieces: number
}
