/**
 * Summoners War Rune Efficiency Calculator (Barion Formula)
 *
 * Calculates rune efficiency based on the community-standard Barion formula
 * with accurate 6★ roll ranges, grind potential, and detailed substat analysis.
 */

// --- Types (mirrors @game-analyzer/types/rune) ---

type StatType =
  | 'hp' | 'hp%' | 'atk' | 'atk%' | 'def' | 'def%'
  | 'spd' | 'cr' | 'cd' | 'res' | 'acc'

type RuneQuality = 'normal' | 'magic' | 'rare' | 'hero' | 'legend'

interface RuneStat {
  type: StatType
  value: number
}

interface RuneData {
  set: string
  slot: number
  grade: number
  level: number
  quality?: RuneQuality
  mainStat: RuneStat
  subStats: RuneStat[]
  innateStat?: RuneStat
}

// --- Public types ---

export type Recommendation = 'sell' | 'keep' | 'great' | 'godlike'

export interface SubstatAnalysis {
  type: StatType
  value: number
  rolls: number
  rollQuality: number
  maxValue: number
  minValue: number
  isMaxRoll: boolean
  isGrindable: boolean
  grindRange?: { min: number; max: number }
  valueAfterMaxGrind?: number
}

export interface GrindPotential {
  currentEfficiency: number
  efficiencyAfterGrind: number
  grindGain: number
  substatsToGrind: { type: StatType; currentValue: number; afterGrind: number }[]
}

export interface RuneAnalysis {
  currentEfficiency: number
  potentialEfficiency: number
  maxEfficiency: number
  substats: SubstatAnalysis[]
  grindPotential: GrindPotential
  recommendation: Recommendation
  quality: RuneQuality
  totalRolls: number
}

// Keep legacy exports for backward compat with index.ts
export type SubstatDetail = SubstatAnalysis
export type RuneEfficiencyResult = RuneAnalysis

// --- Constants ---

interface RollRange {
  min: number
  max: number
}

/** Roll ranges per stat type for 6★ runes */
const ROLL_RANGES: Record<StatType, RollRange> = {
  'hp':   { min: 135, max: 375 },
  'hp%':  { min: 5,   max: 8 },
  'atk':  { min: 10,  max: 20 },
  'atk%': { min: 5,   max: 8 },
  'def':  { min: 10,  max: 20 },
  'def%': { min: 5,   max: 8 },
  'spd':  { min: 4,   max: 6 },
  'cr':   { min: 4,   max: 6 },
  'cd':   { min: 4,   max: 7 },
  'res':  { min: 4,   max: 8 },
  'acc':  { min: 4,   max: 8 },
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

/** Non-grindable stats */
const NON_GRINDABLE: Set<StatType> = new Set(['cr', 'cd', 'res', 'acc'])

/** Barion divisor: theoretical max is (8 perfect rolls + 1 main) / 2.8 */
const BARION_DIVISOR = 2.8

/** Total upgrade rolls at +12 (at +3, +6, +9, +12) */
const MAX_ROLLS_AT_PLUS_12 = 4

// --- Core functions ---

/**
 * Estimate the number of rolls and average quality for a substat.
 * count: value / max_roll rounded to nearest, min 1
 * avgQuality: 0% = all rolls at min, 100% = all rolls at max
 */
export function estimateRolls(
  statType: StatType,
  value: number,
): { count: number; avgQuality: number } {
  const range = ROLL_RANGES[statType]
  if (!range || value <= 0) return { count: 0, avgQuality: 0 }

  // Estimate count using max roll value
  const count = Math.max(1, Math.round(value / range.max))

  // Calculate quality: where does the value sit between min*count and max*count?
  const minTotal = range.min * count
  const maxTotal = range.max * count
  const avgQuality = maxTotal === minTotal
    ? 100
    : Math.min(100, Math.max(0, ((value - minTotal) / (maxTotal - minTotal)) * 100))

  return { count, avgQuality }
}

/**
 * Calculate how many upgrade rolls remain before +12.
 */
function remainingRolls(level: number): number {
  const rollsOccurred = Math.floor(Math.min(level, 12) / 3)
  return MAX_ROLLS_AT_PLUS_12 - rollsOccurred
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
 * Analyze a single substat in detail.
 */
function analyzeSubstat(stat: RuneStat): SubstatAnalysis {
  const range = ROLL_RANGES[stat.type]
  const { count, avgQuality } = estimateRolls(stat.type, stat.value)

  const maxValue = range.max * count
  const minValue = range.min * count
  const isMaxRoll = stat.value >= maxValue

  const isGrindable = !NON_GRINDABLE.has(stat.type)
  const grindRange = LEGEND_GRIND_RANGES[stat.type]
  const valueAfterMaxGrind = grindRange ? stat.value + grindRange.max : undefined

  return {
    type: stat.type,
    value: stat.value,
    rolls: count,
    rollQuality: Math.round(avgQuality * 100) / 100,
    maxValue,
    minValue,
    isMaxRoll,
    isGrindable,
    grindRange: grindRange ? { min: grindRange.min, max: grindRange.max } : undefined,
    valueAfterMaxGrind,
  }
}

/**
 * Calculate Barion efficiency.
 * For each substat: ratio = value / max_roll_value
 * efficiency = (sum(ratios) + 1) / 2.8 * 100
 */
function barionEfficiency(substats: RuneStat[]): number {
  let rawSum = 0
  for (const sub of substats) {
    const range = ROLL_RANGES[sub.type]
    if (!range || sub.value <= 0) continue
    rawSum += sub.value / range.max
  }
  return ((rawSum + 1) / BARION_DIVISOR) * 100
}

/**
 * Calculate potential efficiency at +12 (remaining rolls at max).
 */
export function calculatePotentialEfficiency(rune: RuneData): number {
  const remaining = remainingRolls(rune.level)

  let rawSum = 0
  for (const sub of rune.subStats) {
    const range = ROLL_RANGES[sub.type]
    if (!range || sub.value <= 0) continue
    rawSum += sub.value / range.max
  }

  // Each remaining perfect roll adds 1.0 to rawSum
  const potentialRawSum = rawSum + remaining
  return ((potentialRawSum + 1) / BARION_DIVISOR) * 100
}

/**
 * Calculate grind potential — efficiency gain from legend grinds on all grindable substats.
 */
function calculateGrindPotential(
  substats: SubstatAnalysis[],
  currentEfficiency: number,
): GrindPotential {
  const substatsToGrind: GrindPotential['substatsToGrind'] = []
  let grindedRawSum = 0

  for (const sub of substats) {
    const range = ROLL_RANGES[sub.type]
    if (!range) continue

    if (sub.isGrindable && sub.grindRange) {
      const afterGrind = sub.value + sub.grindRange.max
      substatsToGrind.push({
        type: sub.type,
        currentValue: sub.value,
        afterGrind,
      })
      grindedRawSum += afterGrind / range.max
    } else {
      grindedRawSum += sub.value / range.max
    }
  }

  const efficiencyAfterGrind = ((grindedRawSum + 1) / BARION_DIVISOR) * 100
  const grindGain = efficiencyAfterGrind - currentEfficiency

  return {
    currentEfficiency,
    efficiencyAfterGrind: Math.round(efficiencyAfterGrind * 100) / 100,
    grindGain: Math.round(grindGain * 100) / 100,
    substatsToGrind,
  }
}

/**
 * Get recommendation based on efficiency and grind potential.
 * Uses the best of current efficiency and efficiency after grind.
 * < 50% even after grind = sell
 * 50-65% = keep
 * 65-80% = great
 * 80%+ = godlike
 */
export function getRecommendation(
  efficiency: number,
  potentialEfficiency: number,
  grindPotential?: number,
): Recommendation {
  const score = Math.max(efficiency, potentialEfficiency, grindPotential ?? 0)

  if (score >= 80) return 'godlike'
  if (score >= 65) return 'great'
  if (score >= 50) return 'keep'
  return 'sell'
}

/**
 * Legacy function name — kept for backward compatibility.
 * Delegates to analyzeRune.
 */
export function calculateEfficiency(rune: RuneData): RuneAnalysis {
  return analyzeRune(rune)
}

/**
 * Full rune analysis: efficiency, substats, grind potential, recommendation.
 */
export function analyzeRune(rune: RuneData): RuneAnalysis {
  const quality = detectQuality(rune)
  const substats = rune.subStats.map(analyzeSubstat)
  const totalRolls = substats.reduce((sum, s) => sum + s.rolls, 0)

  const currentEfficiency = barionEfficiency(rune.subStats)
  const potentialEfficiency = calculatePotentialEfficiency(rune)

  // Max efficiency: 8 perfect rolls + 1 main = (8 + 1) / 2.8 * 100
  const maxEfficiency = ((8 + 1) / BARION_DIVISOR) * 100

  const grindPotential = calculateGrindPotential(substats, currentEfficiency)

  const recommendation = getRecommendation(
    currentEfficiency,
    potentialEfficiency,
    grindPotential.efficiencyAfterGrind,
  )

  return {
    currentEfficiency: Math.round(currentEfficiency * 100) / 100,
    potentialEfficiency: Math.round(potentialEfficiency * 100) / 100,
    maxEfficiency: Math.round(maxEfficiency * 100) / 100,
    substats,
    grindPotential,
    recommendation,
    quality,
    totalRolls,
  }
}
