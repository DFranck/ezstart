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
// ANCIENT SUBSTAT BASE RANGES (6★)
// ============================================
// Ancient runes have higher BASE stat ranges (+1 min/max) when a substat first appears.
// The subsequent ROLL ranges (+3/+6/+9/+12 upgrades) are IDENTICAL to normal runes.
// Use SUBSTAT_ROLL_RANGES for rolls on both normal and ancient runes.
// Verified in-game 2026-03-27
export const ANCIENT_SUBSTAT_BASE_RANGES: Record<StatType, { min: number; max: number }> = {
  'hp': { min: 160, max: 400 },   // TODO: verify in-game (flats)
  'hp%': { min: 6, max: 10 },
  'atk': { min: 12, max: 22 },    // TODO: verify in-game (flats)
  'atk%': { min: 6, max: 10 },
  'def': { min: 12, max: 22 },    // TODO: verify in-game (flats)
  'def%': { min: 6, max: 10 },
  'spd': { min: 5, max: 7 },
  'cr': { min: 5, max: 7 },
  'cd': { min: 5, max: 9 },
  'res': { min: 6, max: 10 },
  'acc': { min: 6, max: 10 },
}

// ============================================
// ANCIENT LEGEND GRIND RANGES
// ============================================
// +1 on max compared to normal legend grinds
export const ANCIENT_LEGEND_GRIND_RANGES: Partial<Record<StatType, { min: number; max: number }>> = {
  'hp': { min: 100, max: 310 },
  'hp%': { min: 5, max: 8 },
  'atk': { min: 8, max: 15 },
  'atk%': { min: 5, max: 8 },
  'def': { min: 8, max: 15 },
  'def%': { min: 5, max: 8 },
  'spd': { min: 3, max: 6 },
}

// ============================================
// ANCIENT LEGEND GEM VALUES
// ============================================
// Legend gem max values for ancient runes (+1-2 compared to normal)
export const ANCIENT_LEGEND_GEM_VALUES: Record<StatType, number> = {
  'hp': 480,
  'hp%': 11,
  'atk': 24,
  'atk%': 11,
  'def': 24,
  'def%': 11,
  'spd': 8,
  'cr': 8,
  'cd': 9,
  'res': 10,
  'acc': 10,
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
// SET → ARCHETYPE AFFINITY (coherent archetypes per set)
// ============================================
// Used to prioritize archetype recommendations that match the rune's set bonus
export const SET_ARCHETYPE_AFFINITY: Partial<Record<RuneSet, BuildArchetype[]>> = {
  // DPS sets
  fatal: ['speed-dps', 'cleave', 'one-shot-nuker', 'vampire-bruiser'],
  rage: ['speed-dps', 'cleave', 'one-shot-nuker'],
  blade: ['speed-dps', 'cleave', 'one-shot-nuker', 'vampire-bruiser'],

  // Speed/Proc sets
  violent: ['speed-dps', 'bruiser', 'cc-debuffer', 'healer', 'strip-cleanse'],
  swift: ['speed-dps', 'speed-leader', 'cc-debuffer', 'strip-cleanse', 'bomber'],

  // Tank/Support sets
  energy: ['tank-support', 'bruiser', 'healer', 'raid-support'],
  guard: ['tank-support', 'def-nuker', 'raid-support'],
  endure: ['tank-support', 'raid-support', 'strip-cleanse'],
  shield: ['tank-support', 'bruiser'],
  will: ['tank-support', 'bruiser', 'speed-dps', 'strip-cleanse'],

  // CC sets
  despair: ['cc-debuffer', 'bruiser', 'tank-support'],

  // Counter sets
  revenge: ['bruiser', 'revenge-proc', 'tank-support'],
  nemesis: ['bruiser', 'tank-support'],
  destroy: ['bruiser', 'tank-support'],

  // Debuff sets
  focus: ['cc-debuffer', 'bomber', 'strip-cleanse'],
  accuracy: ['cc-debuffer', 'bomber', 'strip-cleanse'],
  tolerance: ['tank-support', 'raid-support'],

  // Misc
  vampire: ['vampire-bruiser', 'bruiser'],
  fight: ['speed-dps', 'cleave'],
  determination: ['tank-support', 'def-nuker'],
  enhance: ['tank-support', 'bruiser'],
  cruel: ['speed-dps', 'cleave', 'one-shot-nuker'],
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

// ============================================
// STAT PRIORITY WEIGHTS PER ARCHETYPE
// ============================================
// Weight per stat per archetype (1.0 = max priority, 0.05 = useless)
export const STAT_PRIORITY_WEIGHTS: Record<BuildArchetype, Record<StatType, number>> = {
  'speed-dps':      { spd: 1.0, cr: 0.9, cd: 0.85, 'atk%': 0.8, 'hp%': 0.4, 'def%': 0.3, acc: 0.3, res: 0.2, atk: 0.3, def: 0.1, hp: 0.1 },
  'bruiser':        { 'hp%': 1.0, cr: 0.85, cd: 0.8, spd: 0.75, 'def%': 0.6, 'atk%': 0.5, res: 0.3, acc: 0.2, hp: 0.2, atk: 0.1, def: 0.1 },
  'tank-support':   { 'hp%': 1.0, 'def%': 0.9, spd: 0.8, res: 0.7, acc: 0.4, cr: 0.1, cd: 0.1, 'atk%': 0.1, hp: 0.3, def: 0.2, atk: 0.05 },
  'cleave':         { 'atk%': 1.0, cr: 0.95, cd: 0.9, spd: 0.7, 'hp%': 0.3, 'def%': 0.2, acc: 0.3, res: 0.1, atk: 0.2, def: 0.05, hp: 0.05 },
  'cc-debuffer':    { spd: 1.0, acc: 0.9, 'hp%': 0.7, 'def%': 0.6, res: 0.3, cr: 0.2, cd: 0.1, 'atk%': 0.1, hp: 0.2, def: 0.1, atk: 0.05 },
  'bomber':         { 'atk%': 1.0, spd: 0.9, acc: 0.8, 'hp%': 0.5, 'def%': 0.3, cr: 0.2, cd: 0.1, res: 0.2, atk: 0.2, hp: 0.1, def: 0.05 },
  'strip-cleanse':  { spd: 1.0, 'hp%': 0.85, acc: 0.8, res: 0.7, 'def%': 0.5, cr: 0.1, cd: 0.1, 'atk%': 0.1, hp: 0.2, def: 0.1, atk: 0.05 },
  'healer':         { spd: 1.0, 'hp%': 0.9, 'def%': 0.7, acc: 0.5, res: 0.4, cr: 0.1, cd: 0.1, 'atk%': 0.3, hp: 0.2, def: 0.1, atk: 0.05 },
  'one-shot-nuker': { 'atk%': 1.0, cr: 0.95, cd: 0.95, spd: 0.5, 'hp%': 0.2, 'def%': 0.1, acc: 0.1, res: 0.05, atk: 0.3, def: 0.05, hp: 0.05 },
  'def-nuker':      { 'def%': 1.0, cr: 0.95, cd: 0.95, spd: 0.5, 'hp%': 0.3, 'atk%': 0.1, acc: 0.1, res: 0.1, def: 0.3, atk: 0.05, hp: 0.1 },
  'vampire-bruiser': { 'atk%': 0.9, cr: 0.85, cd: 0.8, 'hp%': 0.8, spd: 0.5, 'def%': 0.3, acc: 0.1, res: 0.1, atk: 0.2, def: 0.05, hp: 0.1 },
  'revenge-proc':   { 'hp%': 0.9, 'def%': 0.85, cr: 0.7, cd: 0.6, spd: 0.3, res: 0.4, acc: 0.1, 'atk%': 0.1, hp: 0.2, def: 0.2, atk: 0.05 },
  'speed-leader':   { spd: 1.0, 'hp%': 0.8, 'def%': 0.6, res: 0.5, acc: 0.3, cr: 0.1, cd: 0.1, 'atk%': 0.1, hp: 0.2, def: 0.1, atk: 0.05 },
  'raid-support':   { spd: 0.9, 'hp%': 0.9, 'def%': 0.8, res: 0.8, acc: 0.3, cr: 0.1, cd: 0.1, 'atk%': 0.1, hp: 0.2, def: 0.2, atk: 0.05 },
}

// ============================================
// PROGRESSIVE SELL THRESHOLDS
// ============================================
// If weighted efficiency < threshold at this level → sell
export const PROGRESSIVE_SELL_THRESHOLDS: Record<PlayerProfile, Record<number, number>> = {
  early: { 0: 30, 3: 35, 6: 40, 9: 45, 12: 50 },
  mid:   { 0: 40, 3: 45, 6: 50, 9: 55, 12: 60 },
  late:  { 0: 50, 3: 55, 6: 60, 9: 65, 12: 70 },
}

// ============================================
// DEAD STAT COMBINATIONS
// ============================================
// These stat combos together = auto-sell (never on same monster)
export const DEAD_STAT_COMBOS: StatType[][] = [
  ['acc', 'res'],  // ACC + RES together = never on the same monster
]

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

export interface RollBreakdown {
  value: number
  tier: RuneQuality
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
  /** Per-roll breakdown with quality tier for each roll */
  rollBreakdown?: RollBreakdown[]
  /** Whether this substat is the worst for the best archetype (gem target) */
  isGemTarget?: boolean
}

export interface ArchetypeOptimization {
  /** Archetype key (e.g. 'speed-dps', 'bruiser') */
  archetype: string
  /** Number of substats matching the archetype's desired stats (3 or 4) */
  matchCount: number
  /** Gem recommendation: which stat to remove and replace */
  gemTarget?: {
    remove: StatType
    replace: StatType
    reason: string
  }
  /** Stats worth grinding for this archetype */
  grindTargets: StatType[]
  /** Estimated efficiency after optimal gem + grind */
  postOptimScore: number
  /** True if no gem is needed (all substats are desired) */
  isPerfect: boolean
  /** Number of rolls lost when gemming (the gemmed stat's rolls are replaced by 1 gem roll) */
  rollsLost: number
}

export type ProgressiveAction = 'sell' | 'upgrade' | 'keep' | 'grind'

export interface ProgressiveAdvice {
  action: ProgressiveAction
  reason: string
  reasonKey: string
  reasonParams?: Record<string, string>
  nextCheckAt: number
  sellProbability: number
}

export interface RuneAnalysis {
  /** Overall efficiency score (0-100) — Barion raw */
  efficiency: number
  /** Weighted efficiency — stat importance-adjusted score (primary display, used for tier) */
  weightedEfficiency: number
  /** @deprecated Use rollQualityTier + progressiveAdvice instead */
  tier: EfficiencyTier
  /** Projected efficiency at +12 if not yet +12 — undefined if already +12 */
  maxEfficiency?: number
  /** Potential efficiency at +12 (Barion raw) */
  potentialEfficiency?: number
  /** Efficiency after applying legend grinds to all grindable substats */
  grindedEfficiency?: number
  /** Grind efficiency gain */
  grindGain?: number
  /** Per-substat analysis */
  substats: SubstatAnalysis[]
  /** @deprecated Use rollQualityTier + progressiveAdvice instead */
  adjustedTier: EfficiencyTier
  /** Level strictness malus applied (0-15) */
  levelStrictness: number
  /** Roll quality tier based on actual roll quality (Legend/Hero/Rare/Magic/Normal) */
  rollQualityTier: RuneQuality
  /** Roll quality tier after gemming the worst substat */
  rollQualityPostGem: RuneQuality
  /** Exact roll quality percentage (current) */
  rollQualityPercent: number
  /** Exact roll quality percentage (post-gem) */
  rollQualityPostGemPercent: number
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
  /** Progressive upgrade/sell advice based on current level and rolls */
  progressiveAdvice?: ProgressiveAdvice
  /** Per-archetype gem/grind optimization recommendations */
  archetypeOptimizations?: ArchetypeOptimization[]
  /** Set-weighted efficiency — efficiency adjusted by stat tier for this set */
  setWeightedEfficiency?: number
  /** Tier of each substat for this set (S/A/B/C/D) */
  subStatTiers?: Record<string, StatTier>
  /** Innate stat scoring — bonus/malus based on innate tier for this set */
  innateScore?: number
  /** Tier of the innate stat for this set */
  innateTier?: StatTier
  /** Penalty for S/A tier substats with low rolls */
  lowRollPenalty?: number
  /** Penalty for having too many non-grindable substats */
  nonGrindablePenalty?: number
  /** Penalty for non-legend quality */
  qualityPenalty?: number
  /** Penalty for stat-set mismatch (too many low-tier stats for this set) */
  mismatchPenalty?: number
  /** Set strength tier (S/A/B/C) — weaker sets need higher subs to justify */
  setStrength?: string
}

// ============================================
// SET STAT TIER LISTS
// ============================================
// Tier list de stats par set — S=1.0, A=0.8, B=0.5, C=0.2, D=0.0
export type StatTier = 'S' | 'A' | 'B' | 'C' | 'D'

export const SET_STAT_TIERS: Record<string, Record<StatType, StatTier>> = {
  // 4-SETS — tiers spécifiques au rôle du set
  violent: { spd: 'S', cr: 'S', cd: 'A', 'atk%': 'A', 'hp%': 'A', 'def%': 'B', acc: 'B', res: 'C', hp: 'C', atk: 'C', def: 'C' },
  swift:   { spd: 'S', cr: 'A', cd: 'B', 'atk%': 'A', 'hp%': 'A', 'def%': 'A', acc: 'B', res: 'B', hp: 'C', atk: 'C', def: 'C' },
  rage:    { spd: 'A', cr: 'S', cd: 'S', 'atk%': 'S', 'hp%': 'B', 'def%': 'C', acc: 'C', res: 'D', hp: 'D', atk: 'D', def: 'D' },
  fatal:   { spd: 'A', cr: 'S', cd: 'S', 'atk%': 'S', 'hp%': 'B', 'def%': 'C', acc: 'C', res: 'D', hp: 'D', atk: 'D', def: 'D' },
  despair: { spd: 'S', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'A', 'def%': 'A', acc: 'A', res: 'B', hp: 'C', atk: 'C', def: 'C' },
  vampire: { spd: 'A', cr: 'S', cd: 'A', 'atk%': 'S', 'hp%': 'A', 'def%': 'B', acc: 'C', res: 'C', hp: 'C', atk: 'C', def: 'C' },

  // 2-SETS OFFENSIFS — CR/CD/ATK% restent hauts car offset DPS
  blade:   { spd: 'A', cr: 'S', cd: 'S', 'atk%': 'A', 'hp%': 'B', 'def%': 'B', acc: 'C', res: 'C', hp: 'C', atk: 'C', def: 'C' },
  fight:   { spd: 'A', cr: 'A', cd: 'A', 'atk%': 'A', 'hp%': 'A', 'def%': 'A', acc: 'B', res: 'B', hp: 'C', atk: 'C', def: 'C' },

  // 2-SETS UNIVERSELS — Will est LE plus universel, tout est utile
  will:    { spd: 'S', cr: 'A', cd: 'A', 'atk%': 'A', 'hp%': 'S', 'def%': 'A', acc: 'B', res: 'A', hp: 'C', atk: 'C', def: 'C' },
  revenge: { spd: 'S', cr: 'A', cd: 'B', 'atk%': 'A', 'hp%': 'S', 'def%': 'A', acc: 'B', res: 'B', hp: 'B', atk: 'C', def: 'C' },
  nemesis: { spd: 'S', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'S', 'def%': 'A', acc: 'B', res: 'A', hp: 'B', atk: 'C', def: 'C' },
  destroy: { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'A', 'def%': 'A', acc: 'B', res: 'B', hp: 'B', atk: 'C', def: 'C' },

  // 2-SETS DÉFENSIFS — stats offensives en B (pas C, car offset)
  energy:  { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'S', 'def%': 'A', acc: 'B', res: 'A', hp: 'B', atk: 'C', def: 'C' },
  guard:   { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'A', 'def%': 'S', acc: 'B', res: 'A', hp: 'B', atk: 'C', def: 'B' },
  endure:  { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'S', 'def%': 'A', acc: 'B', res: 'S', hp: 'B', atk: 'C', def: 'C' },
  shield:  { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'S', 'def%': 'S', acc: 'B', res: 'B', hp: 'B', atk: 'C', def: 'C' },
  focus:   { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'A', 'def%': 'A', acc: 'S', res: 'B', hp: 'C', atk: 'C', def: 'C' },

  // 2-SETS TEAM — support-oriented, stats offensives en B
  tolerance:     { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'S', 'def%': 'A', acc: 'B', res: 'S', hp: 'B', atk: 'C', def: 'C' },
  accuracy:      { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'A', 'def%': 'A', acc: 'S', res: 'B', hp: 'C', atk: 'C', def: 'C' },
  determination: { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'A', 'def%': 'S', acc: 'B', res: 'A', hp: 'B', atk: 'C', def: 'B' },
  enhance:       { spd: 'A', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'S', 'def%': 'A', acc: 'B', res: 'A', hp: 'B', atk: 'C', def: 'C' },
  seal:          { spd: 'S', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'A', 'def%': 'A', acc: 'S', res: 'B', hp: 'C', atk: 'C', def: 'C' },
  intangible:    { spd: 'S', cr: 'B', cd: 'B', 'atk%': 'B', 'hp%': 'A', 'def%': 'A', acc: 'B', res: 'B', hp: 'C', atk: 'C', def: 'C' },

  // Cruel = hybrid offensif 2-set
  cruel:   { spd: 'A', cr: 'A', cd: 'A', 'atk%': 'S', 'hp%': 'B', 'def%': 'B', acc: 'B', res: 'C', hp: 'C', atk: 'C', def: 'C' },
}

// Tier to weight multiplier
export const TIER_WEIGHTS: Record<StatTier, number> = {
  S: 1.0,
  A: 0.8,
  B: 0.5,
  C: 0.2,
  D: 0.0,
}

// ============================================
// SET STRENGTH — how valuable the set bonus is
// ============================================
// S-tier sets have the best bonuses, C-tier sets need godlike subs to justify
export const SET_STRENGTH: Record<string, 'S' | 'A' | 'B' | 'C' | 'D'> = {
  violent: 'S', swift: 'S', will: 'S',
  despair: 'A', rage: 'A', vampire: 'A', nemesis: 'A',
  fatal: 'B', revenge: 'B', blade: 'B', destroy: 'B', fight: 'B',
  energy: 'C', guard: 'C', focus: 'C', shield: 'C', endure: 'C', determination: 'C', enhance: 'C', seal: 'C', intangible: 'C',
  tolerance: 'D', accuracy: 'D', cruel: 'D',
}

// Threshold bonus by set strength — weaker sets need higher efficiency to be worth keeping
export const SET_STRENGTH_THRESHOLD_BONUS: Record<string, number> = {
  S: 0,   // pas de malus, set top tier
  A: 3,   // seuils +3%
  B: 6,   // seuils +6%
  C: 10,  // seuils +10%
  D: 13,  // seuils +13% — sets artéfact doivent être godlike
}
