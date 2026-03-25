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
  nextCheckAt: number
  sellProbability: number
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
  /** @deprecated Use rollQualityTier + progressiveAdvice instead */
  tier: EfficiencyTier
  /** @deprecated Use rollQualityTier + progressiveAdvice instead */
  adjustedTier: EfficiencyTier
  /** Level strictness malus applied (0-15) */
  levelStrictness: number
  /** Roll quality tier based on raw Barion efficiency (Legend/Hero/Rare/Magic/Normal) */
  rollQualityTier: RuneQuality
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

/** Archetype-specific stat priority weights (1.0 = max priority, 0.05 = useless) */
const STAT_PRIORITY_WEIGHTS: Record<BuildArchetype, Record<StatType, number>> = {
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

/** Progressive sell thresholds by level — if weighted eff < threshold → sell */
const PROGRESSIVE_SELL_THRESHOLDS: Record<PlayerProfile, Record<number, number>> = {
  early: { 0: 30, 3: 35, 6: 40, 9: 45, 12: 50 },
  mid:   { 0: 40, 3: 45, 6: 50, 9: 55, 12: 60 },
  late:  { 0: 50, 3: 55, 6: 60, 9: 65, 12: 70 },
}

/** Dead stat combinations — auto-sell if both present */
const DEAD_STAT_COMBOS: StatType[][] = [
  ['acc', 'res'],
]

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
 * Uses average value per roll to qualify each roll's tier.
 */
function getRollBreakdown(statType: StatType, value: number, rollCount: number): RollBreakdown[] {
  const range = ROLL_RANGES[statType]
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

  const rollBreakdown = getRollBreakdown(stat.type, stat.value, count)

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
 * For each substat: ratio = value / max_roll_value
 * efficiency = sum(ratios) / TOTAL_EVENTS_AT_12[quality] * 100
 *
 * A perfect Legend 6★ +12 rune = 8/8 = 100%.
 * Innate stat is NOT counted.
 */
function barionEfficiency(substats: RuneStat[], quality: RuneQuality): number {
  let rawSum = 0
  for (const sub of substats) {
    const range = ROLL_RANGES[sub.type]
    if (!range || sub.value <= 0) continue
    rawSum += sub.value / range.max
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
function weightedEfficiency(substats: RuneStat[], quality: RuneQuality, bestArchetype?: BuildArchetype | null): number {
  if (substats.length === 0) return 0

  // Use archetype-specific weights if available, otherwise fallback
  const weights = bestArchetype ? STAT_PRIORITY_WEIGHTS[bestArchetype] : STAT_WEIGHTS

  let weightedSum = 0
  for (const sub of substats) {
    const range = ROLL_RANGES[sub.type]
    if (!range || sub.value <= 0) continue
    const ratio = sub.value / range.max
    weightedSum += ratio * (weights[sub.type] ?? 0.5)
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
 * Calculate potential efficiency at +12 (remaining events at max).
 * remaining_events = TOTAL_EVENTS_AT_12[quality] - events_so_far
 * potential = (current_sum + remaining_events * 1.0) / TOTAL_EVENTS_AT_12[quality] * 100
 *
 * If the rune is already +12 or higher, potential = current (no events left).
 */
export function calculatePotentialEfficiency(rune: RuneData, qualityOverride?: RuneQuality): number {
  const quality = qualityOverride ?? detectQuality(rune)
  const totalEvents = TOTAL_EVENTS_AT_12[quality]
  if (totalEvents <= 0) return 0

  let rawSum = 0
  for (const sub of rune.subStats) {
    const range = ROLL_RANGES[sub.type]
    if (!range || sub.value <= 0) continue
    rawSum += sub.value / range.max
  }

  // Events so far = initial subs + powerups that occurred
  const powerups = Math.floor(Math.min(rune.level, 12) / 3)
  const eventsSoFar = SUBSTATS_BY_QUALITY[quality] + powerups
  const remainingEvents = Math.max(0, totalEvents - eventsSoFar)

  // Each remaining event at max adds 1.0 to rawSum
  const potentialSum = rawSum + remainingEvents * 1.0
  const result = (potentialSum / totalEvents) * 100

  console.log('[POTENTIAL DEBUG]', {
    quality,
    level: rune.level,
    subStats: rune.subStats,
    rawSum,
    eventsSoFar,
    remainingEvents,
    totalEvents,
    potentialRawSum: rawSum + remainingEvents,
    result: ((rawSum + remainingEvents) / totalEvents) * 100,
  })

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
): GrindPotential {
  const substatsToGrind: GrindPotential['substatsToGrind'] = []
  let grindedRawSum = 0
  let currentRawSum = 0
  const divisor = TOTAL_EVENTS_AT_12[quality]

  for (const sub of substats) {
    const range = ROLL_RANGES[sub.type]
    if (!range) continue

    const ratio = sub.value / range.max
    currentRawSum += ratio

    if (sub.isGrindable && sub.grindRange) {
      const afterGrind = sub.value + sub.grindRange.max
      substatsToGrind.push({
        type: sub.type,
        currentValue: sub.value,
        afterGrind,
      })
      grindedRawSum += afterGrind / range.max
    } else {
      grindedRawSum += ratio
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
): ProgressiveAdvice | undefined {
  const level = rune.level
  const levelKey = Math.min(Math.floor(level / 3) * 3, 12)

  // Dead stat combo = instant sell
  if (hasDeadStatCombo(rune.subStats)) {
    return {
      action: 'sell',
      reason: 'Dead stat combo detected (ACC + RES) — no monster needs both',
      nextCheckAt: 0,
      sellProbability: 95,
    }
  }

  const thresholds = PROGRESSIVE_SELL_THRESHOLDS[profile]
  const threshold = thresholds[levelKey] ?? thresholds[12] ?? 50
  const finalThreshold = thresholds[12] ?? 50

  // Synergy bonus: strong archetype match (3/4 or 4/4) boosts potential evaluation
  const synergyBoost = synergy.matchCount >= 4 ? 5 : synergy.matchCount >= 3 ? 3 : 0
  const adjustedPotential = potentialEff + synergyBoost

  // At +12 or +15 — final decision (no more potential, only current matters)
  if (level >= 12) {
    if (currentWeightedEff < threshold) {
      return {
        action: 'sell',
        reason: `Weighted efficiency ${Math.round(currentWeightedEff)}% below ${profile} threshold ${threshold}%`,
        nextCheckAt: 0,
        sellProbability: 90,
      }
    }

    // Check if grindable
    const hasGrindable = rune.subStats.some(s => !NON_GRINDABLE.has(s.type))
    if (hasGrindable && currentWeightedEff >= threshold) {
      return {
        action: 'grind',
        reason: `Good rune at +12 — grind to maximize value (${Math.round(currentWeightedEff)}%)`,
        nextCheckAt: 0,
        sellProbability: 0,
      }
    }

    return {
      action: 'keep',
      reason: `Solid rune at +12 — ${Math.round(currentWeightedEff)}% weighted efficiency`,
      nextCheckAt: 0,
      sellProbability: 0,
    }
  }

  // Pre-+12: potential exceeds final threshold → worth upgrading even if current is low
  if (adjustedPotential >= finalThreshold) {
    if (currentWeightedEff >= threshold) {
      // Current OK + high potential → keep upgrading
      const nextLevel = Math.min(levelKey + 3, 12)
      return {
        action: 'upgrade',
        reason: `On track — upgrade to +${nextLevel} (${Math.round(currentWeightedEff)}% current, ${Math.round(adjustedPotential)}% potential)`,
        nextCheckAt: nextLevel,
        sellProbability: 15,
      }
    }
    // Current below threshold but potential is promising → upgrade anyway
    const nextLevel = Math.min(levelKey + 3, 12)
    return {
      action: 'upgrade',
      reason: `Current ${Math.round(currentWeightedEff)}% below +${levelKey} threshold but potential ${Math.round(adjustedPotential)}% is promising — worth upgrading`,
      nextCheckAt: nextLevel,
      sellProbability: 35,
    }
  }

  // Potential also below final threshold → sell
  if (currentWeightedEff < threshold) {
    return {
      action: 'sell',
      reason: `Below threshold and potential ${Math.round(adjustedPotential)}% too low for ${profile} (need ${finalThreshold}%)`,
      nextCheckAt: 0,
      sellProbability: 85,
    }
  }

  // Current OK but potential mediocre — upgrade cautiously
  const nextLevel = Math.min(levelKey + 3, 12)
  const nextThreshold = thresholds[nextLevel] ?? thresholds[12] ?? 60

  // Sell probability: based on gap between potential and final threshold
  let sellProbability = Math.min(70, Math.max(20, Math.round((1 - adjustedPotential / finalThreshold) * 100)))

  // Synergy penalty increases sell probability
  if (synergy.synergyBonus < 0) {
    sellProbability = Math.min(95, sellProbability + 20)
  }

  return {
    action: 'upgrade',
    reason: `On track — upgrade to +${nextLevel} and re-evaluate (${Math.round(currentWeightedEff)}% vs ${nextThreshold}% needed)`,
    nextCheckAt: nextLevel,
    sellProbability,
  }
}

/**
 * Determine the roll quality tier based on raw Barion efficiency.
 * Independent of stat weights — purely measures how well the rune rolled.
 *
 * Thresholds approximate the efficiency of a rune where all rolls
 * hit at the max of each quality tier:
 * - Legend: >= 85% (all rolls near max)
 * - Hero: >= 70% (rolls at hero-quality max)
 * - Rare: >= 50% (rolls at rare-quality max)
 * - Magic: >= 30% (rolls at magic-quality max)
 * - Normal: < 30%
 */
export function getRollQualityTier(barionEfficiency: number): RuneQuality {
  if (barionEfficiency >= 85) return 'legend'
  if (barionEfficiency >= 70) return 'hero'
  if (barionEfficiency >= 50) return 'rare'
  if (barionEfficiency >= 30) return 'magic'
  return 'normal'
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

  const currentEfficiency = barionEfficiency(rune.subStats, quality)

  // Calculate synergy first — we need bestArchetype for weighted efficiency
  const synergy = calculateSynergy(rune.subStats, rune.innateStat)

  // Mark the worst substat for the best archetype as gem target
  if (synergy.bestArchetype && substats.length > 0) {
    const weights = STAT_PRIORITY_WEIGHTS[synergy.bestArchetype]
    let worstIdx = -1
    let worstWeight = Infinity
    for (let i = 0; i < substats.length; i++) {
      const sub = substats[i]!
      const w = weights[sub.type] ?? 0
      if (w < worstWeight) {
        worstWeight = w
        worstIdx = i
      }
    }
    if (worstIdx >= 0 && worstWeight < 0.5) {
      substats[worstIdx]!.isGemTarget = true
    }
  }

  // Use archetype-specific weights when a best archetype is found
  const currentWeightedEfficiency = weightedEfficiency(rune.subStats, quality, synergy.bestArchetype)
  const potentialEfficiency = calculatePotentialEfficiency(rune, quality)

  // Max efficiency: all events at max = 100%
  const maxEfficiency = 100

  // Grind potential is based on the potential at +12 (you grind after +12)
  const grindPotential = calculateGrindPotential(substats, potentialEfficiency, quality)

  // For pre-+12 runes, use potential efficiency for tier (should we keep powering up?)
  // For +12+ runes, use weighted efficiency (current value of the rune)
  const isPreMax = rune.level < 12
  const efficiencyForTier = isPreMax ? potentialEfficiency : currentWeightedEfficiency

  // Tier based on the appropriate efficiency metric
  const tier = getRecommendation(
    efficiencyForTier,
    12,
    profile,
    grindPotential.grindGain,
    synergy.synergyBonus,
  )

  // Tier with level strictness applied
  const levelKey = Math.min(Math.floor(rune.level / 3) * 3, 12)
  const levelStrictness = LEVEL_STRICTNESS[levelKey] ?? 0
  const adjustedTier = getRecommendation(
    efficiencyForTier,
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

  // Grinded efficiency = potential + grind bonus (no cap — grinds add real value)
  const roundedGrindedEfficiency = Math.round(grindPotential.efficiencyAfterGrind * 100) / 100
  const grindGainValue = Math.round(Math.max(0, grindPotential.grindGain) * 100) / 100

  // Potential efficiency: at +12 or above, no remaining events → potential = current
  const finalPotential = !isPreMax ? roundedCurrent : Math.round(Math.min(potentialEfficiency, 100) * 100) / 100

  // Progressive advice — actionable sell/upgrade/keep/grind recommendation
  const progressiveAdvice = calculateProgressiveAdvice(rune, quality, roundedWeighted, finalPotential, synergy, profile)

  // Roll quality tier — based on raw Barion efficiency only
  const rollQualityTier = getRollQualityTier(roundedCurrent)

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
    rollQualityTier,
    quality,
    totalRolls,
    setBonus,
    setPieces,
    synergy,
    progressiveAdvice,
  }
}
