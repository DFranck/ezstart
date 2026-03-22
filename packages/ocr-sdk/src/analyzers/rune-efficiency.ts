/**
 * Summoners War Rune Efficiency Calculator (Barion Formula)
 *
 * Calculates rune efficiency based on the community-standard Barion formula.
 * Efficiency represents how close a rune's substats are to their theoretical maximum.
 */

// --- Types (mirrors @game-analyzer/types/rune) ---

type StatType =
  | 'hp' | 'hp%' | 'atk' | 'atk%' | 'def' | 'def%'
  | 'spd' | 'cr' | 'cd' | 'res' | 'acc'

interface RuneStat {
  type: StatType
  value: number
}

interface RuneData {
  set: string
  slot: number
  grade: number
  level: number
  mainStat: RuneStat
  subStats: RuneStat[]
  innateStat?: RuneStat
}

// --- Public types ---

export interface SubstatDetail {
  type: StatType
  value: number
  maxPossible: number
  efficiency: number
  estimatedRolls: number
}

export interface RuneEfficiencyResult {
  currentEfficiency: number
  potentialEfficiency: number
  maxEfficiency: number
  substatDetails: SubstatDetail[]
  recommendation: 'sell' | 'keep' | 'great' | 'godlike'
}

// --- Constants ---

/** Maximum single roll value per stat type for a 6* rune */
const MAX_ROLL_VALUES: Record<StatType, number> = {
  'hp': 375,
  'hp%': 8,
  'atk': 20,
  'atk%': 8,
  'def': 20,
  'def%': 8,
  'spd': 6,
  'cr': 6,
  'cd': 7,
  'res': 8,
  'acc': 8,
}

/** Total rolls at +12 for substats (one at each +3 interval: +3, +6, +9, +12) */
const MAX_ROLLS_AT_PLUS_12 = 4

/** Barion divisor: 1 (main) + 4 substats * max_single_efficiency(0.225 avg) * 8 max rolls theoretical = 2.8 */
const BARION_DIVISOR = 2.8

// --- Core functions ---

/**
 * Estimate how many times a substat has been rolled based on its value.
 * Minimum 1 roll (the initial roll when the substat appeared).
 */
export function estimateRolls(statType: StatType, value: number): number {
  const maxRoll = MAX_ROLL_VALUES[statType]
  if (!maxRoll || value <= 0) return 0

  // Each roll adds between ~75% and 100% of maxRoll on average
  // A simple estimate: round(value / maxRoll), minimum 1
  const estimated = Math.max(1, Math.round(value / maxRoll))
  return estimated
}

/**
 * Calculate how many upgrade rolls remain before +12.
 * Rune gets a substat roll at +3, +6, +9, +12.
 */
function remainingRolls(level: number): number {
  const rollsOccurred = Math.floor(Math.min(level, 12) / 3)
  return MAX_ROLLS_AT_PLUS_12 - rollsOccurred
}

/**
 * Calculate the efficiency contribution of a single substat.
 * efficiency = value / (maxRoll * estimatedRolls)
 */
function substatEfficiency(statType: StatType, value: number): number {
  const maxRoll = MAX_ROLL_VALUES[statType]
  if (!maxRoll || value <= 0) return 0

  const rolls = estimateRolls(statType, value)
  return value / (maxRoll * rolls)
}

/**
 * Calculate potential efficiency if remaining rolls go to max.
 * Adds the best-case remaining rolls to the current efficiency sum.
 */
export function calculatePotentialEfficiency(rune: RuneData): number {
  const remaining = remainingRolls(rune.level)

  // Current substat efficiency sum
  let efficiencySum = 0
  for (const sub of rune.subStats) {
    const maxRoll = MAX_ROLL_VALUES[sub.type]
    if (!maxRoll) continue
    const rolls = estimateRolls(sub.type, sub.value)
    efficiencySum += sub.value / (maxRoll * rolls)
  }

  // Each remaining roll at maximum adds 1.0 to the efficiency sum
  // (value = maxRoll, so maxRoll / maxRoll = 1.0 per roll)
  // But we normalize per roll, so each perfect roll adds 1/rolls contribution
  // Actually in Barion formula, each substat contributes value / (maxRoll * rolls)
  // For potential, we add remaining perfect rolls: remaining * (maxRoll / maxRoll) = remaining * 1
  // But this must be divided by the NEW total rolls for that substat
  // Simpler approach: add remaining * 1 to the raw efficiency sum (each max roll = 1.0 contribution)

  // Re-derive: Barion formula sums (value / (maxRoll * rolls)) per substat
  // This simplifies to: for each roll, how efficient was it? Average across all rolls.
  // A perfect roll contributes exactly 1/rolls to the substat efficiency.
  // For potential, assume remaining rolls are perfect and go to existing substats.
  // Best case: remaining rolls each contribute 1.0 to the per-substat efficiency
  // But since we average per substat, we need to recalculate.

  // Simpler standard approach: sum(value / maxRoll) for all substats, ignoring roll count
  let rawSum = 0
  for (const sub of rune.subStats) {
    const maxRoll = MAX_ROLL_VALUES[sub.type]
    if (!maxRoll) continue
    rawSum += sub.value / maxRoll
  }

  // Add remaining rolls at max value (each contributes 1.0 to rawSum)
  const potentialRawSum = rawSum + remaining

  // Barion formula: (sum + 1) / 2.8 * 100
  return ((potentialRawSum + 1) / BARION_DIVISOR) * 100
}

/**
 * Get a recommendation based on efficiency thresholds.
 * Uses the higher of current and potential efficiency for the decision.
 */
export function getRecommendation(
  efficiency: number,
  potentialEfficiency: number,
): 'sell' | 'keep' | 'great' | 'godlike' {
  // Use potential for runes not yet +12, current for maxed runes
  const score = Math.max(efficiency, potentialEfficiency)

  if (score >= 80) return 'godlike'
  if (score >= 65) return 'great'
  if (score >= 50) return 'keep'
  return 'sell'
}

/**
 * Calculate full rune efficiency using the Barion formula.
 *
 * For each substat: rawContribution = value / maxRollValue
 * Current efficiency = (sum(rawContributions) + 1) / 2.8 * 100
 * The +1 represents the main stat (always counted as perfect).
 */
export function calculateEfficiency(rune: RuneData): RuneEfficiencyResult {
  const substatDetails: SubstatDetail[] = []
  let rawSum = 0

  for (const sub of rune.subStats) {
    const maxRoll = MAX_ROLL_VALUES[sub.type]
    if (!maxRoll) continue

    const rolls = estimateRolls(sub.type, sub.value)
    const maxPossible = maxRoll * rolls
    const eff = (sub.value / maxPossible) * 100

    rawSum += sub.value / maxRoll

    substatDetails.push({
      type: sub.type,
      value: sub.value,
      maxPossible,
      efficiency: Math.round(eff * 100) / 100,
      estimatedRolls: rolls,
    })
  }

  // Barion formula
  const currentEfficiency = ((rawSum + 1) / BARION_DIVISOR) * 100
  const potentialEfficiency = calculatePotentialEfficiency(rune)

  // Max efficiency: 4 substats * 4 rolls each at max = 16 max roll contributions + 1 main
  // But legend rune starts with 4 subs, so at +12 each sub has had some rolls
  // Theoretical max: rawSum = number_of_total_rolls (each = 1.0 if perfect)
  // A 6* legend rune: 4 initial subs + 4 upgrade rolls = 8 total sub rolls
  // maxRawSum = 8, maxEfficiency = (8 + 1) / 2.8 * 100
  const maxRawSum = 8
  const maxEfficiency = ((maxRawSum + 1) / BARION_DIVISOR) * 100

  const roundedCurrent = Math.round(currentEfficiency * 100) / 100
  const roundedPotential = Math.round(potentialEfficiency * 100) / 100
  const roundedMax = Math.round(maxEfficiency * 100) / 100

  const recommendation = getRecommendation(roundedCurrent, roundedPotential)

  return {
    currentEfficiency: roundedCurrent,
    potentialEfficiency: roundedPotential,
    maxEfficiency: roundedMax,
    substatDetails,
    recommendation,
  }
}
