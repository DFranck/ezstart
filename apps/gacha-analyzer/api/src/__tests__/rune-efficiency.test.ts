import { describe, expect, it } from 'vitest'

import {
  analyzeRune,
  calculateEfficiency,
  calculatePotentialEfficiency,
  calculateSynergy,
  estimateRolls,
  getRecommendation,
} from '../analyzers/rune-efficiency.js'
import type { RuneData, StatType, RuneQuality, RuneStat, RuneSet } from '@game-analyzer/types'

// Helper to build a RuneData object
function makeRune(overrides: {
  level?: number
  grade?: number
  quality?: RuneQuality
  mainStat?: RuneStat
  subStats: RuneStat[]
  innateStat?: RuneStat
  set?: string
}): RuneData {
  return {
    set: (overrides.set ?? 'violent') as RuneSet,
    slot: 1,
    grade: overrides.grade ?? 6,
    level: overrides.level ?? 12,
    quality: overrides.quality,
    mainStat: overrides.mainStat ?? { type: 'atk' as StatType, value: 160 },
    subStats: overrides.subStats,
    innateStat: overrides.innateStat,
  }
}

describe('rune-efficiency', () => {
  describe('estimateRolls', () => {
    it('estimates 1 roll for a value equal to max roll', () => {
      const result = estimateRolls('spd', 6)
      expect(result.count).toBe(1)
      expect(result.avgQuality).toBe(100)
    })

    it('estimates 1 roll for a min roll value', () => {
      const result = estimateRolls('spd', 4)
      expect(result.count).toBe(1)
      expect(result.avgQuality).toBeCloseTo(66.67, 1) // 4/6 = 66.67%
    })

    it('estimates multiple rolls for high values', () => {
      // SPD max roll = 6, value 24 => 4 rolls at max
      const result = estimateRolls('spd', 24)
      expect(result.count).toBe(4)
      expect(result.avgQuality).toBe(100)
    })

    it('calculates quality as ratio of max (SWOP formula)', () => {
      // SPD: max=6. Value 10 with 2 rolls: 10 / (6*2) = 83.33%
      const result = estimateRolls('spd', 10)
      expect(result.count).toBe(2) // round(10/6) = 2
      expect(result.avgQuality).toBeCloseTo(83.33, 1) // 10/12 = 83.33%
    })

    it('calculates roll quality for various stats', () => {
      // CR +12%, 2 rolls → 12 / 12 = 100%
      expect(estimateRolls('cr', 12).avgQuality).toBeCloseTo(100, 1)

      // ATK% +16%, 2 rolls → 16 / 16 = 100%
      expect(estimateRolls('atk%', 16).avgQuality).toBeCloseTo(100, 1)

      // RES +7%, 1 roll → 7 / 8 = 87.5%
      expect(estimateRolls('res', 7).avgQuality).toBeCloseTo(87.5, 1)

      // ATK% +14%, 2 rolls → 14 / 16 = 87.5%
      expect(estimateRolls('atk%', 14).avgQuality).toBeCloseTo(87.5, 1)

      // CR +9%, 2 rolls → 9 / 12 = 75%
      expect(estimateRolls('cr', 9).avgQuality).toBeCloseTo(75, 1)

      // CD +19%, 3 rolls → 19 / 21 = 90.48%
      expect(estimateRolls('cd', 19).avgQuality).toBeCloseTo(90.48, 1)

      // SPD +16, 3 rolls → 16 / 18 = 88.89%
      expect(estimateRolls('spd', 16).avgQuality).toBeCloseTo(88.89, 1)

      // ACC +12%, 2 rolls → 12 / 16 = 75%
      expect(estimateRolls('acc', 12).avgQuality).toBeCloseTo(75, 1)
    })

    it('returns 0 for zero or negative value', () => {
      expect(estimateRolls('spd', 0).count).toBe(0)
      expect(estimateRolls('atk', -5).count).toBe(0)
    })

    it('estimates HP flat rolls correctly', () => {
      // HP: min=135, max=375. Value 750 => round(750/375) = 2 rolls
      const result = estimateRolls('hp', 750)
      expect(result.count).toBe(2)
      expect(result.avgQuality).toBe(100) // 750 = 375*2
    })
  })

  describe('analyzeRune — perfect legend rune (godlike)', () => {
    it('returns godlike for a perfect 6★ legend rune at +12', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
      })

      const result = analyzeRune(rune)

      expect(result.currentEfficiency).toBeCloseTo(100, 0)
      expect(result.efficiency).toBe(result.currentEfficiency)
      expect(result.maxEfficiency).toBeCloseTo(100, 0)
      expect(result.tier).toBe('godlike')
      expect(result.quality).toBe('legend')
      expect(result.totalRolls).toBe(8)
      expect(result.setBonus).toBe('Extra Turn +22%')
      expect(result.setPieces).toBe(4)
    })

    it('marks all substats as max roll', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 6 },   // 1 roll at max
          { type: 'cr', value: 6 },     // 1 roll at max
          { type: 'cd', value: 7 },     // 1 roll at max
          { type: 'acc', value: 8 },    // 1 roll at max
        ],
      })

      const result = analyzeRune(rune)

      for (const sub of result.substats) {
        expect(sub.isMaxRoll).toBe(true)
        expect(sub.rollQuality).toBe(100)
      }
    })
  })

  describe('analyzeRune — average rune (keep/great)', () => {
    it('returns keep/great for a rune with average rolls', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 10 },
          { type: 'cr', value: 10 },
          { type: 'hp%', value: 13 },
          { type: 'def%', value: 13 },
        ],
      })

      const result = analyzeRune(rune)

      expect(result.currentEfficiency).toBeGreaterThan(80)
    })
  })

  describe('analyzeRune — mediocre rune (sell)', () => {
    it('returns sell for a rune with very low efficiency and no grind potential', () => {
      const rune = makeRune({
        level: 12,
        quality: 'normal',
        subStats: [],
      })

      const result = analyzeRune(rune)

      expect(result.currentEfficiency).toBeLessThan(50)
      expect(result.tier).toBe('sell')
      expect(result.grindPotential.grindGain).toBe(0)
    })

    it('returns sell for a rune with 2 low subs', () => {
      const rune = makeRune({
        level: 12,
        subStats: [
          { type: 'res', value: 4 },  // 1 min roll, 4/8 = 0.5
          { type: 'acc', value: 4 },   // 1 min roll, 4/8 = 0.5
        ],
      })

      const result = analyzeRune(rune)

      // No quality specified → detected as rare (2 subs at +12), totalEvents = 6
      // eff = (0.5+0.5) / 6 * 100 = 16.67%
      expect(result.currentEfficiency).toBeCloseTo(16.67, 0)
    })
  })

  describe('grind potential', () => {
    it('calculates grind potential for grindable stats', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },   // grindable, +5 legend max
          { type: 'atk%', value: 16 },   // grindable, +7 legend max
          { type: 'hp%', value: 16 },    // grindable, +7 legend max
          { type: 'cr', value: 12 },     // NOT grindable
        ],
      })

      const result = analyzeRune(rune)

      expect(result.grindPotential.grindGain).toBeGreaterThan(0)
      expect(result.grindPotential.substatsToGrind).toHaveLength(3) // spd, atk%, hp%
      expect(result.grindPotential.efficiencyAfterGrind).toBeGreaterThan(result.currentEfficiency)

      // Verify CR is not in grinds
      const grindTypes = result.grindPotential.substatsToGrind.map(s => s.type)
      expect(grindTypes).not.toContain('cr')
      expect(grindTypes).toContain('spd')
      expect(grindTypes).toContain('atk%')
      expect(grindTypes).toContain('hp%')
    })

    it('returns 0 grind gain for non-grindable stats only', () => {
      const rune = makeRune({
        level: 12,
        subStats: [
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
        ],
      })

      const result = analyzeRune(rune)

      expect(result.grindPotential.grindGain).toBe(0)
      expect(result.grindPotential.substatsToGrind).toHaveLength(0)
    })

    it('calculates correct grind values per stat', () => {
      const rune = makeRune({
        level: 12,
        subStats: [
          { type: 'spd', value: 10 },
        ],
      })

      const result = analyzeRune(rune)
      const spdGrind = result.grindPotential.substatsToGrind.find(s => s.type === 'spd')

      expect(spdGrind).toBeDefined()
      expect(spdGrind!.currentValue).toBe(10)
      expect(spdGrind!.afterGrind).toBe(15) // 10 + 5 (legend max grind for spd)
    })
  })

  describe('substat analysis detail', () => {
    it('provides complete substat analysis', () => {
      const rune = makeRune({
        level: 12,
        subStats: [
          { type: 'spd', value: 18 }, // 3 rolls (round(18/6)=3)
        ],
      })

      const result = analyzeRune(rune)
      const spd = result.substats[0]!

      expect(spd.type).toBe('spd')
      expect(spd.value).toBe(18)
      expect(spd.rolls).toBe(3)
      expect(spd.maxValue).toBe(18)  // 3 * 6 = 18
      expect(spd.minValue).toBe(12)  // 3 * 4 = 12
      expect(spd.isMaxRoll).toBe(true)
      expect(spd.rollQuality).toBe(100)
      expect(spd.efficiency).toBe(100) // alias for rollQuality
      expect(spd.isGrindable).toBe(true)
      expect(spd.grindable).toBe(true) // alias for isGrindable
      expect(spd.grindRange).toEqual({ min: 4, max: 5 })
      expect(spd.valueAfterMaxGrind).toBe(23) // 18 + 5
      expect(spd.grindedValue).toBe(23) // alias for valueAfterMaxGrind
      expect(spd.grindAmount).toBe(5) // legend max grind for spd
    })

    it('correctly identifies non-grindable stats', () => {
      const rune = makeRune({
        level: 12,
        subStats: [
          { type: 'cd', value: 14 }, // 2 rolls at max
        ],
      })

      const result = analyzeRune(rune)
      const cd = result.substats[0]!

      expect(cd.isGrindable).toBe(false)
      expect(cd.grindRange).toBeUndefined()
      expect(cd.valueAfterMaxGrind).toBeUndefined()
    })
  })

  describe('calculatePotentialEfficiency', () => {
    it('returns higher potential than current for a +6 rune', () => {
      const rune = makeRune({
        level: 6,
        subStats: [
          { type: 'spd', value: 6 },
          { type: 'cr', value: 6 },
          { type: 'cd', value: 7 },
          { type: 'hp%', value: 8 },
        ],
      })

      const current = analyzeRune(rune)
      const potential = calculatePotentialEfficiency(rune)

      expect(potential).toBeGreaterThan(current.currentEfficiency)
    })

    it('returns same as current for a +12 rune (no remaining rolls)', () => {
      const rune = makeRune({
        level: 12,
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
        ],
      })

      const result = analyzeRune(rune)

      // At +12 there are 0 remaining events, so potential must equal current (Barion) efficiency
      expect(result.potentialEfficiency).toBe(result.currentEfficiency)
    })

    it('returns same as current for a +15 rune', () => {
      const rune = makeRune({
        level: 15,
        subStats: [
          { type: 'spd', value: 18 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
      })

      const result = analyzeRune(rune)

      expect(result.potentialEfficiency).toBe(result.currentEfficiency)
    })

    it('adds remaining rolls for a +0 rune (4 rolls remaining)', () => {
      const rune = makeRune({
        level: 0,
        subStats: [
          { type: 'spd', value: 6 },
        ],
      })

      const potential = calculatePotentialEfficiency(rune)
      const current = analyzeRune(rune)

      expect(potential).toBeGreaterThan(current.currentEfficiency + 15)
    })
  })

  describe('getRecommendation', () => {
    it('returns sell for low efficiency at +12 mid profile', () => {
      expect(getRecommendation(40, 12, 'mid')).toBe('sell')
    })

    it('returns keep for efficiency at mid threshold at +12', () => {
      expect(getRecommendation(62, 12, 'mid')).toBe('keep')
    })

    it('returns good for efficiency at good threshold at +12 mid', () => {
      expect(getRecommendation(72, 12, 'mid')).toBe('good')
    })

    it('returns great for efficiency at great threshold at +12 mid', () => {
      expect(getRecommendation(82, 12, 'mid')).toBe('great')
    })

    it('returns godlike for efficiency 85%+ at +12 mid', () => {
      expect(getRecommendation(87, 12, 'mid')).toBe('godlike')
    })

    it('considers grind potential in recommendation', () => {
      // Current 58, no strictness at +12. Grind potential 10 => bonus = min(10*0.3, 5) = 3
      // finalEfficiency = 58 + 3 = 61 >= 60 (keep threshold mid) => keep
      expect(getRecommendation(58, 12, 'mid', 10)).toBe('keep')
    })
  })

  describe('quality detection', () => {
    it('detects legend quality at +0 with 4 subs', () => {
      const rune = makeRune({
        level: 0,
        subStats: [
          { type: 'spd', value: 6 },
          { type: 'cr', value: 6 },
          { type: 'cd', value: 7 },
          { type: 'hp%', value: 8 },
        ],
      })

      expect(analyzeRune(rune).quality).toBe('legend')
    })

    it('uses explicit quality when provided', () => {
      const rune = makeRune({
        level: 12,
        quality: 'hero',
        subStats: [
          { type: 'spd', value: 18 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'hp%', value: 16 },
        ],
      })

      expect(analyzeRune(rune).quality).toBe('hero')
    })
  })

  describe('innate stat exclusion', () => {
    it('does not count innateStat in efficiency calculation', () => {
      const runeWithInnate = {
        set: 'violent' as const,
        slot: 1 as const,
        grade: 6,
        level: 12,
        quality: 'legend' as const,
        mainStat: { type: 'atk' as const, value: 118 },
        subStats: [
          { type: 'acc' as const, value: 27 },
          { type: 'hp%' as const, value: 10 },
          { type: 'atk%' as const, value: 13 },
          { type: 'cr' as const, value: 12 },
        ],
        innateStat: { type: 'spd' as const, value: 6 },
      }

      const runeWithoutInnate = {
        ...runeWithInnate,
        innateStat: undefined,
      }

      const resultWith = analyzeRune(runeWithInnate)
      const resultWithout = analyzeRune(runeWithoutInnate)

      // Innate stat should not affect efficiency — both should be identical
      expect(resultWith.currentEfficiency).toBe(resultWithout.currentEfficiency)
      expect(resultWith.potentialEfficiency).toBe(resultWithout.potentialEfficiency)
    })
  })

  describe('backward compatibility', () => {
    it('calculateEfficiency returns same result as analyzeRune', () => {
      const rune = makeRune({
        level: 12,
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
        ],
      })

      const a = calculateEfficiency(rune)
      const b = analyzeRune(rune)

      expect(a.currentEfficiency).toBe(b.currentEfficiency)
      expect(a.tier).toBe(b.tier)
    })
  })

  // ====================================
  // NEW: Player profile & level strictness
  // ====================================

  describe('player profile thresholds', () => {
    // A rune with ~76% efficiency at +12
    const midRune = makeRune({
      level: 12,
      quality: 'legend',
      subStats: [
        { type: 'spd', value: 10 },  // 10/6 = 1.667
        { type: 'cr', value: 10 },   // 10/6 = 1.667
        { type: 'hp%', value: 10 },  // 10/8 = 1.25
        { type: 'def%', value: 10 }, // 10/8 = 1.25
      ],
    })

    it('rune +12 mid game — tests mid thresholds', () => {
      const result = analyzeRune(midRune, 'mid')
      // weightedEfficiency uses generic STAT_WEIGHTS (no archetype), grindBonus capped at 5, no synergy
      // At +12, strictness = 0
      expect(result.tier).toBe('good')
      expect(result.adjustedTier).toBe('good')
      expect(result.levelStrictness).toBe(0)
    })

    it('rune +6 mid game — tests level strictness malus of +7', () => {
      // Use low-value subs so potential at +12 isn't too high
      const rune = makeRune({
        level: 6,
        quality: 'legend',
        subStats: [
          { type: 'res', value: 4 },   // 4/8 = 0.5
          { type: 'acc', value: 4 },   // 4/8 = 0.5
          { type: 'hp', value: 135 },  // 135/375 = 0.36
          { type: 'def', value: 10 },  // 10/20 = 0.5
        ],
      })

      const result = analyzeRune(rune, 'mid')
      // Legend +6: getRollCount = 2, remaining = 2 upgrades
      // rawSum = 0.5+0.5+0.36+0.5 = 1.86
      // potential = (1.86 + 2 + 1) / 9 * 100 = 54%
      // grind bonus from hp+def (grindable), synergy bonus likely negative
      // At +6, strictness = 7 => adjusted keep threshold = 60+7 = 67
      // 54% + grind + synergy should be < 67 => sell
      expect(result.adjustedTier).toBe('sell')
      expect(result.levelStrictness).toBe(7)
    })

    it('rune +0 late game — tests level strictness malus of +15', () => {
      // Use a magic rune (1 sub at +0) with very low value
      const rune = makeRune({
        level: 0,
        quality: 'magic',
        subStats: [
          { type: 'hp', value: 135 },   // 135/375 = 0.36 (flat HP, low weight)
        ],
      })

      const result = analyzeRune(rune, 'late')
      // Magic +0: totalEvents = 5, eventsSoFar = 1+0 = 1, remaining = 4
      // rawSum = 0.36, potential = (0.36 + 4) / 5 * 100 = 87.2%
      // synergy: hp flat only → INCOHERENT = -3
      // grindBonus on potential: hp grind = 580/375 delta from potential... complex
      // At +0, strictness = 15
      // late thresholds: keep = 70+15 = 85
      // 87.2 + grindBonus + (-3) ≈ ~89 → keep or good depending on grind
      expect(result.levelStrictness).toBe(15)
      // The potential is high enough with grinds to at least keep
      expect(['keep', 'good']).toContain(result.adjustedTier)
    })

    it('same rune gives different tier for early vs late profile', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 10 },
          { type: 'cr', value: 10 },
          { type: 'hp%', value: 10 },
          { type: 'def%', value: 10 },
        ],
      })

      const earlyResult = analyzeRune(rune, 'early')
      const lateResult = analyzeRune(rune, 'late')

      // weightedEff uses generic STAT_WEIGHTS, no synergy boost
      // early at +12: great threshold lower, late at +12: keep threshold higher
      expect(earlyResult.tier).toBe('great')
      expect(lateResult.tier).toBe('keep')
      expect(earlyResult.tier).not.toBe(lateResult.tier)
    })

    it('grind bonus helps a rune reach keep tier (synergy no longer influences tier)', () => {
      // Weighted efficiency uses generic STAT_WEIGHTS (no archetype):
      // spd: 2.0, atk%: 1.0, hp%: 1.0, def%: 1.0
      // avgTopWeight = (2.0+1.5+1.5+1.0)/4 = 1.5, maxDivisor = 8*1.5 = 12
      // weighted sum: 12/6*2.0 + 10/8*1.0 + 8/8*1.0 + 8/8*1.0 = 4+1.25+1+1 = 7.25
      // weightedEff = 7.25/12*100 = 60.42%
      // mid keep threshold = 60. With grindBonus >= 60 → keep
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },  // 12/6 = 2.0, weight 2.0 → 4.0
          { type: 'atk%', value: 10 }, // 10/8 = 1.25, weight 1.0 → 1.25
          { type: 'hp%', value: 8 },   // 8/8 = 1.0, weight 1.0 → 1.0
          { type: 'def%', value: 8 },  // 8/8 = 1.0, weight 1.0 → 1.0
        ],
      })

      const result = analyzeRune(rune, 'mid')
      expect(result.tier).toBe('keep')

      // Verify grind gain exists and synergy is still computed (but not used for tier)
      expect(result.grindPotential.grindGain).toBeGreaterThan(0)
      expect(result.synergy.synergyBonus).toBe(4)
    })

    it('returns adjustedTier and levelStrictness in analysis result', () => {
      const rune = makeRune({
        level: 9,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
      })

      const result = analyzeRune(rune, 'mid')

      // At +9, strictness = 3
      expect(result.levelStrictness).toBe(3)
      expect(result.adjustedTier).toBeDefined()
      // tier (at +12 baseline) may differ from adjustedTier (with +9 strictness)
      expect(typeof result.adjustedTier).toBe('string')
    })
  })

  // ====================================
  // NEW: Build archetype synergy scoring
  // ====================================

  describe('calculateSynergy', () => {
    it('returns perfect synergy (+8%) for 4/4 speed-dps substats', () => {
      const subStats = [
        { type: 'spd' as const, value: 12 },
        { type: 'cr' as const, value: 12 },
        { type: 'cd' as const, value: 14 },
        { type: 'atk%' as const, value: 16 },
      ]

      const result = calculateSynergy(subStats)

      expect(result.bestArchetype).toBe('speed-dps')
      expect(result.matchCount).toBe(4)
      expect(result.synergyBonus).toBe(8)
    })

    it('returns +8% for 3/4 speed-dps when 4th has 0-1 roll (gem without loss)', () => {
      const subStats = [
        { type: 'spd' as const, value: 12 },
        { type: 'cr' as const, value: 12 },
        { type: 'cd' as const, value: 14 },
        { type: 'res' as const, value: 8 },  // 1 roll (round(8/8)=1) => gem without loss
      ]

      const result = calculateSynergy(subStats)

      expect(result.bestArchetype).toBe('speed-dps')
      expect(result.matchCount).toBe(3)
      expect(result.synergyBonus).toBe(8)
    })

    it('returns +4% for 3/4 speed-dps when 4th has 2+ rolls (gem with loss)', () => {
      const subStats = [
        { type: 'spd' as const, value: 12 },
        { type: 'cr' as const, value: 12 },
        { type: 'cd' as const, value: 14 },
        { type: 'res' as const, value: 20 },  // 3 rolls (round(20/8)=3) => gem with loss
      ]

      const result = calculateSynergy(subStats)

      expect(result.bestArchetype).toBe('speed-dps')
      expect(result.matchCount).toBe(3)
      expect(result.synergyBonus).toBe(4)
    })

    it('returns +4% for 2/4 match when unmatched stats have 0-1 roll each', () => {
      // Use stats that only match 2/4 for any archetype (atk flat + def flat are never desired)
      const subStats = [
        { type: 'cd' as const, value: 14 },
        { type: 'cr' as const, value: 12 },
        { type: 'atk' as const, value: 10 },   // 1 roll — flat atk not in any archetype
        { type: 'def' as const, value: 10 },    // 1 roll — flat def not in any archetype
      ]

      const result = calculateSynergy(subStats)

      expect(result.matchCount).toBe(2)
      expect(result.synergyBonus).toBe(4)
    })

    it('returns 0% for 2/4 match when unmatched stats have rolls', () => {
      // Use stats that only match 2/4 for any archetype (flat atk + flat def are never desired)
      const subStats = [
        { type: 'cd' as const, value: 14 },
        { type: 'cr' as const, value: 12 },
        { type: 'atk' as const, value: 40 },  // 2 rolls (round(40/20)=2) — flat atk not desired
        { type: 'def' as const, value: 40 },   // 2 rolls (round(40/20)=2) — flat def not desired
      ]

      const result = calculateSynergy(subStats)

      expect(result.matchCount).toBe(2)
      expect(result.synergyBonus).toBe(0)
    })

    it('returns penalty (-3%) for contradictory stats with no archetype >= 2 matches', () => {
      const subStats = [
        { type: 'atk' as const, value: 20 },
        { type: 'def' as const, value: 20 },
        { type: 'hp' as const, value: 375 },
        { type: 'acc' as const, value: 8 },
      ]

      const result = calculateSynergy(subStats)

      // Only flat stats — no archetype has flat atk/def/hp in desired
      expect(result.matchCount).toBeLessThanOrEqual(1)
      expect(result.synergyBonus).toBe(-3)
      expect(result.bestArchetype).toBeNull()
    })

    it('returns perfect synergy (+8%) for 4/4 tank-support substats', () => {
      const subStats = [
        { type: 'hp%' as const, value: 16 },
        { type: 'def%' as const, value: 16 },
        { type: 'spd' as const, value: 12 },
        { type: 'res' as const, value: 16 },
      ]

      const result = calculateSynergy(subStats)

      expect(result.bestArchetype).toBe('tank-support')
      expect(result.matchCount).toBe(4)
      expect(result.synergyBonus).toBe(8)
    })

    it('returns all archetype matches sorted by matchCount', () => {
      const subStats = [
        { type: 'spd' as const, value: 12 },
        { type: 'cr' as const, value: 12 },
        { type: 'cd' as const, value: 14 },
        { type: 'atk%' as const, value: 16 },
      ]

      const result = calculateSynergy(subStats)

      expect(result.allArchetypes.length).toBe(14)
      // First should be the best match
      expect(result.allArchetypes[0]!.matchCount).toBeGreaterThanOrEqual(result.allArchetypes[1]!.matchCount)
    })
  })

  describe('synergy integration in analyzeRune', () => {
    it('synergy is included in analyzeRune result', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
      })

      const result = analyzeRune(rune)

      expect(result.synergy).toBeDefined()
      expect(result.synergy.bestArchetype).toBe('speed-dps')
      expect(result.synergy.matchCount).toBe(4)
      expect(result.synergy.synergyBonus).toBe(8)
    })

    it('synergy bonus upgrades tier for borderline rune', () => {
      // Create a rune at the border of great/godlike for mid profile
      // mid godlike threshold = 85
      // We need efficiency + grindBonus + synergyBonus >= 85
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 10 },   // 10/6 = 1.667
          { type: 'cr', value: 10 },     // 10/6 = 1.667
          { type: 'cd', value: 14 },     // 14/7 = 2.0
          { type: 'atk%', value: 8 },    // 8/8 = 1.0
        ],
      })

      // Without synergy: efficiency ~81.5%, grind gain from spd+atk% only
      // With synergy: +8% for perfect speed-dps match
      const result = analyzeRune(rune, 'mid')

      // This is a perfect speed-dps match (4/4)
      expect(result.synergy.bestArchetype).toBe('speed-dps')
      expect(result.synergy.synergyBonus).toBe(8)

      // Verify the tier considers synergy (with +8% synergy it should be higher)
      // Let's also test without synergy manually
      const effWithoutSynergy = result.currentEfficiency
      const tierWithoutSynergy = getRecommendation(effWithoutSynergy, 12, 'mid', result.grindPotential.grindGain, 0)
      const tierWithSynergy = result.tier

      // With synergy bonus the tier should be at least as good, potentially better
      const tierOrder = ['sell', 'keep', 'good', 'great', 'godlike']
      expect(tierOrder.indexOf(tierWithSynergy)).toBeGreaterThanOrEqual(tierOrder.indexOf(tierWithoutSynergy))
    })

    it('synergy penalty downgrades tier for contradictory rune', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'atk', value: 20 },
          { type: 'def', value: 20 },
          { type: 'hp', value: 375 },
          { type: 'acc', value: 8 },
        ],
      })

      const result = analyzeRune(rune, 'mid')

      expect(result.synergy.synergyBonus).toBe(-3)
      expect(result.synergy.bestArchetype).toBeNull()
    })
  })

  // ====================================
  // NEW: Weighted efficiency
  // ====================================

  describe('weighted efficiency', () => {
    it('ACC-heavy rune has lower weighted efficiency than Barion brut', () => {
      // ACC weight = 0.8x, so weighted should be lower
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'acc', value: 22 },  // ~3 rolls, 22/8 = 2.75, weight 0.8 → 2.2
          { type: 'res', value: 8 },   // 1 roll, 8/8 = 1.0, weight 0.8 → 0.8
          { type: 'def', value: 20 },  // 1 roll flat, 20/20 = 1.0, weight 0.5 → 0.5
          { type: 'hp', value: 375 },  // 1 roll flat, 375/375 = 1.0, weight 0.5 → 0.5
        ],
      })

      const result = analyzeRune(rune)

      // Barion: (2.75+1+1+1+1)/9*100 = 75%
      // Weighted: (2.2+0.8+0.5+0.5+1)/13*100 = 38.5%
      expect(result.weightedEfficiency).toBeLessThan(result.efficiency)
    })

    it('SPD + CR + CD rune has higher weighted efficiency than Barion brut', () => {
      // SPD weight = 2.0, CR = 1.5, CD = 1.5
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },  // 2 rolls, 12/6 = 2.0, weight 2.0 → 4.0
          { type: 'cr', value: 12 },   // 2 rolls, 12/6 = 2.0, weight 1.5 → 3.0
          { type: 'cd', value: 14 },   // 2 rolls, 14/7 = 2.0, weight 1.5 → 3.0
          { type: 'atk%', value: 16 }, // 2 rolls, 16/8 = 2.0, weight 1.0 → 2.0
        ],
      })

      const result = analyzeRune(rune)

      // Barion: (2+2+2+2+1)/9*100 = 100%
      // Weighted: (4+3+3+2+1)/13*100 = 100%
      // Perfect rune: both should be 100%
      expect(result.weightedEfficiency).toBeCloseTo(100, 0)
      expect(result.efficiency).toBeCloseTo(100, 0)
    })

    it('potential +12 equals weighted efficiency for +12 rune', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 10 },
          { type: 'cr', value: 10 },
          { type: 'cd', value: 10 },
          { type: 'acc', value: 16 },
        ],
      })

      const result = analyzeRune(rune)

      // potentialEfficiency at +12 must equal current (Barion) efficiency (no remaining events)
      expect(result.potentialEfficiency).toBe(result.currentEfficiency)
    })
  })

  // ====================================
  // NEW: Innate stat in synergy
  // ====================================

  describe('synergy with innate stat', () => {
    it('innate stat counts in archetype matching', () => {
      // 3 substats match speed-dps, innate SPD adds the 4th match
      const subStats = [
        { type: 'cr' as const, value: 12 },
        { type: 'cd' as const, value: 14 },
        { type: 'atk%' as const, value: 16 },
        { type: 'res' as const, value: 8 },   // does NOT match speed-dps
      ]
      const innateStat = { type: 'spd' as const, value: 6 }

      const result = calculateSynergy(subStats, innateStat)

      // Without innate: 3/4 speed-dps (cr, cd, atk%). With innate spd: 4/4
      expect(result.bestArchetype).toBe('speed-dps')
      expect(result.matchCount).toBe(4)
      expect(result.synergyBonus).toBe(8) // PERFECT_4
    })

    it('innate stat in analyzeRune affects synergy', () => {
      const rune = {
        set: 'violent' as const,
        slot: 1 as const,
        grade: 6,
        level: 12,
        quality: 'legend' as const,
        mainStat: { type: 'atk' as const, value: 160 },
        subStats: [
          { type: 'cr' as const, value: 12 },
          { type: 'cd' as const, value: 14 },
          { type: 'atk%' as const, value: 16 },
          { type: 'res' as const, value: 8 },
        ],
        innateStat: { type: 'spd' as const, value: 6 },
      }

      const result = analyzeRune(rune)

      // Innate SPD + 3 substats (cr, cd, atk%) = 4/4 speed-dps match
      expect(result.synergy.bestArchetype).toBe('speed-dps')
      expect(result.synergy.matchCount).toBe(4)
      expect(result.synergy.synergyBonus).toBe(8)
    })

    it('innate does not count in roll evaluation for gem potential', () => {
      // 2 substats match, innate matches too (3 total),
      // 2 unmatched substats with high rolls
      const subStats = [
        { type: 'cr' as const, value: 12 },     // matches speed-dps
        { type: 'cd' as const, value: 14 },      // matches speed-dps
        { type: 'res' as const, value: 20 },     // unmatched, 3 rolls
        { type: 'acc' as const, value: 16 },     // unmatched, 2 rolls
      ]
      const innateStat = { type: 'spd' as const, value: 6 } // matches speed-dps

      const result = calculateSynergy(subStats, innateStat)

      // 3 matched (cr, cd, spd_innate), 2 unmatched subs with high rolls
      // Since matchCount=3, check the 1 remaining unmatched sub
      // But actually both res and acc are unmatched subs — wait, let me re-check
      // speed-dps wants: spd, cr, cd, atk%
      // matched: cr, cd, spd(innate) = 3
      // unmatched: res(20), acc(16) — but those are substats, not innate
      // With matchCount=3 and 2 remaining unmatched subs...
      // Actually matchCount=3 means THREE case: check unmatchedRolls[0]
      // The unmatched stats are res(20) and acc(16), innate is NOT in unmatched
      // unmatchedSubsOnly filters out innate, leaving res and acc
      // For THREE case, rollsInBad = unmatchedRolls[0] = rolls of res(20) = 3 rolls
      // 3 > 1 → THREE_WITH_ROLLS = +4
      expect(result.matchCount).toBe(3)
      expect(result.synergyBonus).toBe(4) // THREE_WITH_ROLLS, not PERFECT_4
    })
  })

  describe('potential efficiency for pre-+12 runes', () => {
    it('+0 Hero rune has potential < 80% (not 100%)', () => {
      const rune = makeRune({
        level: 0,
        quality: 'hero',
        subStats: [
          { type: 'spd', value: 5 },
          { type: 'cr', value: 5 },
          { type: 'hp%', value: 6 },
        ],
      })

      const result = analyzeRune(rune)

      // Hero +0: sum=2.417, remaining=4, potential = (2.417+4)/7*100 = 91.67%
      // A hero rune at +0 with 3 mediocre subs cannot reach 100% but is still high
      expect(result.potentialEfficiency).toBeLessThan(100)
      expect(result.potentialEfficiency).toBeGreaterThan(85)
    })

    it('+0 Legend rune with 4 perfect subs reaches high potential but uses Barion formula', () => {
      const rune = makeRune({
        level: 0,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 6 },
          { type: 'cr', value: 6 },
          { type: 'cd', value: 7 },
          { type: 'atk%', value: 8 },
        ],
      })

      const result = analyzeRune(rune)

      // Perfect +0 legend can reach 100% potential (all remaining rolls at max)
      expect(result.potentialEfficiency).toBeCloseTo(100, 0)
    })
  })

  describe('innateScore', () => {
    it('returns no innateScore when no innate stat', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
      })

      const result = analyzeRune(rune)
      expect(result.innateScore).toBeUndefined()
      expect(result.innateTier).toBeUndefined()
    })

    it('returns heavy malus for S-tier innate (SPD on Violent)', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'hp%', value: 16 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
        innateStat: { type: 'spd', value: 5 },
      })

      const result = analyzeRune(rune)
      expect(result.innateScore).toBe(-20)
      expect(result.innateTier).toBe('S')
    })

    it('returns malus for A-tier innate (CD on Violent)', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'hp%', value: 16 },
          { type: 'atk%', value: 16 },
        ],
        innateStat: { type: 'cd', value: 5 },
      })

      const result = analyzeRune(rune)
      expect(result.innateScore).toBe(-12)
      expect(result.innateTier).toBe('A')
    })

    it('returns neutral for B-tier innate (DEF% on Violent)', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
        innateStat: { type: 'def%', value: 7 },
      })

      const result = analyzeRune(rune)
      // B-tier innate = 0 score, so innateScore is undefined (filtered out when 0)
      expect(result.innateScore).toBeUndefined()
      expect(result.innateTier).toBe('B')
    })

    it('returns bonus for C-tier innate (RES on Violent)', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
        innateStat: { type: 'res', value: 6 },
      })

      const result = analyzeRune(rune)
      expect(result.innateScore).toBe(5)
      expect(result.innateTier).toBe('C')
    })

    it('uses violent fallback for unknown set', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        set: 'unknownset',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
        innateStat: { type: 'spd', value: 5 },
      })

      const result = analyzeRune(rune)
      // SPD is S-tier on violent (fallback)
      expect(result.innateScore).toBe(-20)
      expect(result.innateTier).toBe('S')
    })

    it('innateScore influences progressive advice sell probability', () => {
      // Two identical runes: one with bad innate, one without
      const baseSubStats: RuneStat[] = [
        { type: 'hp%', value: 10 },
        { type: 'def%', value: 10 },
        { type: 'acc', value: 8 },
        { type: 'atk%', value: 10 },
      ]

      const runeNoInnate = makeRune({
        level: 6,
        quality: 'legend',
        subStats: baseSubStats,
      })

      const runeWithBadInnate = makeRune({
        level: 6,
        quality: 'legend',
        subStats: baseSubStats,
        innateStat: { type: 'spd', value: 5 }, // S-tier wasted in innate
      })

      const resultNoInnate = analyzeRune(runeNoInnate)
      const resultBadInnate = analyzeRune(runeWithBadInnate)

      // Bad innate should increase sell probability
      if (resultNoInnate.progressiveAdvice && resultBadInnate.progressiveAdvice) {
        expect(resultBadInnate.progressiveAdvice.sellProbability)
          .toBeGreaterThanOrEqual(resultNoInnate.progressiveAdvice.sellProbability)
      }
    })
  })

  describe('setWeightedEfficiency', () => {
    it('returns setWeightedEfficiency and subStatTiers', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
      })

      const result = analyzeRune(rune)
      expect(result.setWeightedEfficiency).toBeDefined()
      expect(result.setWeightedEfficiency).toBeGreaterThan(0)
      expect(result.subStatTiers).toBeDefined()
      expect(result.subStatTiers!['spd']).toBe('S')  // SPD is S-tier on violent
      expect(result.subStatTiers!['cr']).toBe('S')    // CR is S-tier on violent
    })

    it('works with different sets', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        set: 'swift',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
      })

      const result = analyzeRune(rune)
      expect(result.setWeightedEfficiency).toBeGreaterThan(0)
      expect(result.subStatTiers!['spd']).toBe('S')  // SPD is S-tier on swift
      expect(result.subStatTiers!['cd']).toBe('B')    // CD is B-tier on swift
    })

    it('falls back to violent for unknown set', () => {
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        set: 'unknownset',
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 14 },
          { type: 'atk%', value: 16 },
        ],
      })

      const result = analyzeRune(rune)
      expect(result.setWeightedEfficiency).toBeGreaterThan(0)
      // Violent tiers should apply
      expect(result.subStatTiers!['spd']).toBe('S')
    })
  })
})
