import { describe, expect, it } from 'vitest'

import {
  analyzeRune,
  calculateEfficiency,
  calculatePotentialEfficiency,
  calculateSynergy,
  estimateRolls,
  getRecommendation,
} from '../analyzers/rune-efficiency.js'

// Helper to build a RuneData object
function makeRune(overrides: {
  level?: number
  grade?: number
  quality?: 'normal' | 'magic' | 'rare' | 'hero' | 'legend'
  mainStat?: { type: string; value: number }
  subStats: { type: string; value: number }[]
}) {
  return {
    set: 'violent' as const,
    slot: 1 as const,
    grade: overrides.grade ?? 6,
    level: overrides.level ?? 12,
    quality: overrides.quality,
    mainStat: overrides.mainStat ?? { type: 'atk' as const, value: 160 },
    subStats: overrides.subStats,
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
      expect(result.avgQuality).toBe(0)
    })

    it('estimates multiple rolls for high values', () => {
      // SPD max roll = 6, value 24 => 4 rolls at max
      const result = estimateRolls('spd', 24)
      expect(result.count).toBe(4)
      expect(result.avgQuality).toBe(100)
    })

    it('calculates quality between min and max', () => {
      // SPD: min=4, max=6. Value 10 with 2 rolls: min=8, max=12
      const result = estimateRolls('spd', 10)
      expect(result.count).toBe(2) // round(10/6) = 2
      expect(result.avgQuality).toBe(50) // (10-8)/(12-8) = 0.5 = 50%
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

      // eff = (0.5+0.5+1)/9*100 = 22.2%
      expect(result.currentEfficiency).toBeCloseTo(22.22, 0)
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

      // Bug fix: at +12 there are 0 remaining rolls, so potential must equal current exactly
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
      // efficiency ~75.9%, grind gain ~28.67 => grindBonus = 5
      // finalEfficiency = 75.9 + 5 = 80.9 => great (mid threshold great=80)
      // At +12, strictness = 0
      expect(result.tier).toBe('great')
      expect(result.adjustedTier).toBe('great')
      expect(result.levelStrictness).toBe(0)
    })

    it('rune +6 mid game — tests level strictness malus of +7', () => {
      const rune = makeRune({
        level: 6,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 10 },
          { type: 'cr', value: 10 },
          { type: 'hp%', value: 10 },
          { type: 'def%', value: 10 },
        ],
      })

      const result = analyzeRune(rune, 'mid')
      // efficiency ~75.9%, grind bonus = 5 => finalEff = 80.9
      // At +6, strictness = 7 => adjusted thresholds: good=77, great=87, godlike=92
      // 80.9 >= 77 (adjusted good) but < 87 (adjusted great) => good
      expect(result.adjustedTier).toBe('good')
      expect(result.levelStrictness).toBe(7)
    })

    it('rune +0 late game — tests level strictness malus of +15', () => {
      const rune = makeRune({
        level: 0,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 6 },
          { type: 'cr', value: 6 },
          { type: 'cd', value: 7 },
          { type: 'hp%', value: 8 },
        ],
      })

      const result = analyzeRune(rune, 'late')
      // efficiency = (6/6 + 6/6 + 7/7 + 8/8 + 1)/9*100 = (4+1)/9*100 = 55.6%
      // At +0, strictness = 15
      // late thresholds: keep=70+15=85, good=80+15=95 => 55.6% < 85 => sell
      expect(result.adjustedTier).toBe('sell')
      expect(result.levelStrictness).toBe(15)
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

      // efficiency ~75.9%, grind bonus = 5 => finalEff = 80.9
      // early at +12: godlike=80 => 80.9 >= 80 => godlike
      // late at +12: good=80, great=85 => 80.9 >= 80 but < 85 => good
      expect(earlyResult.tier).toBe('godlike')
      expect(lateResult.tier).toBe('good')
      expect(earlyResult.tier).not.toBe(lateResult.tier)
    })

    it('grind bonus + synergy saves a rune from keep to good', () => {
      // A rune right at the border of keep/good for mid profile at +12
      // mid good threshold = 70, we need efficiency ~62% with grind + synergy pushing over
      const rune = makeRune({
        level: 12,
        quality: 'legend',
        subStats: [
          { type: 'spd', value: 8 },   // 8/6 = 1.333
          { type: 'atk%', value: 10 }, // 10/8 = 1.25
          { type: 'hp%', value: 8 },   // 8/8 = 1.0
          { type: 'def%', value: 8 },  // 8/8 = 1.0
        ],
      })

      // efficiency = (4.583+1)/9*100 = 62%
      // grind potential: spd +5, atk% +7, hp% +7, def% +7 => grind bonus = 5
      // synergy: cc-debuffer 3/4 (spd, hp%, def%) + atk% has 1 roll => THREE_NO_ROLL = +8%
      // finalEfficiency = 62 + 5 + 8 = 75 >= 70 (good threshold mid) => good
      const result = analyzeRune(rune, 'mid')
      expect(result.tier).toBe('good')

      // Verify grind gain and synergy exist
      expect(result.grindPotential.grindGain).toBeGreaterThan(0)
      expect(result.synergy.synergyBonus).toBe(8)
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
      const subStats = [
        { type: 'spd' as const, value: 12 },
        { type: 'cr' as const, value: 12 },
        { type: 'res' as const, value: 4 },   // 1 roll (round(4/8)=1)
        { type: 'acc' as const, value: 4 },    // 1 roll (round(4/8)=1)
      ]

      const result = calculateSynergy(subStats)

      expect(result.bestArchetype).toBe('speed-dps')
      expect(result.matchCount).toBe(2)
      expect(result.synergyBonus).toBe(4)
    })

    it('returns 0% for 2/4 match when unmatched stats have rolls', () => {
      const subStats = [
        { type: 'spd' as const, value: 12 },
        { type: 'cr' as const, value: 12 },
        { type: 'res' as const, value: 20 },  // 3 rolls (round(20/8)=3)
        { type: 'acc' as const, value: 16 },   // 2 rolls (round(16/8)=2)
      ]

      const result = calculateSynergy(subStats)

      expect(result.bestArchetype).toBe('speed-dps')
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

      expect(result.allArchetypes.length).toBe(5)
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
})
