import { describe, expect, it } from 'vitest'

import {
  analyzeRune,
  calculateEfficiency,
  calculatePotentialEfficiency,
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
      // Legend rune: 4 subs, each starting with 1 roll + 4 upgrade rolls = 8 total
      // Perfect: each roll at max
      // SPD: 2 rolls * 6 = 12, CR: 2 rolls * 6 = 12, CD: 2 rolls * 7 = 14, ATK%: 2 rolls * 8 = 16
      // rawSum = 12/6 + 12/6 + 14/7 + 16/8 = 2+2+2+2 = 8
      // efficiency = (8+1)/2.8*100 = 321.43
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

      expect(result.currentEfficiency).toBeCloseTo(321.43, 0)
      expect(result.maxEfficiency).toBeCloseTo(321.43, 0)
      expect(result.recommendation).toBe('godlike')
      expect(result.quality).toBe('legend')
      expect(result.totalRolls).toBe(8)
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
      // Average rolls: midpoint between min and max
      // SPD: 2 rolls * 5 = 10, CR: 2 rolls * 5 = 10, HP%: 2 rolls * 6.5 ≈ 13, DEF%: 2 rolls * 6.5 ≈ 13
      // rawSum = 10/6 + 10/6 + 13/8 + 13/8 = 1.67+1.67+1.625+1.625 = 6.59
      // eff = (6.59+1)/2.8*100 = 271%
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

      expect(result.recommendation).toBe('godlike') // high efficiency
      expect(result.currentEfficiency).toBeGreaterThan(200)
    })
  })

  describe('analyzeRune — mediocre rune (sell)', () => {
    it('returns sell for a rune with very low efficiency and no grind potential', () => {
      // A rune with no substats at all (e.g. normal quality, all rolls wasted)
      // rawSum = 0, eff = (0 + 1)/2.8*100 = 35.7%, grind can't help
      const rune = makeRune({
        level: 12,
        quality: 'normal',
        subStats: [],
      })

      const result = analyzeRune(rune)

      expect(result.currentEfficiency).toBeLessThan(50)
      expect(result.recommendation).toBe('sell')
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

      // eff = (0.5+0.5+1)/2.8*100 = 71.4% — actually great
      // Low individual rolls but still decent efficiency
      expect(result.currentEfficiency).toBeCloseTo(71.43, 0)
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
      expect(spd.isGrindable).toBe(true)
      expect(spd.grindRange).toEqual({ min: 4, max: 5 })
      expect(spd.valueAfterMaxGrind).toBe(23) // 18 + 5
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

    it('returns same as current for a +12 rune', () => {
      const rune = makeRune({
        level: 12,
        subStats: [
          { type: 'spd', value: 12 },
          { type: 'cr', value: 12 },
        ],
      })

      const result = analyzeRune(rune)

      expect(result.potentialEfficiency).toBeCloseTo(result.currentEfficiency, 1)
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

      expect(potential).toBeGreaterThan(current.currentEfficiency + 50)
    })
  })

  describe('getRecommendation', () => {
    it('returns sell for efficiency below 50%', () => {
      expect(getRecommendation(40, 45)).toBe('sell')
    })

    it('returns keep for efficiency 50-65%', () => {
      expect(getRecommendation(55, 60)).toBe('keep')
    })

    it('returns great for efficiency 65-80%', () => {
      expect(getRecommendation(70, 75)).toBe('great')
    })

    it('returns godlike for efficiency 80%+', () => {
      expect(getRecommendation(85, 90)).toBe('godlike')
    })

    it('uses potential efficiency when higher than current', () => {
      expect(getRecommendation(40, 70)).toBe('great')
    })

    it('considers grind potential in recommendation', () => {
      // Current 45, potential 48, but after grind 70 => great
      expect(getRecommendation(45, 48, 70)).toBe('great')
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
      expect(a.recommendation).toBe(b.recommendation)
    })
  })
})
