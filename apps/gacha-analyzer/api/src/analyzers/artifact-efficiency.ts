/**
 * Summoners War Artifact Efficiency Analyzer
 *
 * Calculates artifact efficiency based on substat values, rates main stat
 * and substat quality, and produces an overall score with tier rating.
 *
 * Artifacts are simpler than runes:
 * - Main stat is always flat (ATK, DEF, or HP)
 * - Substats are conditional/skill-specific effects (% values)
 * - No grindstones or enchanted gems
 * - Max 4 substats at legend quality
 * - Level range: 0-15
 */

import type {
  ArtifactData,
  ArtifactMainStat,
  ArtifactQuality,
  ArtifactSubstatType,
} from '@gacha-analyzer/types'
import { ARTIFACT_MAIN_STAT_MAX, ARTIFACT_SUBSTATS_BY_QUALITY } from '@gacha-analyzer/types'

// --- Constants ---

/** Tier rating thresholds (overall score 0-100) */
export type ArtifactTier = 'S' | 'A' | 'B' | 'C' | 'D'

const TIER_THRESHOLDS: { min: number; tier: ArtifactTier }[] = [
  { min: 80, tier: 'S' },
  { min: 60, tier: 'A' },
  { min: 40, tier: 'B' },
  { min: 20, tier: 'C' },
  { min: 0, tier: 'D' },
]

/**
 * Substat max values (at legend quality, single roll max).
 * Artifacts substats are all percentage-based. The max value per roll varies
 * by substat category.
 *
 * Categories:
 * - Elemental DMG/Reduction: max 4% per roll
 * - Skill CD/Recovery/Accuracy: max 2 turns / 4%
 * - CRIT DMG (single/aoe): max 4%
 * - HP lost bonuses: max 6%
 * - Life drain, counter, coop, bomb: max 4%
 * - DMG reduction: max 4%
 * - Additional DMG: max 4%
 * - Recovery/Shield: max 4%
 * - SPD under HP threshold: max 8
 */
const SUBSTAT_MAX_VALUES: Record<ArtifactSubstatType, number> = {
  // Elemental DMG+
  'dmg-to-fire': 4,
  'dmg-to-water': 4,
  'dmg-to-wind': 4,
  'dmg-to-light': 4,
  'dmg-to-dark': 4,
  // Elemental DMG reduction
  'dmg-from-fire': 4,
  'dmg-from-water': 4,
  'dmg-from-wind': 4,
  'dmg-from-light': 4,
  'dmg-from-dark': 4,
  // Skill cooldown
  'skill1-cd': 1,
  'skill2-cd': 1,
  'skill3-cd': 1,
  'skill4-cd': 1,
  // Skill recovery
  'skill1-recovery': 4,
  'skill2-recovery': 4,
  'skill3-recovery': 4,
  // Skill accuracy
  'skill1-accuracy': 5,
  'skill2-accuracy': 5,
  'skill3-accuracy': 5,
  // CRIT DMG
  'crit-dmg-single': 4,
  'crit-dmg-aoe': 4,
  // HP lost bonuses
  'hp-lost-atk': 6,
  'hp-lost-def': 6,
  'hp-lost-spd': 6,
  'spd-under-hp-threshold': 8,
  // Misc combat
  'life-drain': 4,
  'counter-dmg': 4,
  'coop-dmg': 4,
  'bomb-dmg': 4,
  // DMG reduction
  'dmg-reduction-single': 4,
  'dmg-reduction-aoe': 4,
  // Additional DMG
  'additional-dmg-by-hp': 4,
  'additional-dmg-by-atk': 4,
  'additional-dmg-by-def': 4,
  'additional-dmg-by-spd': 4,
  // Recovery/Shield
  'recovery-hp': 4,
  'recovery-ally': 4,
  shield: 4,
}

/**
 * Substat desirability tiers — used for scoring.
 * S-tier substats are universally valuable, D-tier are niche.
 */
const SUBSTAT_DESIRABILITY: Partial<Record<ArtifactSubstatType, ArtifactTier>> = {
  'crit-dmg-single': 'S',
  'crit-dmg-aoe': 'S',
  'additional-dmg-by-atk': 'S',
  'additional-dmg-by-spd': 'A',
  'additional-dmg-by-hp': 'A',
  'additional-dmg-by-def': 'A',
  'hp-lost-atk': 'A',
  'hp-lost-def': 'A',
  'hp-lost-spd': 'A',
  'dmg-reduction-single': 'A',
  'dmg-reduction-aoe': 'A',
  'life-drain': 'B',
  'counter-dmg': 'B',
  'coop-dmg': 'B',
  'recovery-hp': 'B',
  'recovery-ally': 'B',
  shield: 'B',
  'bomb-dmg': 'C',
  'spd-under-hp-threshold': 'C',
}

const DESIRABILITY_WEIGHT: Record<ArtifactTier, number> = {
  S: 1.0,
  A: 0.8,
  B: 0.6,
  C: 0.4,
  D: 0.2,
}

// --- Public types ---

export interface ArtifactSubstatAnalysis {
  type: ArtifactSubstatType
  value: number
  /** Max possible value for this substat (single max roll * expected rolls) */
  maxValue: number
  /** Roll quality: value / maxValue as percentage (0-100) */
  rollQuality: number
  /** Tier rating for this substat value */
  tier: ArtifactTier
  /** Desirability tier (how universally useful this substat is) */
  desirability: ArtifactTier
}

export interface ArtifactMainStatAnalysis {
  type: ArtifactMainStat
  value: number
  maxValue: number
  /** Percentage of max at current level */
  efficiency: number
  tier: ArtifactTier
}

export interface ArtifactAnalysis {
  /** Main stat analysis */
  mainStat: ArtifactMainStatAnalysis
  /** Per-substat analysis */
  substats: ArtifactSubstatAnalysis[]
  /** Raw efficiency: average of substat roll qualities (0-100) */
  rawEfficiency: number
  /** Weighted efficiency: substats weighted by desirability (0-100) */
  weightedEfficiency: number
  /** Overall score combining main stat, substats, and quality (0-100) */
  overallScore: number
  /** Overall tier rating */
  tier: ArtifactTier
  /** Detected or provided quality */
  quality: ArtifactQuality
}

// --- Core functions ---

/**
 * Detect artifact quality from substat count.
 */
function detectQuality(artifact: ArtifactData): ArtifactQuality {
  if (artifact.quality) return artifact.quality

  const subCount = artifact.subStats.length
  if (subCount >= 4) return 'legend'
  if (subCount === 3) return 'hero'
  if (subCount === 2) return 'rare'
  if (subCount === 1) return 'magic'
  return 'normal'
}

/**
 * Estimate the number of rolls into a substat based on artifact level.
 * Artifacts upgrade substats every 3 levels (like runes): +3, +6, +9, +12.
 * Levels 13-15 only increase the main stat.
 */
function estimateSubstatRolls(quality: ArtifactQuality, level: number): number {
  const initialSubs = ARTIFACT_SUBSTATS_BY_QUALITY[quality]
  const powerups = Math.floor(Math.min(level, 12) / 3)
  // Each powerup goes into an existing substat (artifacts always have all subs by +0 for legend)
  // For non-legend, new subs are added first, then existing subs are rolled
  return Math.max(1, 1 + Math.floor(powerups / Math.max(initialSubs, 1)))
}

/**
 * Get the expected max value for a substat given estimated roll count.
 */
function getSubstatMaxValue(type: ArtifactSubstatType, rolls: number): number {
  const maxPerRoll = SUBSTAT_MAX_VALUES[type] ?? 4
  return maxPerRoll * rolls
}

/**
 * Rate a value as a tier based on its percentage of max (0-100).
 */
function rateTier(percent: number): ArtifactTier {
  for (const threshold of TIER_THRESHOLDS) {
    if (percent >= threshold.min) return threshold.tier
  }
  return 'D'
}

/**
 * Get the desirability tier for a substat type.
 */
function getDesirability(type: ArtifactSubstatType): ArtifactTier {
  return SUBSTAT_DESIRABILITY[type] ?? 'D'
}

/**
 * Calculate the main stat efficiency.
 * Main stat scales linearly from base to max (+15).
 * At +0, the expected value is roughly mainMax * (level / 15).
 */
function analyzeMainStat(
  mainStat: ArtifactData['mainStat'],
  level: number
): ArtifactMainStatAnalysis {
  const maxValue = ARTIFACT_MAIN_STAT_MAX[mainStat.type] ?? 100
  // Expected value at current level (linear interpolation)
  const expectedAtLevel = level >= 15 ? maxValue : Math.round(maxValue * (level / 15))
  const efficiency =
    expectedAtLevel > 0 ? Math.min(100, (mainStat.value / expectedAtLevel) * 100) : 100
  const tier = rateTier(efficiency)

  return {
    type: mainStat.type,
    value: mainStat.value,
    maxValue,
    efficiency,
    tier,
  }
}

/**
 * Analyze a single substat.
 */
function analyzeSubstat(
  stat: { type: ArtifactSubstatType; value: number },
  estimatedRolls: number
): ArtifactSubstatAnalysis {
  const maxValue = getSubstatMaxValue(stat.type, estimatedRolls)
  const rollQuality = maxValue > 0 ? Math.min(100, (stat.value / maxValue) * 100) : 0
  const tier = rateTier(rollQuality)
  const desirability = getDesirability(stat.type)

  return {
    type: stat.type,
    value: stat.value,
    maxValue,
    rollQuality,
    tier,
    desirability,
  }
}

// --- Main analysis function ---

/**
 * Analyze an artifact and produce efficiency scores and tier ratings.
 */
export function analyzeArtifact(artifact: ArtifactData): ArtifactAnalysis {
  const quality = detectQuality(artifact)
  const mainStatAnalysis = analyzeMainStat(artifact.mainStat, artifact.level)

  const rolls = estimateSubstatRolls(quality, artifact.level)
  const substats = artifact.subStats.map(s => analyzeSubstat(s, rolls))

  // Raw efficiency: simple average of substat roll qualities
  const rawEfficiency =
    substats.length > 0 ? substats.reduce((sum, s) => sum + s.rollQuality, 0) / substats.length : 0

  // Weighted efficiency: substats weighted by desirability
  let weightedSum = 0
  let weightTotal = 0
  for (const sub of substats) {
    const weight = DESIRABILITY_WEIGHT[sub.desirability]
    weightedSum += sub.rollQuality * weight
    weightTotal += 100 * weight // max possible contribution
  }
  const weightedEfficiency = weightTotal > 0 ? (weightedSum / weightTotal) * 100 : 0

  // Overall score: 30% main stat + 50% weighted efficiency + 20% quality bonus
  const qualityBonus: Record<ArtifactQuality, number> = {
    legend: 100,
    hero: 75,
    rare: 50,
    magic: 25,
    normal: 0,
  }
  const overallScore =
    mainStatAnalysis.efficiency * 0.3 +
    weightedEfficiency * 0.5 +
    (qualityBonus[quality] ?? 0) * 0.2

  const tier = rateTier(overallScore)

  return {
    mainStat: mainStatAnalysis,
    substats,
    rawEfficiency,
    weightedEfficiency,
    overallScore,
    tier,
    quality,
  }
}
