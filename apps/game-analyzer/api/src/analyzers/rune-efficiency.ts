/**
 * Summoners War Rune Efficiency Calculator (Barion Formula)
 *
 * Calculates rune efficiency based on the community-standard Barion formula
 * with accurate 6★ roll ranges, grind potential, and detailed substat analysis.
 */

import type { StatType, RuneQuality, RuneStat, RuneData } from '@game-analyzer/types'
import {
  EFFICIENCY_THRESHOLDS,
  LEVEL_STRICTNESS,
  SUBSTAT_ROLL_RANGES,
  ANCIENT_SUBSTAT_BASE_RANGES,
  ANCIENT_LEGEND_GRIND_RANGES,
  ANCIENT_LEGEND_GEM_VALUES,
  RUNE_SET_INFO,
  SUBSTATS_BY_QUALITY,
  UPGRADES_BY_QUALITY,
  BUILD_ARCHETYPES,
  SYNERGY_BONUS,
  STAT_PRIORITY_WEIGHTS,
  PROGRESSIVE_SELL_THRESHOLDS,
  DEAD_STAT_COMBOS,
  SET_STAT_TIERS,
  TIER_WEIGHTS,
  SET_STRENGTH,
  SET_STRENGTH_THRESHOLD_BONUS,
  SET_ARCHETYPE_AFFINITY,
  GRINDABLE_STATS,
  GEM_RANGES,
} from '@game-analyzer/types'

// Re-export types for consumers
export type { StatType, RuneQuality, RuneStat, RuneData }

// --- Public types ---

export type EfficiencyTier = 'sell' | 'keep' | 'good' | 'great' | 'godlike'

export type PlayerProfile = 'early' | 'mid' | 'late'

/** @deprecated Use EfficiencyTier instead */
export type Recommendation = EfficiencyTier

export interface RollBreakdown {
  value: number
  tier: RuneQuality
}

export interface SubstatAnalysis {
  type: StatType
  value: number
  rolls: number
  rollQuality: number
  /** Alias for rollQuality — used by the UI layer */
  efficiency: number
  maxValue: number
  minValue: number
  isMaxRoll: boolean
  isGrindable: boolean
  /** Alias for isGrindable — used by the UI layer */
  grindable: boolean
  grindRange?: { min: number; max: number }
  valueAfterMaxGrind?: number
  /** Value after best grind (legend) — alias for UI layer */
  grindedValue?: number
  /** Grind amount added (legend max) — used by UI layer */
  grindAmount?: number
  /** Per-roll breakdown with quality tier for each roll */
  rollBreakdown: RollBreakdown[]
  /** Whether this substat is the worst for the best archetype (gem target) */
  isGemTarget: boolean
}

export interface GrindPotential {
  currentEfficiency: number
  efficiencyAfterGrind: number
  grindGain: number
  substatsToGrind: { type: StatType; currentValue: number; afterGrind: number }[]
}

export interface SynergyResult {
  bestArchetype: BuildArchetype | null
  matchCount: number
  synergyBonus: number
  allArchetypes: { archetype: BuildArchetype; matchCount: number; matchedStats: StatType[] }[]
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

export type BuildArchetype =
  | 'speed-dps' | 'bruiser' | 'cleave' | 'cc-debuffer' | 'tank-support'
  | 'bomber' | 'strip-cleanse' | 'healer' | 'one-shot-nuker'
  | 'vampire-bruiser' | 'revenge-proc' | 'speed-leader' | 'raid-support' | 'def-nuker'

export interface ArchetypeOptimization {
  archetype: BuildArchetype
  matchCount: number
  gemTarget?: {
    remove: StatType
    replace: StatType
    reason: string
  }
  grindTargets: StatType[]
  postOptimScore: number
  isPerfect: boolean
  /** Number of rolls lost when gemming (the gemmed stat's rolls are replaced by 1 gem roll) */
  rollsLost: number
}

export interface RuneAnalysis {
  currentEfficiency: number
  /** Alias for currentEfficiency — used by the UI layer */
  efficiency: number
  /** Weighted efficiency — stat importance-adjusted score (primary display) */
  weightedEfficiency: number
  potentialEfficiency: number
  maxEfficiency: number
  /** Efficiency after applying legend grinds — used by UI layer */
  grindedEfficiency: number
  /** Grind efficiency gain — used by UI layer */
  grindGain: number
  substats: SubstatAnalysis[]
  grindPotential: GrindPotential
  /** @deprecated Use rollQualityTier + progressiveAdvice instead */
  tier: EfficiencyTier
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
  quality: RuneQuality
  totalRolls: number
  /** Set bonus description — used by UI layer */
  setBonus: string
  /** Number of pieces for set bonus — used by UI layer */
  setPieces: number
  /** Build archetype synergy analysis */
  synergy: SynergyResult
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

// Keep legacy exports for backward compat with index.ts
export type SubstatDetail = SubstatAnalysis
export type RuneEfficiencyResult = RuneAnalysis

// --- Constants ---

interface RollRange {
  min: number
  max: number
}

/** Roll ranges per stat type for 6★ runes — SAME for normal and ancient (alias for SUBSTAT_ROLL_RANGES) */
const ROLL_RANGES: Record<StatType, RollRange> = SUBSTAT_ROLL_RANGES

/** Base stat ranges for ancient runes (higher than normal when a substat first appears) */
const ANCIENT_BASE_RANGES: Record<StatType, RollRange> = ANCIENT_SUBSTAT_BASE_RANGES

/** Get the base ranges (initial substat value). Ancient bases are higher. */
function getBaseRanges(isAncient?: boolean): Record<StatType, RollRange> {
  return isAncient ? ANCIENT_BASE_RANGES : ROLL_RANGES
}

/** Get the roll ranges (+3/+6/+9/+12 upgrades). ALWAYS the same for normal and ancient. */
function getRollRanges(): Record<StatType, RollRange> {
  return ROLL_RANGES
}

/** Legend grind ranges (flat and %) — only grindable stats */
const LEGEND_GRIND_RANGES: Partial<Record<StatType, RollRange>> = {
  'hp':   { min: 550, max: 580 },
  'hp%':  { min: 6,   max: 7 },
  'atk':  { min: 28,  max: 30 },
  'atk%': { min: 6,   max: 7 },
  'def':  { min: 28,  max: 30 },
  'def%': { min: 6,   max: 7 },
  'spd':  { min: 4,   max: 5 },
}

/** Get the correct legend grind ranges based on ancient flag */
function getLegendGrindRanges(isAncient?: boolean): Partial<Record<StatType, RollRange>> {
  return isAncient ? ANCIENT_LEGEND_GRIND_RANGES : LEGEND_GRIND_RANGES
}

/** Get the correct legend gem values based on ancient flag */
function getLegendGemValues(isAncient?: boolean): Record<StatType, number> {
  if (isAncient) return ANCIENT_LEGEND_GEM_VALUES
  return Object.fromEntries(
    Object.entries(GEM_RANGES.legend).map(([k, v]) => [k, v.max])
  ) as Record<StatType, number>
}

/** Non-grindable stats */
const NON_GRINDABLE: Set<StatType> = new Set(['cr', 'cd', 'res', 'acc'])

/** Rune set info: pieces required and bonus description (alias for RUNE_SET_INFO) */
const SET_INFO = RUNE_SET_INFO as Record<string, { pieces: number; bonus: string }>

// SET_ARCHETYPE_AFFINITY imported from @game-analyzer/types

// BUILD_ARCHETYPES imported from @game-analyzer/types

// SYNERGY_BONUS imported from @game-analyzer/types

/** Stat weights for weighted efficiency — reflects real SW meta value (fallback) */
const STAT_WEIGHTS: Record<StatType, number> = {
  'spd': 2.0,
  'cr': 1.5,
  'cd': 1.5,
  'atk%': 1.0,
  'hp%': 1.0,
  'def%': 1.0,
  'acc': 0.8,
  'res': 0.8,
  'atk': 0.5,
  'hp': 0.5,
  'def': 0.5,
}

// STAT_PRIORITY_WEIGHTS imported from @game-analyzer/types

// PROGRESSIVE_SELL_THRESHOLDS imported from @game-analyzer/types

// DEAD_STAT_COMBOS imported from @game-analyzer/types

// SET_STAT_TIERS imported from @game-analyzer/types
export type StatTier = 'S' | 'A' | 'B' | 'C' | 'D'

// TIER_WEIGHTS, SET_STRENGTH, SET_STRENGTH_THRESHOLD_BONUS imported from @game-analyzer/types

// SUBSTATS_BY_QUALITY, UPGRADES_BY_QUALITY imported from @game-analyzer/types

/**
 * Total "events" at +12 per quality (Barion divisor).
 * Each event is either an initial substat value or a powerup (+3/+6/+9/+12).
 * Legend: 4 initial + 4 powerups = 8
 * Hero:   3 initial + 4 powerups = 7
 * Rare:   2 initial + 4 powerups = 6
 * Magic:  1 initial + 4 powerups = 5
 * Normal: 0 initial + 4 powerups = 4
 */
const TOTAL_EVENTS_AT_12: Record<RuneQuality, number> = {
  normal: 4,
  magic: 5,
  rare: 6,
  hero: 7,
  legend: 8,
}

// --- Core functions ---

/**
 * Estimate the number of rolls and average quality for a substat.
 *
 * A substat's total value = base (initial appearance) + subsequent rolls.
 * For ancient runes, the base range is higher but roll ranges are identical to normal.
 *
 * count: total events for this substat (1 base + N upgrade rolls)
 * avgQuality: 0% = all events at min, 100% = all events at max
 */
export function estimateRolls(
  statType: StatType,
  value: number,
  isAncient?: boolean,
): { count: number; avgQuality: number } {
  const baseRange = getBaseRanges(isAncient)[statType]
  const rollRange = getRollRanges()[statType]
  if (!baseRange || !rollRange || value <= 0) return { count: 0, avgQuality: 0 }

  // Estimate count: 1 base + N rolls where baseMax + N * rollMax >= value
  // Start with count=1 (just the base), add rolls until maxTotal >= value
  let count = 1
  while (baseRange.max + (count - 1) * rollRange.max < value) {
    count++
  }

  // Max possible = baseMax + (count-1) * rollMax
  const maxTotal = baseRange.max + (count - 1) * rollRange.max
  const avgQuality = maxTotal === 0
    ? 100
    : Math.min(100, Math.max(0, (value / maxTotal) * 100))

  return { count, avgQuality }
}

/**
 * Get the number of substats the rune should have at a given level for a quality.
 * SW rules: upgrades first (existing subs get rolled), new subs added last.
 */
function getExpectedSubstatCount(quality: RuneQuality, level: number): number {
  const base = SUBSTATS_BY_QUALITY[quality]
  const powerups = Math.floor(Math.min(level, 12) / 3)
  // Upgrades go into existing subs first
  const upgrades = Math.min(powerups, base)
  // Remaining powerups add new subs
  const newSubs = powerups - upgrades
  return Math.min(base + newSubs, 4)
}

/**
 * Get the number of upgrade rolls that have occurred at a given level for a quality.
 * SW rules: upgrades first (existing subs get rolled), new subs added last.
 * Only upgrades into existing subs count as rolls.
 */
function getRollCount(quality: RuneQuality, level: number): number {
  const base = SUBSTATS_BY_QUALITY[quality]
  const powerups = Math.floor(Math.min(level, 12) / 3)
  return Math.min(powerups, base)
}

/**
 * Calculate how many upgrade rolls remain before +12 for a given quality.
 */
function remainingRolls(quality: RuneQuality, level: number): number {
  const rollsAt12 = getRollCount(quality, 12)
  const rollsDone = getRollCount(quality, level)
  return Math.max(0, rollsAt12 - rollsDone)
}

/**
 * Detect rune quality from the number of substats at a given level.
 */
function detectQuality(rune: RuneData): RuneQuality {
  if (rune.quality) return rune.quality

  const subCount = rune.subStats.length
  const rollsDone = Math.floor(Math.min(rune.level, 12) / 3)

  // Initial substats = current count - rolls that added new subs
  // Legend: 4 initial, Hero: 3, Rare: 2, Magic: 1, Normal: 0
  const initialSubs = subCount - Math.max(0, rollsDone - Math.max(0, subCount - rollsDone))

  // Simpler heuristic: at +0, subCount = initial subs
  // At higher levels, subs may have been added (if < 4 initial)
  if (rune.level === 0) {
    if (subCount >= 4) return 'legend'
    if (subCount === 3) return 'hero'
    if (subCount === 2) return 'rare'
    if (subCount === 1) return 'magic'
    return 'normal'
  }

  // For leveled runes, estimate based on total subs vs rolls
  // A legend rune at +12 still has 4 subs (all rolls go into existing)
  // A hero rune gets its 4th sub at +3, then 3 more upgrade rolls
  if (subCount >= 4) {
    // Could be legend (4 initial) or hero (3 initial + 1 added at +3)
    // Heuristic: if level >= 3 and we can't tell, assume legend
    if (rune.level < 3) return 'legend'
    // Cannot reliably distinguish at higher levels without more info
    return 'legend'
  }
  if (subCount === 3) return 'hero'
  if (subCount === 2) return 'rare'
  if (subCount === 1) return 'magic'
  return 'normal'
}

/**
 * Compute the per-roll breakdown for a substat.
 * Uses average value per event to qualify each roll's tier.
 * The max reference is the roll max (same for normal and ancient) since
 * most events are rolls; the base being slightly higher on ancient is negligible here.
 */
function getRollBreakdown(statType: StatType, value: number, rollCount: number, _isAncient?: boolean): RollBreakdown[] {
  const range = getRollRanges()[statType]
  if (!range || rollCount <= 0) return []

  const avgPerRoll = value / rollCount
  const quality = avgPerRoll / range.max // 0 to 1

  let tier: RuneQuality
  if (quality >= 0.95) tier = 'legend'
  else if (quality >= 0.75) tier = 'hero'
  else if (quality >= 0.50) tier = 'rare'
  else if (quality >= 0.25) tier = 'magic'
  else tier = 'normal'

  const rolls: RollBreakdown[] = []
  for (let i = 0; i < rollCount; i++) {
    rolls.push({ value: Math.round(avgPerRoll * 10) / 10, tier })
  }
  return rolls
}

/**
 * Analyze a single substat in detail.
 */
function analyzeSubstat(stat: RuneStat, isAncient?: boolean): SubstatAnalysis {
  const baseRange = getBaseRanges(isAncient)[stat.type]
  const rollRange = getRollRanges()[stat.type]
  const grindRanges = getLegendGrindRanges(isAncient)
  const { count, avgQuality } = estimateRolls(stat.type, stat.value, isAncient)

  // maxValue = baseMax + (count-1) * rollMax
  const maxValue = baseRange.max + (count - 1) * rollRange.max
  const minValue = baseRange.min + (count - 1) * rollRange.min
  const isMaxRoll = stat.value >= maxValue

  const isGrindable = !NON_GRINDABLE.has(stat.type)
  const grindRange = grindRanges[stat.type]
  const valueAfterMaxGrind = grindRange ? stat.value + grindRange.max : undefined
  const grindAmount = grindRange ? grindRange.max : undefined
  const roundedQuality = Math.round(avgQuality * 100) / 100

  const rollBreakdown = getRollBreakdown(stat.type, stat.value, count, isAncient)

  return {
    type: stat.type,
    value: stat.value,
    rolls: count,
    rollQuality: roundedQuality,
    efficiency: roundedQuality,
    maxValue,
    minValue,
    isMaxRoll,
    isGrindable,
    grindable: isGrindable,
    grindRange: grindRange ? { min: grindRange.min, max: grindRange.max } : undefined,
    valueAfterMaxGrind,
    grindedValue: valueAfterMaxGrind,
    grindAmount,
    rollBreakdown,
    isGemTarget: false, // Set later in analyzeRune based on archetype
  }
}

/**
 * Calculate Barion efficiency.
 * For each substat with `count` events: maxPossible = baseMax + (count-1) * rollMax.
 * Each perfect event contributes 1.0 to rawSum, so we add `(value / maxPossible) * count`.
 * efficiency = rawSum / totalEvents * 100.
 *
 * A perfect Legend 6★ +12 rune = 8/8 = 100%.
 * Innate stat is NOT counted.
 */
function barionEfficiency(substats: RuneStat[], quality: RuneQuality, isAncient?: boolean): number {
  const baseRanges = getBaseRanges(isAncient)
  const rollRanges = getRollRanges()
  let rawSum = 0
  for (const sub of substats) {
    const baseRange = baseRanges[sub.type]
    const rollRange = rollRanges[sub.type]
    if (!baseRange || !rollRange || sub.value <= 0) continue
    const { count } = estimateRolls(sub.type, sub.value, isAncient)
    const maxPossible = baseRange.max + (count - 1) * rollRange.max
    // Each event at max contributes 1.0, so count events at quality ratio
    rawSum += maxPossible > 0 ? (sub.value / maxPossible) * count : 0
  }
  const divisor = TOTAL_EVENTS_AT_12[quality]
  if (divisor <= 0) return 0
  return (rawSum / divisor) * 100
}

/**
 * Calculate weighted efficiency using stat importance weights.
 * When a bestArchetype is provided, uses archetype-specific priority weights
 * for more accurate scoring. Falls back to generic STAT_WEIGHTS otherwise.
 *
 * Same Barion structure but each ratio is multiplied by the stat weight.
 * Normalised so that a perfect Legend rune with top-4 stats = 100%.
 *
 * Perfect Legend +12: 4 stats × 2 rolls each = 8 ratios (all 1.0).
 * Best top-4 weights: spd(2.0) + cr(1.5) + cd(1.5) + atk%(1.0).
 * Each stat gets 2 max rolls → weightedSum = 2*2.0 + 2*1.5 + 2*1.5 + 2*1.0 = 12.
 * Divisor for Legend = 12, for other qualities we scale proportionally.
 */
function weightedEfficiency(substats: RuneStat[], quality: RuneQuality, bestArchetype?: BuildArchetype | null, isAncient?: boolean): number {
  if (substats.length === 0) return 0

  const baseRanges = getBaseRanges(isAncient)
  const rollRanges = getRollRanges()

  // Use archetype-specific weights if available, otherwise fallback
  const weights = bestArchetype ? STAT_PRIORITY_WEIGHTS[bestArchetype] : STAT_WEIGHTS

  let weightedSum = 0
  for (const sub of substats) {
    const baseRange = baseRanges[sub.type]
    const rollRange = rollRanges[sub.type]
    if (!baseRange || !rollRange || sub.value <= 0) continue
    const { count } = estimateRolls(sub.type, sub.value, isAncient)
    const maxPossible = baseRange.max + (count - 1) * rollRange.max
    // Each event contributes ratio * 1.0, so multiply by count
    const eventRatios = maxPossible > 0 ? (sub.value / maxPossible) * count : 0
    weightedSum += eventRatios * (weights[sub.type] ?? 0.5)
  }

  // Max weighted divisor: for archetype weights, the max weight is 1.0 (not 2.0),
  // so we compute the top-4 average weight for proper normalisation.
  let avgTopWeight: number
  if (bestArchetype) {
    const archetypeWeights = Object.values(STAT_PRIORITY_WEIGHTS[bestArchetype])
    const sorted = [...archetypeWeights].sort((a, b) => b - a)
    const top4 = sorted.slice(0, 4)
    avgTopWeight = top4.reduce((s, w) => s + w, 0) / top4.length
  } else {
    avgTopWeight = 1.5
  }

  const maxWeightedDivisor = TOTAL_EVENTS_AT_12[quality] * avgTopWeight
  if (maxWeightedDivisor <= 0) return 0

  return (weightedSum / maxWeightedDivisor) * 100
}

/**
 * Calculate set-weighted efficiency.
 * Uses the set's stat tier list to weight each substat's contribution.
 * Grindable stats get a +20% bonus (they gain more value post-upgrade).
 * Quad-roll bonus: if a stat has 3+ rolls AND is S or A tier for this set → +0.5 bonus.
 */
interface SetWeightedBreakdownItem {
  type: string
  value: number
  rolls: number
  maxPossible: number
  ratio: number
  tier: StatTier
  tierWeight: number
  grindBonus: number
  contribution: number
}

function setWeightedEfficiency(
  subStats: RuneStat[],
  set: string,
  quality: RuneQuality,
  isAncient?: boolean,
): { efficiency: number; tiers: Record<string, StatTier>; breakdown: SetWeightedBreakdownItem[]; maxDivisor: number } {
  const baseRanges = getBaseRanges(isAncient)
  const rollRanges = getRollRanges()
  const setTiers: Record<StatType, StatTier> = SET_STAT_TIERS[set] ?? SET_STAT_TIERS.violent!
  const tiers: Record<string, StatTier> = {}
  const breakdown: SetWeightedBreakdownItem[] = []

  let weightedSum = 0
  for (const sub of subStats) {
    const baseRange = baseRanges[sub.type]
    const rollRange = rollRanges[sub.type]
    if (!baseRange || !rollRange || sub.value <= 0) continue

    const { count } = estimateRolls(sub.type, sub.value, isAncient)
    const maxPoss = baseRange.max + (count - 1) * rollRange.max
    const ratio = maxPoss > 0 ? (sub.value / maxPoss) * count : 0
    const tier: StatTier = setTiers[sub.type] ?? 'C'
    const tierWeight = TIER_WEIGHTS[tier]
    tiers[sub.type] = tier

    const grindBonus = !NON_GRINDABLE.has(sub.type) ? 1.2 : 1.0
    const contribution = ratio * tierWeight * grindBonus

    weightedSum += contribution
    breakdown.push({
      type: sub.type,
      value: sub.value,
      rolls: count,
      maxPossible: maxPoss,
      ratio: Math.round(ratio * 100) / 100,
      tier,
      tierWeight,
      grindBonus,
      contribution: Math.round(contribution * 100) / 100,
    })
  }

  // Quad roll bonus: 3+ rolls in S or A tier stat
  for (const sub of subStats) {
    const { count } = estimateRolls(sub.type, sub.value, isAncient)
    const tier: StatTier = setTiers[sub.type] ?? 'C'
    if (count >= 3 && (tier === 'S' || tier === 'A')) {
      weightedSum += 0.5
    }
  }

  // Normalise: max possible = all events at S tier + grindable bonus
  const maxDivisor = TOTAL_EVENTS_AT_12[quality] * 1.0 * 1.2
  const efficiency = maxDivisor > 0 ? (weightedSum / maxDivisor) * 100 : 0

  return { efficiency: Math.round(Math.min(efficiency, 100) * 100) / 100, tiers, breakdown, maxDivisor: Math.round(maxDivisor * 100) / 100 }
}

/**
 * Calculate innate stat score based on its tier for the rune's set.
 *
 * Philosophy: the best innates are stats that are useful (B/C tier) but NOT
 * the top-priority stats (S/A tier) for the set. S/A stats should be in
 * substats where they are grindable/rollable.
 *
 * - S tier innate = heavy malus (-15) — this stat should be a grindable substat
 * - A tier innate = malus (-10) — still a stat you'd want grindable
 * - B tier innate = neutral (0) — useful stat, good innate slot
 * - C tier innate = small bonus (+5) — frees substat slots for S/A stats
 * - D tier innate = malus (-5) — dead stat, wasted slot
 * - No innate = 0
 */
function calculateInnateScore(
  innateStat: RuneStat | undefined,
  set: string,
): { score: number; tier: StatTier | undefined } {
  if (!innateStat) return { score: 0, tier: undefined }

  const setTiers: Record<StatType, StatTier> = SET_STAT_TIERS[set] ?? SET_STAT_TIERS.violent!
  const tier: StatTier = setTiers[innateStat.type] ?? 'C'

  const INNATE_SCORE_BY_TIER: Record<StatTier, number> = {
    S: -20,
    A: -12,
    B: 0,
    C: 5,
    D: -5,
  }

  return { score: INNATE_SCORE_BY_TIER[tier], tier }
}

/**
 * Calculate penalty for S/A tier substats with minimum or near-minimum rolls.
 *
 * High-priority stats with low rolls are a waste — a SPD +4 is barely useful.
 * - S-tier stat at min roll → -8
 * - A-tier stat at min roll → -5
 * "Min roll" = value <= (rolls * min_roll_value) + 1
 */
function calculateLowRollPenalty(
  subStats: RuneStat[],
  set: string,
  isAncient?: boolean,
): number {
  const baseRanges = getBaseRanges(isAncient)
  const rollRanges = getRollRanges()
  const setTiers: Record<StatType, StatTier> = SET_STAT_TIERS[set] ?? SET_STAT_TIERS.violent!
  let penalty = 0

  for (const sub of subStats) {
    const tier = setTiers[sub.type] ?? 'C'
    if (tier !== 'S' && tier !== 'A') continue

    const baseRange = baseRanges[sub.type]
    const rollRange = rollRanges[sub.type]
    if (!baseRange || !rollRange || sub.value <= 0) continue

    const { count } = estimateRolls(sub.type, sub.value, isAncient)
    if (count <= 0) continue

    // "Low roll" = average value per roll is barely above the minimum
    const avgPerRoll = sub.value / count
    if (avgPerRoll <= rollRange.min + 0.5) {
      penalty += tier === 'S' ? -8 : -5
    }
  }

  return penalty
}

/**
 * Calculate penalty for having too many non-grindable substats (cr, cd, acc, res).
 *
 * Non-grindable stats can't be improved after +12, so a rune full of them
 * has limited post-upgrade potential:
 * - 0-1 non-grindable = 0 (normal)
 * - 2 non-grindable = -5
 * - 3 non-grindable = -10
 * - 4 non-grindable = -15 (impossible to grind anything)
 */
function calculateNonGrindablePenalty(subStats: RuneStat[]): number {
  if (subStats.length < 4) return 0
  const nonGrindableCount = subStats.filter(s => NON_GRINDABLE.has(s.type)).length

  if (nonGrindableCount <= 1) return 0
  if (nonGrindableCount === 2) return -5
  if (nonGrindableCount === 3) return -10
  return -15 // 4 non-grindable
}

/**
 * Calculate quality penalty — non-legend runes are inherently less valuable
 * because they have fewer initial substats / total events.
 * Legend: 0, Hero: -5, Rare: -10, Magic: -15, Normal: -20
 */
function calculateQualityPenalty(quality: RuneQuality): number {
  const penalties: Record<RuneQuality, number> = {
    legend: 0,
    hero: -5,
    rare: -10,
    magic: -15,
    normal: -20,
  }
  return penalties[quality] ?? 0
}

/**
 * Calculate stat-set mismatch penalty.
 * Counts how many substats are B-tier or worse for the set.
 * - 3+ substats <= B-tier → -8
 * - ALL substats <= B-tier → -12
 */
function calculateMismatchPenalty(subStats: RuneStat[], set: string): number {
  const setTiers = SET_STAT_TIERS[set] ?? SET_STAT_TIERS.violent!
  let lowTierCount = 0
  for (const sub of subStats) {
    const tier = setTiers[sub.type] ?? 'C'
    if (tier === 'B' || tier === 'C' || tier === 'D') lowTierCount++
  }
  if (lowTierCount >= subStats.length && subStats.length > 0) return -12 // ALL stats mismatch
  if (lowTierCount >= 3) return -8
  return 0
}

/**
 * Calculate potential efficiency at +12 (remaining events at max).
 * remaining_events = TOTAL_EVENTS_AT_12[quality] - events_so_far
 * potential = (current_sum + remaining_events * 1.0) / TOTAL_EVENTS_AT_12[quality] * 100
 *
 * If the rune is already +12 or higher, potential = current (no events left).
 */
export function calculatePotentialEfficiency(rune: RuneData, qualityOverride?: RuneQuality): number {
  const quality = qualityOverride ?? detectQuality(rune)
  const baseRanges = getBaseRanges(rune.isAncient)
  const rollRanges = getRollRanges()
  const totalEvents = TOTAL_EVENTS_AT_12[quality]
  if (totalEvents <= 0) return 0

  let rawSum = 0
  for (const sub of rune.subStats) {
    const baseRange = baseRanges[sub.type]
    const rollRange = rollRanges[sub.type]
    if (!baseRange || !rollRange || sub.value <= 0) continue
    const { count } = estimateRolls(sub.type, sub.value, rune.isAncient)
    const maxPossible = baseRange.max + (count - 1) * rollRange.max
    rawSum += maxPossible > 0 ? (sub.value / maxPossible) * count : 0
  }

  // Events so far = initial subs + powerups that occurred
  const powerups = Math.floor(Math.min(rune.level, 12) / 3)
  const eventsSoFar = SUBSTATS_BY_QUALITY[quality] + powerups
  const remainingEvents = Math.max(0, totalEvents - eventsSoFar)

  // Each remaining event at max adds 1.0 to rawSum
  const potentialSum = rawSum + remainingEvents * 1.0
  const result = (potentialSum / totalEvents) * 100

  return result
}

/**
 * Calculate grind potential — efficiency gain from legend grinds on all grindable substats.
 * The grind bonus is computed as the raw sum delta from grinds, expressed in Barion %.
 * This bonus can be added to any base efficiency (current or potential).
 */
function calculateGrindPotential(
  substats: SubstatAnalysis[],
  baseEfficiency: number,
  quality: RuneQuality,
  isAncient?: boolean,
): GrindPotential {
  const baseRanges = getBaseRanges(isAncient)
  const rollRanges = getRollRanges()
  const substatsToGrind: GrindPotential['substatsToGrind'] = []
  let grindedRawSum = 0
  let currentRawSum = 0
  const divisor = TOTAL_EVENTS_AT_12[quality]

  for (const sub of substats) {
    const baseRange = baseRanges[sub.type]
    const rollRange = rollRanges[sub.type]
    if (!baseRange || !rollRange) continue

    const maxPossible = baseRange.max + (sub.rolls - 1) * rollRange.max
    // Each event contributes ratio * 1.0
    const eventRatios = maxPossible > 0 ? (sub.value / maxPossible) * sub.rolls : 0
    currentRawSum += eventRatios

    if (sub.isGrindable && sub.grindRange) {
      const afterGrind = sub.value + sub.grindRange.max
      substatsToGrind.push({
        type: sub.type,
        currentValue: sub.value,
        afterGrind,
      })
      grindedRawSum += maxPossible > 0 ? (afterGrind / maxPossible) * sub.rolls : 0
    } else {
      grindedRawSum += eventRatios
    }
  }

  // Grind bonus in Barion % points
  const grindBonusRaw = grindedRawSum - currentRawSum
  const grindBonusPercent = divisor > 0 ? (grindBonusRaw / divisor) * 100 : 0
  const efficiencyAfterGrind = baseEfficiency + grindBonusPercent

  return {
    currentEfficiency: baseEfficiency,
    efficiencyAfterGrind: Math.round(efficiencyAfterGrind * 100) / 100,
    grindGain: Math.round(grindBonusPercent * 100) / 100,
    substatsToGrind,
  }
}

/**
 * Calculate build archetype synergy for a rune's substats.
 * Counts how many substats match each archetype's desired stats,
 * then evaluates rolls in non-matching stats to determine gem potential.
 *
 * The innate stat is included in archetype matching (it's on the rune)
 * but excluded from roll-based gem evaluation (innate has 0 upgrade rolls).
 *
 * @param subStats - The rune's substats
 * @param innateStat - Optional innate stat (included in matching, not in roll eval)
 * @param rollEstimates - Optional pre-computed roll counts per stat type.
 *                        If not provided, estimateRolls() is used.
 */
export function calculateSynergy(
  subStats: RuneStat[],
  innateStat?: RuneStat,
  rollEstimates?: Map<StatType, number>,
): SynergyResult {
  // Combine substats + innate for archetype matching
  const allStats = [...subStats]
  if (innateStat) allStats.push(innateStat)

  const archetypeKeys = Object.keys(BUILD_ARCHETYPES) as BuildArchetype[]

  const allArchetypes = archetypeKeys.map(archetype => {
    const desired = BUILD_ARCHETYPES[archetype].desiredStats
    const matchedStats: StatType[] = []
    const unmatchedStats: RuneStat[] = []

    for (const stat of allStats) {
      if (desired.includes(stat.type)) {
        matchedStats.push(stat.type)
      } else {
        unmatchedStats.push(stat)
      }
    }

    return { archetype, matchCount: matchedStats.length, matchedStats, unmatchedStats }
  })

  // Sort by matchCount descending
  allArchetypes.sort((a, b) => b.matchCount - a.matchCount)

  const best = allArchetypes[0]
  const bestMatchCount = best?.matchCount ?? 0
  const unmatchedStats = best?.unmatchedStats ?? []

  // Count rolls in unmatched stats (exclude innate — it has 0 upgrade rolls)
  const unmatchedSubsOnly = unmatchedStats.filter(sub =>
    !innateStat || sub.type !== innateStat.type || sub.value !== innateStat.value,
  )
  const unmatchedRolls = unmatchedSubsOnly.map(sub => {
    if (rollEstimates) {
      return rollEstimates.get(sub.type) ?? 0
    }
    return estimateRolls(sub.type, sub.value).count
  })

  let synergyBonus: number
  if (bestMatchCount >= 4) {
    synergyBonus = SYNERGY_BONUS.PERFECT_4
  } else if (bestMatchCount === 3) {
    // 1 unmatched stat — check its rolls
    const rollsInBad = unmatchedRolls[0] ?? 0
    synergyBonus = rollsInBad <= 1
      ? SYNERGY_BONUS.THREE_NO_ROLL
      : SYNERGY_BONUS.THREE_WITH_ROLLS
  } else if (bestMatchCount === 2) {
    // 2 unmatched stats — check if all have low rolls
    const allLowRolls = unmatchedRolls.every(r => r <= 1)
    synergyBonus = allLowRolls
      ? SYNERGY_BONUS.TWO_NO_ROLLS
      : SYNERGY_BONUS.TWO_WITH_ROLLS
  } else {
    synergyBonus = SYNERGY_BONUS.INCOHERENT
  }

  // Strip unmatchedStats from allArchetypes for the public API
  const publicArchetypes = allArchetypes.map(({ archetype, matchCount, matchedStats }) => ({
    archetype, matchCount, matchedStats,
  }))

  return {
    bestArchetype: bestMatchCount >= 2 ? (best?.archetype ?? null) : null,
    matchCount: bestMatchCount,
    synergyBonus,
    allArchetypes: publicArchetypes,
  }
}

/**
 * Get recommendation based on efficiency, profile thresholds, and level strictness.
 * The grind potential can save a rune (max +5% bonus).
 */
export function getRecommendation(
  efficiency: number,
  level: number,
  profile: PlayerProfile = 'mid',
  grindPotential?: number,
  synergyBonus?: number,
): EfficiencyTier {
  const thresholds = EFFICIENCY_THRESHOLDS[profile]

  // Strictness malus by level — round down to nearest 0,3,6,9,12
  const levelKey = Math.min(Math.floor(level / 3) * 3, 12)
  const strictness = LEVEL_STRICTNESS[levelKey] ?? 0

  // Grind potential bonus (max +5%)
  const grindBonus = grindPotential ? Math.min(grindPotential * 0.3, 5) : 0
  // Synergy bonus (can be negative for penalty)
  const synBonus = synergyBonus ?? 0
  const finalEfficiency = efficiency + grindBonus + synBonus

  const adjustedThreshold = (threshold: number) => threshold + strictness

  if (finalEfficiency >= adjustedThreshold(thresholds.godlike)) return 'godlike'
  if (finalEfficiency >= adjustedThreshold(thresholds.great)) return 'great'
  if (finalEfficiency >= adjustedThreshold(thresholds.good)) return 'good'
  if (finalEfficiency >= adjustedThreshold(thresholds.keep)) return 'keep'
  return 'sell'
}

/**
 * Check if the rune has a dead stat combination (e.g. ACC + RES together).
 */
function hasDeadStatCombo(substats: RuneStat[]): boolean {
  const statTypes = new Set(substats.map(s => s.type))
  for (const combo of DEAD_STAT_COMBOS) {
    if (combo.every(s => statTypes.has(s))) return true
  }
  return false
}

/**
 * Calculate progressive upgrade/sell advice based on current level, rolls,
 * archetype fit, dead stats, and player profile thresholds.
 */
function calculateProgressiveAdvice(
  rune: RuneData,
  quality: RuneQuality,
  currentWeightedEff: number,
  potentialEff: number,
  synergy: SynergyResult,
  profile: PlayerProfile,
  innateScore: number = 0,
  setStrengthBonus: number = 0,
): ProgressiveAdvice | undefined {
  const level = rune.level
  const levelKey = Math.min(Math.floor(level / 3) * 3, 12)

  // Dead stat combo = instant sell
  if (hasDeadStatCombo(rune.subStats)) {
    return {
      action: 'sell',
      reason: 'Dead stat combo detected (ACC + RES) — no monster needs both',
      reasonKey: 'deadStatCombo',
      nextCheckAt: 0,
      sellProbability: 95,
    }
  }

  const thresholds = PROGRESSIVE_SELL_THRESHOLDS[profile]
  // Set strength bonus raises thresholds — weaker sets need better subs to justify
  const threshold = (thresholds[levelKey] ?? thresholds[12] ?? 50) + setStrengthBonus
  const finalThreshold = (thresholds[12] ?? 50) + setStrengthBonus

  // Innate score adjusts the effective weighted efficiency
  // A bad innate (S-tier stat wasted in innate slot) penalizes the rune
  const innateAdjustedEff = currentWeightedEff + innateScore

  // Archetype synergy no longer influences progressive advice — set-based only
  const adjustedPotential = potentialEff + innateScore

  // At +12 or +15 — final decision (no more potential, only current matters)
  if (level >= 12) {
    if (innateAdjustedEff < threshold) {
      return {
        action: 'sell',
        reason: `Weighted efficiency ${Math.round(currentWeightedEff)}% below ${profile} threshold ${threshold}%`,
        reasonKey: 'belowThresholdFinal',
        reasonParams: { current: String(Math.round(currentWeightedEff)), profile, threshold: String(threshold) },
        nextCheckAt: 0,
        sellProbability: 90,
      }
    }

    // Check if grindable
    const hasGrindable = rune.subStats.some(s => !NON_GRINDABLE.has(s.type))
    if (hasGrindable && innateAdjustedEff >= threshold) {
      return {
        action: 'grind',
        reason: `Good rune at +12 — grind to maximize value (${Math.round(currentWeightedEff)}%)`,
        reasonKey: 'grindToMaximize',
        reasonParams: { current: String(Math.round(currentWeightedEff)) },
        nextCheckAt: 0,
        sellProbability: 0,
      }
    }

    return {
      action: 'keep',
      reason: `Solid rune at +12 — ${Math.round(currentWeightedEff)}% weighted efficiency`,
      reasonKey: 'solidRune',
      reasonParams: { current: String(Math.round(currentWeightedEff)) },
      nextCheckAt: 0,
      sellProbability: 0,
    }
  }

  // Pre-+12: potential exceeds final threshold → worth upgrading even if current is low
  if (adjustedPotential >= finalThreshold) {
    if (innateAdjustedEff >= threshold) {
      // Current OK + high potential → keep upgrading
      const nextLevel = Math.min(levelKey + 3, 12)
      return {
        action: 'upgrade',
        reason: `On track — upgrade to +${nextLevel} (${Math.round(currentWeightedEff)}% current, ${Math.round(adjustedPotential)}% potential)`,
        reasonKey: 'onTrackUpgrade',
        reasonParams: { nextLevel: String(nextLevel), current: String(Math.round(currentWeightedEff)), potential: String(Math.round(adjustedPotential)) },
        nextCheckAt: nextLevel,
        sellProbability: 15,
      }
    }
    // Current below threshold but potential is promising → upgrade anyway
    const nextLevel = Math.min(levelKey + 3, 12)
    return {
      action: 'upgrade',
      reason: `Current ${Math.round(currentWeightedEff)}% below +${levelKey} threshold but potential ${Math.round(adjustedPotential)}% is promising — worth upgrading`,
      reasonKey: 'belowButPromising',
      reasonParams: { current: String(Math.round(currentWeightedEff)), level: String(levelKey), potential: String(Math.round(adjustedPotential)) },
      nextCheckAt: nextLevel,
      sellProbability: 35,
    }
  }

  // Potential also below final threshold → sell
  if (innateAdjustedEff < threshold) {
    return {
      action: 'sell',
      reason: `Below threshold and potential ${Math.round(adjustedPotential)}% too low for ${profile} (need ${finalThreshold}%)`,
      reasonKey: 'potentialTooLow',
      reasonParams: { potential: String(Math.round(adjustedPotential)), profile, threshold: String(finalThreshold) },
      nextCheckAt: 0,
      sellProbability: 85,
    }
  }

  // Current OK but potential mediocre — upgrade cautiously
  const nextLevel = Math.min(levelKey + 3, 12)
  const nextThreshold = thresholds[nextLevel] ?? thresholds[12] ?? 60

  // Sell probability: based on gap between potential and final threshold
  let sellProbability = Math.min(70, Math.max(20, Math.round((1 - adjustedPotential / finalThreshold) * 100)))

  // Bad innate (S/A tier wasted) increases sell probability
  if (innateScore < 0) {
    sellProbability = Math.min(95, sellProbability + Math.abs(innateScore))
  }

  return {
    action: 'upgrade',
    reason: `On track — upgrade to +${nextLevel} and re-evaluate (${Math.round(currentWeightedEff)}% vs ${nextThreshold}% needed)`,
    reasonKey: 'upgradeAndReeval',
    reasonParams: { nextLevel: String(nextLevel), current: String(Math.round(currentWeightedEff)), threshold: String(nextThreshold) },
    nextCheckAt: nextLevel,
    sellProbability,
  }
}

/**
 * Convert a roll quality percentage to a tier label.
 * Based on how well the actual rolls landed relative to max:
 * - Legend: >= 90% (near-perfect rolls)
 * - Hero:  >= 75% (hero-quality rolls)
 * - Rare:  >= 50% (decent rolls)
 * - Magic: >= 25% (low rolls)
 * - Normal: < 25%
 */
function tierFromPercent(pct: number): RuneQuality {
  if (pct >= 90) return 'legend'
  if (pct >= 75) return 'hero'
  if (pct >= 50) return 'rare'
  if (pct >= 25) return 'magic'
  return 'normal'
}

/**
 * Calculate roll quality based on ACTUAL rolls that have occurred.
 * Unlike Barion efficiency (which divides by total events at +12),
 * this only evaluates the rolls that already happened.
 *
 * Returns both current tier and post-gem tier (excluding worst substat).
 */
export function getRollQualityTier(
  substats: SubstatAnalysis[],
  isAncient?: boolean,
): { current: RuneQuality; postGem: RuneQuality; currentPercent: number; postGemPercent: number } {
  if (substats.length === 0) {
    return { current: 'normal', postGem: 'normal', currentPercent: 0, postGemPercent: 0 }
  }

  const baseRanges = getBaseRanges(isAncient)
  const rollRanges = getRollRanges()
  let totalRatio = 0
  let worstRatio = Infinity

  for (const sub of substats) {
    const baseRange = baseRanges[sub.type]
    const rollRange = rollRanges[sub.type]
    if (!baseRange || !rollRange || sub.rolls <= 0) continue
    const maxPossible = baseRange.max + (sub.rolls - 1) * rollRange.max
    // For roll quality, we want the quality ratio (0-1), not scaled by events
    const ratio = maxPossible > 0 ? sub.value / maxPossible : 0
    totalRatio += ratio

    if (ratio < worstRatio) {
      worstRatio = ratio
    }
  }

  const count = substats.length
  const currentAvg = (totalRatio / count) * 100
  const currentPercent = Math.round(currentAvg * 10) / 10

  // Post-gem: remove worst substat from average (it would be gemmed)
  let postGemPercent = currentPercent
  if (count > 1 && worstRatio < Infinity) {
    const postGemAvg = ((totalRatio - worstRatio) / (count - 1)) * 100
    postGemPercent = Math.round(postGemAvg * 10) / 10
  }

  return {
    current: tierFromPercent(currentPercent),
    postGem: tierFromPercent(postGemPercent),
    currentPercent,
    postGemPercent,
  }
}

/** Legend gem max values per stat type for normal runes (derived from GEM_RANGES.legend) */
const LEGEND_GEM_VALUES: Record<StatType, number> = Object.fromEntries(
  Object.entries(GEM_RANGES.legend).map(([k, v]) => [k, v.max])
) as Record<StatType, number>

// GRINDABLE_STATS imported from @game-analyzer/types

/** Gem removal score — lower = better candidate to gem away */
function gemRemoveScore(stat: RuneStat, setTiers: Record<StatType, StatTier>, isAncient?: boolean): number {
  const tierW = TIER_WEIGHTS[setTiers[stat.type] ?? 'C']
  const grindable = !NON_GRINDABLE.has(stat.type)
  const { count } = estimateRolls(stat.type, stat.value, isAncient)
  // Powerup rolls (count-1) add massive protection — NEVER gem a stat with good rolls
  const powerupRolls = Math.max(0, count - 1)
  return tierW + (grindable ? 0.3 : 0) + (powerupRolls * 0.4)
}

/** Gem replacement score — higher = better stat to gem towards */
function gemReplaceScore(statType: StatType, setTiers: Record<StatType, StatTier>): number {
  const tierW = TIER_WEIGHTS[setTiers[statType] ?? 'C']
  const grindable = !NON_GRINDABLE.has(statType)
  // Flat stats (hp, atk, def) are almost always bad replacements — heavy penalty
  const FLAT_STATS: StatType[] = ['hp', 'atk', 'def']
  const flatPenalty = FLAT_STATS.includes(statType) ? -0.5 : 0
  return tierW + (grindable ? 0.3 : 0) + flatPenalty
}

/** Threshold: only suggest gem if worst stat score < 0.7 (all stats are decent otherwise) */
const GEM_SCORE_THRESHOLD = 1.2

/**
 * Calculate per-archetype gem/grind optimization recommendations.
 * Gem target is now set-based (same remove/replace for all archetypes),
 * but postOptimScore still depends on archetype-specific grind weights.
 */
function calculateArchetypeOptimizations(
  rune: RuneData,
  synergy: SynergyResult,
  quality: RuneQuality,
  isAncient?: boolean,
): ArchetypeOptimization[] {
  const optimizations: ArchetypeOptimization[] = []

  const matchingArchetypes = synergy.allArchetypes.filter(a => a.matchCount >= 3)
  if (matchingArchetypes.length === 0) return optimizations

  // --- Set-based gem target (same for all archetypes) ---
  const setTiers: Record<StatType, StatTier> = SET_STAT_TIERS[rune.set] ?? SET_STAT_TIERS.violent!

  // Score each substat for removal (lowest score = best candidate to gem away)
  const scoredSubs = rune.subStats.map(s => ({
    stat: s,
    score: gemRemoveScore(s, setTiers, isAncient),
  })).sort((a, b) => a.score - b.score)

  const worstSub = scoredSubs[0]

  // Compute gem target once (shared across archetypes)
  let sharedGemTarget: ArchetypeOptimization['gemTarget'] | undefined

  if (worstSub && worstSub.score < GEM_SCORE_THRESHOLD) {
    // Find best replacement: highest gemReplaceScore among stats not already on the rune
    const existingTypes = new Set(rune.subStats.map(s => s.type))
    if (rune.innateStat?.type) existingTypes.add(rune.innateStat.type)
    if (rune.mainStat?.type) existingTypes.add(rune.mainStat.type)

    const ALL_STAT_TYPES: StatType[] = [
      'hp', 'hp%', 'atk', 'atk%', 'def', 'def%', 'spd', 'cr', 'cd', 'acc', 'res',
    ]
    const candidates = ALL_STAT_TYPES
      .filter(t => !existingTypes.has(t))
      .map(t => ({ type: t, score: gemReplaceScore(t, setTiers) }))
      .sort((a, b) => b.score - a.score)

    const bestReplacement = candidates[0]
    if (bestReplacement && bestReplacement.score > 0) {
      // Check if re-gemming the same stat is better (reset base to legend gem value)
      const currentRemoveScore = gemReplaceScore(worstSub.stat.type, setTiers)
      if (currentRemoveScore >= bestReplacement.score) {
        // Re-gem same stat — legend gem value > current base roll
        sharedGemTarget = {
          remove: worstSub.stat.type,
          replace: worstSub.stat.type,
          reason: `Re-gem ${worstSub.stat.type} for higher legend base value`,
        }
      } else {
        sharedGemTarget = {
          remove: worstSub.stat.type,
          replace: bestReplacement.type,
          reason: `Low set synergy (${setTiers[worstSub.stat.type] ?? 'C'}-tier for ${rune.set})`,
        }
      }
    } else {
      // No good replacement — re-gem same stat for better base
      sharedGemTarget = {
        remove: worstSub.stat.type,
        replace: worstSub.stat.type,
        reason: `Re-gem ${worstSub.stat.type} for higher legend base value`,
      }
    }
  }

  for (const match of matchingArchetypes) {
    const archetype = match.archetype
    const weights = STAT_PRIORITY_WEIGHTS[archetype]

    const gemTarget = sharedGemTarget
    const isPerfect = !gemTarget

    // Grind targets = grindable substats with decent weight for this archetype
    const grindTargets = rune.subStats
      .filter(s => GRINDABLE_STATS.includes(s.type) && (weights[s.type] ?? 0) >= 0.5)
      .map(s => s.type)

    // Calculate post-optimization efficiency score
    // Uses ratio-based approach: sum(value / maxPossible) for each substat
    // When gemming: subtract removed stat's ratio, add gem's ratio
    let rollsLost = 0

    // 1. Calculate current ratio sum
    const baseRangesForOptim = getBaseRanges(isAncient)
    const rollRangesForOptim = getRollRanges()
    const grindRangesForOptim = getLegendGrindRanges(isAncient)
    const gemValues = getLegendGemValues(isAncient)
    let currentRatioSum = 0
    for (const sub of rune.subStats) {
      const baseRange = baseRangesForOptim[sub.type]
      const rollRange = rollRangesForOptim[sub.type]
      if (!baseRange || !rollRange || sub.value <= 0) continue
      const { count } = estimateRolls(sub.type, sub.value, isAncient)
      const maxPossible = baseRange.max + (count - 1) * rollRange.max
      currentRatioSum += maxPossible > 0 ? (sub.value / maxPossible) * count : 0
    }

    // 2. If gemming, adjust ratio sum: remove old stat ratio, add gem ratio
    if (gemTarget) {
      const removedStat = rune.subStats.find(s => s.type === gemTarget!.remove)
      if (removedStat) {
        const removedBaseRange = baseRangesForOptim[removedStat.type]
        const removedRollRange = rollRangesForOptim[removedStat.type]
        const { count: removedRolls } = estimateRolls(removedStat.type, removedStat.value, isAncient)
        rollsLost = removedRolls
        const removedMax = removedBaseRange && removedRollRange
          ? removedBaseRange.max + (removedRolls - 1) * removedRollRange.max
          : 0
        const removedEventRatios = removedMax > 0 ? (removedStat.value / removedMax) * removedRolls : 0

        // Gem replaces the stat with 1 event (base value only, no rolls)
        const gemValue = gemValues[gemTarget.replace]
        const gemBaseRange = baseRangesForOptim[gemTarget.replace]
        const addedRatio = gemBaseRange && gemBaseRange.max > 0 ? gemValue / gemBaseRange.max : 0

        currentRatioSum = currentRatioSum - removedEventRatios + addedRatio
      }
    }

    // 3. Add legend grind bonuses (only for grindable stats still on the rune)
    let grindBonus = 0
    const postGemTypes = gemTarget
      ? rune.subStats.map(s => s.type === gemTarget!.remove ? gemTarget!.replace : s.type)
      : rune.subStats.map(s => s.type)

    for (const statType of postGemTypes) {
      const grindRange = grindRangesForOptim[statType]
      const baseRange = baseRangesForOptim[statType]
      if (grindRange && baseRange) {
        // Grind bonus as event ratio (grind adds to the existing value, normalize by base max)
        grindBonus += grindRange.max / baseRange.max
      }
    }

    // 4. Post-optim = (ratioSum + grindBonus) / totalEvents * 100
    const totalEvents = TOTAL_EVENTS_AT_12[quality]
    const postOptimScore = totalEvents > 0
      ? Math.round(Math.min(((currentRatioSum + grindBonus) / totalEvents) * 100, 100) * 100) / 100
      : 0

    optimizations.push({
      archetype,
      matchCount: match.matchCount,
      gemTarget,
      grindTargets,
      postOptimScore,
      isPerfect,
      rollsLost,
    })
  }

  // Sort: set affinity first, then matchCount, then postOptimScore
  const setAffinity = SET_ARCHETYPE_AFFINITY[rune.set] || []
  optimizations.sort((a, b) => {
    const aSetBonus = setAffinity.includes(a.archetype as BuildArchetype) ? 1 : 0
    const bSetBonus = setAffinity.includes(b.archetype as BuildArchetype) ? 1 : 0
    // 1. Set coherence
    if (aSetBonus !== bSetBonus) return bSetBonus - aSetBonus
    // 2. Match count (4/4 before 3/4)
    if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount
    // 3. Post-optim score
    return (b.postOptimScore || 0) - (a.postOptimScore || 0)
  })

  return optimizations
}

/**
 * Legacy function name — kept for backward compatibility.
 * Delegates to analyzeRune.
 */
export function calculateEfficiency(rune: RuneData, profile: PlayerProfile = 'mid'): RuneAnalysis {
  return analyzeRune(rune, profile)
}

/**
 * Full rune analysis: efficiency, substats, grind potential, recommendation.
 */
export function analyzeRune(rune: RuneData, profile: PlayerProfile = 'mid'): RuneAnalysis {
  const quality = detectQuality(rune)
  const isAncient = rune.isAncient
  const substats = rune.subStats.map(s => analyzeSubstat(s, isAncient))
  const totalRolls = substats.reduce((sum, s) => sum + s.rolls, 0)

  const currentEfficiency = barionEfficiency(rune.subStats, quality, isAncient)

  // Calculate synergy first — we need bestArchetype for weighted efficiency
  const synergy = calculateSynergy(rune.subStats, rune.innateStat)

  // Mark the gem target — set-based scoring (lowest gemRemoveScore = best gem candidate)
  if (substats.length > 0) {
    const setTiers: Record<StatType, StatTier> = SET_STAT_TIERS[rune.set] ?? SET_STAT_TIERS.violent!
    const scored = substats
      .map((s, i) => ({
        idx: i,
        score: gemRemoveScore({ type: s.type, value: s.value }, setTiers, isAncient),
      }))
      .sort((a, b) => a.score - b.score)

    const worst = scored[0]
    if (worst && worst.score < GEM_SCORE_THRESHOLD) {
      substats[worst.idx]!.isGemTarget = true
    }
  }

  // Weighted efficiency is now set-based only — no archetype influence
  const currentWeightedEfficiency = weightedEfficiency(rune.subStats, quality, undefined, isAncient)
  const potentialEfficiency = calculatePotentialEfficiency(rune, quality)

  // Max efficiency: all events at max = 100%
  const maxEfficiency = 100

  // Grind potential is based on the potential at +12 (you grind after +12)
  const grindPotential = calculateGrindPotential(substats, potentialEfficiency, quality, isAncient)

  // For pre-+12 runes, use potential efficiency for tier (should we keep powering up?)
  // For +12+ runes, use weighted efficiency (current value of the rune)
  const isPreMax = rune.level < 12
  const efficiencyForTier = isPreMax ? potentialEfficiency : currentWeightedEfficiency

  // Tier based on the appropriate efficiency metric — no archetype synergy bonus
  const tier = getRecommendation(
    efficiencyForTier,
    12,
    profile,
    grindPotential.grindGain,
    0,
  )

  // Tier with level strictness applied — no archetype synergy bonus
  const levelKey = Math.min(Math.floor(rune.level / 3) * 3, 12)
  const levelStrictness = LEVEL_STRICTNESS[levelKey] ?? 0
  const adjustedTier = getRecommendation(
    efficiencyForTier,
    rune.level,
    profile,
    grindPotential.grindGain,
    0,
  )

  const cappedEfficiency = Math.min(currentEfficiency, 100)
  const roundedCurrent = Math.round(cappedEfficiency * 100) / 100
  const cappedWeighted = Math.min(currentWeightedEfficiency, 100)
  const roundedWeighted = Math.round(cappedWeighted * 100) / 100

  // Set bonus info
  const setInfo = SET_INFO[rune.set]
  const setBonus = setInfo?.bonus ?? ''
  const setPieces = setInfo?.pieces ?? 0

  // Grinded efficiency = potential + grind bonus (no cap — grinds add real value)
  const roundedGrindedEfficiency = Math.round(grindPotential.efficiencyAfterGrind * 100) / 100
  const grindGainValue = Math.round(Math.max(0, grindPotential.grindGain) * 100) / 100

  // Potential efficiency: at +12 or above, no remaining events → potential = current
  const finalPotential = !isPreMax ? roundedCurrent : Math.round(Math.min(potentialEfficiency, 100) * 100) / 100

  // Set-weighted efficiency — uses set tier lists for more accurate per-set scoring
  const setWeighted = setWeightedEfficiency(rune.subStats, rune.set, quality, isAncient)
  const roundedSetWeighted = setWeighted.efficiency

  // Innate scoring — bonus/malus based on innate stat tier for this set
  const innate = calculateInnateScore(rune.innateStat, rune.set)

  // Main stat tier — slots 2/4/6 have variable main stats, slots 1/3/5 are fixed
  const FIXED_MAIN_SLOTS = [1, 3, 5]
  const mainStatTier: StatTier | undefined = !FIXED_MAIN_SLOTS.includes(rune.slot)
    ? (SET_STAT_TIERS[rune.set] ?? SET_STAT_TIERS.violent!)[rune.mainStat.type] ?? 'C'
    : undefined
  const MAIN_STAT_FACTOR: Record<StatTier, number> = { S: 1.0, A: 0.95, B: 0.8, C: 0.6, D: 0.4 }
  const mainStatFactor = mainStatTier ? MAIN_STAT_FACTOR[mainStatTier] : 1.0

  // Additional penalties
  const lowRollPenalty = calculateLowRollPenalty(rune.subStats, rune.set, isAncient)
  const nonGrindablePenalty = calculateNonGrindablePenalty(rune.subStats)
  const qualityPenalty = calculateQualityPenalty(quality)
  const mismatchPenalty = calculateMismatchPenalty(rune.subStats, rune.set)

  // Set strength — weaker sets need stricter thresholds
  const setStrength = SET_STRENGTH[rune.set] ?? 'B'
  const setStrengthBonus = SET_STRENGTH_THRESHOLD_BONUS[setStrength] ?? 0

  // Adjusted efficiency: main stat factor scales the base, then penalties are added
  // (innateScore is handled separately inside calculateProgressiveAdvice)
  const adjustedSetWeighted = (roundedSetWeighted * mainStatFactor) + lowRollPenalty + nonGrindablePenalty + qualityPenalty + mismatchPenalty

  // Scale potential by the ratio of setWeighted vs Barion current
  // This approximates what the set-weighted potential would be
  const setWeightRatio = roundedSetWeighted > 0 && roundedCurrent > 0
    ? roundedSetWeighted / roundedCurrent
    : 0.5
  const adjustedPotential = finalPotential * Math.min(setWeightRatio, 1.0) * mainStatFactor

  // Progressive advice — use penalty-adjusted efficiency and set-weighted potential
  const progressiveAdvice = calculateProgressiveAdvice(rune, quality, adjustedSetWeighted, adjustedPotential, synergy, profile, innate.score, setStrengthBonus)

  // Roll quality tier — based on actual roll quality per substat
  const rollQuality = getRollQualityTier(substats, isAncient)

  // Per-archetype gem/grind optimization recommendations
  const archetypeOptimizations = calculateArchetypeOptimizations(rune, synergy, quality, isAncient)

  return {
    currentEfficiency: roundedCurrent,
    efficiency: roundedCurrent,
    weightedEfficiency: roundedWeighted,
    potentialEfficiency: finalPotential,
    maxEfficiency: Math.round(maxEfficiency * 100) / 100,
    grindedEfficiency: roundedGrindedEfficiency,
    grindGain: grindGainValue,
    substats,
    grindPotential,
    tier,
    adjustedTier,
    levelStrictness,
    rollQualityTier: rollQuality.current,
    rollQualityPostGem: rollQuality.postGem,
    rollQualityPercent: rollQuality.currentPercent,
    rollQualityPostGemPercent: rollQuality.postGemPercent,
    quality,
    totalRolls,
    setBonus,
    setPieces,
    synergy,
    progressiveAdvice,
    archetypeOptimizations: archetypeOptimizations.length > 0 ? archetypeOptimizations : undefined,
    setWeightedEfficiency: roundedSetWeighted,
    setWeightedBreakdown: setWeighted.breakdown,
    setWeightedMaxDivisor: setWeighted.maxDivisor,
    subStatTiers: setWeighted.tiers,
    innateScore: innate.score !== 0 ? innate.score : undefined,
    innateTier: innate.tier,
    lowRollPenalty: lowRollPenalty !== 0 ? lowRollPenalty : undefined,
    nonGrindablePenalty: nonGrindablePenalty !== 0 ? nonGrindablePenalty : undefined,
    qualityPenalty: qualityPenalty !== 0 ? qualityPenalty : undefined,
    mismatchPenalty: mismatchPenalty !== 0 ? mismatchPenalty : undefined,
    setStrength,
    mainStatTier,
    mainStatFactor,
    profile,
    ...(isAncient ? { isAncient } : {}),
  }
}
