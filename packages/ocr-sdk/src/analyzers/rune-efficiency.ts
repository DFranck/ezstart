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

export type EfficiencyTier = 'sell' | 'keep' | 'good' | 'great' | 'godlike'

export type PlayerProfile = 'early' | 'mid' | 'late'

const EFFICIENCY_THRESHOLDS: Record<PlayerProfile, Record<EfficiencyTier, number>> = {
  early: { sell: 0, keep: 50, good: 60, great: 70, godlike: 80 },
  mid:   { sell: 0, keep: 60, good: 70, great: 80, godlike: 85 },
  late:  { sell: 0, keep: 70, good: 80, great: 85, godlike: 90 },
}

const LEVEL_STRICTNESS: Record<number, number> = {
  0: 15, 3: 10, 6: 7, 9: 3, 12: 0, 15: 0,
}
/** @deprecated Use EfficiencyTier instead */
export type Recommendation = EfficiencyTier

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

export type BuildArchetype =
  | 'speed-dps' | 'bruiser' | 'cleave' | 'cc-debuffer' | 'tank-support'
  | 'bomber' | 'strip-cleanse' | 'healer' | 'one-shot-nuker'
  | 'vampire-bruiser' | 'revenge-proc' | 'speed-leader' | 'raid-support' | 'def-nuker'

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
  tier: EfficiencyTier
  /** Tier with level strictness applied */
  adjustedTier: EfficiencyTier
  /** Level strictness malus applied (0-15) */
  levelStrictness: number
  quality: RuneQuality
  totalRolls: number
  /** Set bonus description — used by UI layer */
  setBonus: string
  /** Number of pieces for set bonus — used by UI layer */
  setPieces: number
  /** Build archetype synergy analysis */
  synergy: SynergyResult
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

/** Rune set info: pieces required and bonus description */
const SET_INFO: Record<string, { pieces: number; bonus: string }> = {
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

/** Build archetypes for synergy scoring */
const BUILD_ARCHETYPES: Record<BuildArchetype, { desiredStats: StatType[] }> = {
  'speed-dps': { desiredStats: ['spd', 'cr', 'cd', 'atk%'] },
  'bruiser': { desiredStats: ['hp%', 'cr', 'cd', 'spd'] },
  'cleave': { desiredStats: ['atk%', 'cr', 'cd', 'spd'] },
  'cc-debuffer': { desiredStats: ['spd', 'acc', 'hp%', 'def%'] },
  'tank-support': { desiredStats: ['hp%', 'def%', 'spd', 'res'] },
  'bomber': { desiredStats: ['atk%', 'spd', 'acc', 'hp%'] },
  'strip-cleanse': { desiredStats: ['spd', 'hp%', 'acc', 'res'] },
  'healer': { desiredStats: ['spd', 'hp%', 'def%', 'acc'] },
  'one-shot-nuker': { desiredStats: ['atk%', 'cr', 'cd', 'spd'] },
  'def-nuker': { desiredStats: ['def%', 'cr', 'cd', 'spd'] },
  'vampire-bruiser': { desiredStats: ['atk%', 'cr', 'cd', 'hp%'] },
  'revenge-proc': { desiredStats: ['hp%', 'def%', 'cr', 'cd'] },
  'speed-leader': { desiredStats: ['spd', 'hp%', 'def%', 'res'] },
  'raid-support': { desiredStats: ['spd', 'hp%', 'def%', 'res'] },
}

const SYNERGY_BONUS = {
  PERFECT_4: 8,         // 4/4 substats match
  THREE_NO_ROLL: 8,     // 3/4 match + 4th has 0-1 roll → gem without loss = like 4/4
  THREE_WITH_ROLLS: 4,  // 3/4 match + 4th has 2+ rolls → gem possible but loss
  TWO_NO_ROLLS: 4,      // 2/4 match + 2 others have 0-1 roll → gem possible
  TWO_WITH_ROLLS: 0,    // 2/4 match + rolls in bad stats → too much loss
  INCOHERENT: -3,       // < 2 match
} as const

/** Stat weights for weighted efficiency — reflects real SW meta value */
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

/** Barion divisor: normalise so a perfect legend rune = 100% → (8 + 1) = 9 */
const BARION_DIVISOR = 9

// Number of substats at +0 by quality
const SUBSTATS_BY_QUALITY: Record<RuneQuality, number> = {
  normal: 0,
  magic: 1,
  rare: 2,
  hero: 3,
  legend: 4,
}

// Number of upgrade rolls at +12 by quality
const UPGRADES_BY_QUALITY: Record<RuneQuality, number> = {
  normal: 0,
  magic: 1,
  rare: 2,
  hero: 3,
  legend: 4,
}

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

  // Estimate count using max roll value — ceil to ensure value fits within count * max
  const count = Math.max(1, Math.ceil(value / range.max))

  // Calculate quality: ratio of actual value vs max possible (SWOP/SWLens formula)
  // e.g. SPD +10 in 2 rolls → 10 / (6*2) = 83.33%
  const maxTotal = range.max * count
  const avgQuality = maxTotal === 0
    ? 100
    : Math.min(100, Math.max(0, (value / maxTotal) * 100))

  return { count, avgQuality }
}

/**
 * Get the number of upgrade rolls that have occurred at a given level for a quality.
 * An upgrade roll only happens when the rune already has 4 substats.
 */
function getRollCount(quality: RuneQuality, level: number): number {
  const base = SUBSTATS_BY_QUALITY[quality]
  const powerups = Math.floor(Math.min(level, 12) / 3)
  const newSubs = Math.min(powerups, 4 - base)
  return powerups - newSubs
}

/**
 * Calculate how many upgrade rolls remain before +12 for a given quality.
 */
function remainingRolls(quality: RuneQuality, level: number): number {
  const totalUpgrades = UPGRADES_BY_QUALITY[quality]
  const rollsDone = getRollCount(quality, level)
  return Math.max(0, totalUpgrades - rollsDone)
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
  const grindAmount = grindRange ? grindRange.max : undefined
  const roundedQuality = Math.round(avgQuality * 100) / 100

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
 * Calculate weighted efficiency using stat importance weights.
 * weighted = sum(substat_ratio * weight) / sum(max_possible_ratios * weight) * 100
 * Uses the top-N weights (sorted desc) for the max possible denominator,
 * where N = total roll slots (initial subs + upgrade rolls).
 */
function weightedEfficiency(substats: RuneStat[]): number {
  if (substats.length === 0) return 0

  let weightedSum = 0
  for (const sub of substats) {
    const range = ROLL_RANGES[sub.type]
    if (!range || sub.value <= 0) continue
    const ratio = sub.value / range.max
    weightedSum += ratio * STAT_WEIGHTS[sub.type]
  }

  // Max possible: 8 perfect rolls across the highest-weighted stats
  // A perfect rune gets ratio=2 per stat (2 rolls each on 4 stats) = 8 total ratios
  // Best case: all rolls in spd (weight 2.0) → maxWeightedSum = 8 * 2.0
  // But we normalise against a "balanced best" of 4 stats with 2 rolls each:
  // Use top-4 weights sorted desc: spd(2.0), cr(1.5), cd(1.5), atk%(1.0) = avg 1.5
  // maxWeightedSum = 8 * avg_top4_weight = 8 * 1.5 = 12
  // +1 for main stat baseline (like Barion)
  // Actually, to stay comparable to Barion scale (0-100), we use:
  // weighted_eff = (weightedSum + main_weight) / max_weighted_divisor * 100
  // where max_weighted_divisor makes a perfect rune = 100%
  // Perfect rune: 4 stats, 2 max rolls each → ratio=2 per stat
  // Best weights: spd(2.0*2=4) + cr(1.5*2=3) + cd(1.5*2=3) + atk%(1.0*2=2) = 12
  // Main stat weight = 1.0 (normalised)
  // Divisor = 12 + 1 = 13 for 100%
  const MAX_WEIGHTED_DIVISOR = 13

  return ((weightedSum + 1) / MAX_WEIGHTED_DIVISOR) * 100
}

/**
 * Calculate potential efficiency at +12 (remaining rolls at max).
 * If the rune is already +12 or higher, potential = current (no rolls left).
 */
export function calculatePotentialEfficiency(rune: RuneData): number {
  const quality = detectQuality(rune)
  const remaining = remainingRolls(quality, rune.level)

  let rawSum = 0
  for (const sub of rune.subStats) {
    const range = ROLL_RANGES[sub.type]
    if (!range || sub.value <= 0) continue
    rawSum += sub.value / range.max
  }

  // If no rolls remaining, potential equals current
  if (remaining <= 0) {
    return ((rawSum + 1) / BARION_DIVISOR) * 100
  }

  // Each remaining perfect roll adds 1.0 to rawSum
  // Max rawSum = 4 (initial subs) + total upgrades for this quality
  const maxRawSum = 4 + UPGRADES_BY_QUALITY[quality]
  const potentialRawSum = Math.min(rawSum + remaining, maxRawSum)
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
  const substats = rune.subStats.map(analyzeSubstat)
  const totalRolls = substats.reduce((sum, s) => sum + s.rolls, 0)

  const currentEfficiency = barionEfficiency(rune.subStats)
  const currentWeightedEfficiency = weightedEfficiency(rune.subStats)
  const potentialEfficiency = calculatePotentialEfficiency(rune)

  // Max efficiency: 8 perfect rolls + 1 main = (8 + 1) / 2.8 * 100
  const maxEfficiency = ((8 + 1) / BARION_DIVISOR) * 100

  const grindPotential = calculateGrindPotential(substats, currentEfficiency)

  // Calculate synergy (include innate stat for archetype matching)
  const synergy = calculateSynergy(rune.subStats, rune.innateStat)

  // Tier based on weightedEfficiency (not raw Barion)
  const tier = getRecommendation(
    currentWeightedEfficiency,
    12,
    profile,
    grindPotential.grindGain,
    synergy.synergyBonus,
  )

  // Tier with level strictness applied
  const levelKey = Math.min(Math.floor(rune.level / 3) * 3, 12)
  const levelStrictness = LEVEL_STRICTNESS[levelKey] ?? 0
  const adjustedTier = getRecommendation(
    currentWeightedEfficiency,
    rune.level,
    profile,
    grindPotential.grindGain,
    synergy.synergyBonus,
  )

  const cappedEfficiency = Math.min(currentEfficiency, 100)
  const roundedCurrent = Math.round(cappedEfficiency * 100) / 100
  const cappedWeighted = Math.min(currentWeightedEfficiency, 100)
  const roundedWeighted = Math.round(cappedWeighted * 100) / 100

  // Set bonus info
  const setInfo = SET_INFO[rune.set]
  const setBonus = setInfo?.bonus ?? ''
  const setPieces = setInfo?.pieces ?? 0

  // Grinded efficiency: no cap — grinds add real value, can exceed 100%
  const roundedGrindedEfficiency = Math.round(grindPotential.efficiencyAfterGrind * 100) / 100
  const grindGainValue = Math.round(Math.max(0, roundedGrindedEfficiency - roundedCurrent) * 100) / 100

  // Potential efficiency: at +12 or above, no remaining rolls → potential = weighted (current)
  const remaining = remainingRolls(quality, rune.level)
  const finalPotential = remaining <= 0 ? roundedWeighted : Math.round(Math.min(potentialEfficiency, 100) * 100) / 100

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
    quality,
    totalRolls,
    setBonus,
    setPieces,
    synergy,
  }
}
