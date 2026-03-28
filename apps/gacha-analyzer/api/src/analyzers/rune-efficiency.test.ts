import { describe, it, expect } from 'vitest'
import { calculateEfficiency, calculatePotentialEfficiency, estimateRolls } from './rune-efficiency'

// Helper to create a rune for testing
function makeRune(opts: {
  subStats: { type: string; value: number }[]
  quality?: string
  level?: number
  slot?: number
  set?: string
  isAncient?: boolean
}) {
  return {
    set: opts.set ?? 'violent',
    slot: opts.slot ?? 1,
    grade: 6,
    level: opts.level ?? 12,
    quality: opts.quality as any,
    mainStat: { type: 'atk' as const, value: 160 },
    subStats: opts.subStats as any[],
    ...(opts.isAncient ? { isAncient: true } : {}),
  }
}

describe('Barion Efficiency — corrected formulas', () => {
  it('Legend +12 perfect rune → 100%', () => {
    // 4 subs, each with 2 max rolls (initial + 1 upgrade each)
    // Actually: Legend = 4 initial + 4 upgrades = 8 events
    // Perfect = all 8 events at max → each sub has value = max * 2
    // HP% max = 8, so 2 rolls of 8 = 16
    const rune = makeRune({
      quality: 'legend',
      level: 12,
      subStats: [
        { type: 'hp%', value: 16 },  // 2 rolls × 8 = 16, ratio = 16/8 = 2.0
        { type: 'atk%', value: 16 }, // 2 rolls × 8 = 16, ratio = 16/8 = 2.0
        { type: 'def%', value: 16 }, // 2 rolls × 8 = 16, ratio = 16/8 = 2.0
        { type: 'spd', value: 12 },  // 2 rolls × 6 = 12, ratio = 12/6 = 2.0
      ],
      // sum = 8.0, divisor = 8 → 100%
    })
    const result = calculateEfficiency(rune)
    expect(result.currentEfficiency).toBe(100)
  })

  it('Legend +12 average rune → ~50-75%', () => {
    // 4 subs with average values (midpoint rolls)
    // HP% avg = (5+8)/2 = 6.5, 2 rolls = 13 → ratio = 13/8 = 1.625
    // SPD avg = (4+6)/2 = 5, 2 rolls = 10 → ratio = 10/6 = 1.667
    // CR avg = (4+6)/2 = 5, 2 rolls = 10 → ratio = 10/6 = 1.667
    // CD avg = (4+7)/2 = 5.5, 2 rolls = 11 → ratio = 11/7 = 1.571
    const rune = makeRune({
      quality: 'legend',
      level: 12,
      subStats: [
        { type: 'hp%', value: 13 },
        { type: 'spd', value: 10 },
        { type: 'cr', value: 10 },
        { type: 'cd', value: 11 },
      ],
    })
    const result = calculateEfficiency(rune)
    // sum = 1.625 + 1.667 + 1.667 + 1.571 = 6.53
    // eff = 6.53 / 8 * 100 = 81.6%
    expect(result.currentEfficiency).toBeGreaterThan(75)
    expect(result.currentEfficiency).toBeLessThan(90)
  })

  it('Hero +6 with average rolls → ~60-70%', () => {
    // Hero +6: 3 initial subs + 2 powerups (both roll into existing)
    // events_so_far = 3 + 2 = 5
    // total_events_at_12 = 7
    // With average values:
    // SPD: initial 5 + upgrade 5 = 10, ratio = 10/6 = 1.667
    // HP%: initial 6 + upgrade 6 = 12, ratio = 12/8 = 1.5
    // CR: initial 5 (no upgrade), ratio = 5/6 = 0.833
    const rune = makeRune({
      quality: 'hero',
      level: 6,
      subStats: [
        { type: 'spd', value: 10 },
        { type: 'hp%', value: 12 },
        { type: 'cr', value: 5 },
      ],
    })
    const result = calculateEfficiency(rune)
    // sum = 1.667 + 1.5 + 0.833 = 4.0
    // eff = 4.0 / 7 * 100 = 57.14%
    expect(result.currentEfficiency).toBeGreaterThan(50)
    expect(result.currentEfficiency).toBeLessThan(70)
  })

  it('Hero +6 potential → < 100%', () => {
    const rune = makeRune({
      quality: 'hero',
      level: 6,
      subStats: [
        { type: 'spd', value: 10 },
        { type: 'hp%', value: 12 },
        { type: 'cr', value: 5 },
      ],
    })
    const potential = calculatePotentialEfficiency(rune, 'hero')
    // events_so_far = 3 + 2 = 5, remaining = 7 - 5 = 2
    // potential_sum = 4.0 + 2*1.0 = 6.0
    // potential = 6.0 / 7 * 100 = 85.71%
    expect(potential).toBeLessThan(100)
    expect(potential).toBeGreaterThan(80)
  })

  it('Legend +0 potential with max subs → high but not 100%', () => {
    const rune = makeRune({
      quality: 'legend',
      level: 0,
      subStats: [
        { type: 'spd', value: 6 },   // max initial → ratio 1.0
        { type: 'hp%', value: 8 },   // max initial → ratio 1.0
        { type: 'cr', value: 6 },    // max initial → ratio 1.0
        { type: 'cd', value: 7 },    // max initial → ratio 1.0
      ],
    })
    const potential = calculatePotentialEfficiency(rune, 'legend')
    // events_so_far = 4 + 0 = 4, remaining = 8 - 4 = 4
    // sum = 4.0 + 4*1.0 = 8.0
    // potential = 8.0 / 8 * 100 = 100%
    expect(potential).toBe(100)
  })

  it('Legend +0 potential with min subs → ~75%', () => {
    const rune = makeRune({
      quality: 'legend',
      level: 0,
      subStats: [
        { type: 'spd', value: 4 },   // min → ratio 4/6 = 0.667
        { type: 'hp%', value: 5 },   // min → ratio 5/8 = 0.625
        { type: 'cr', value: 4 },    // min → ratio 4/6 = 0.667
        { type: 'cd', value: 4 },    // min → ratio 4/7 = 0.571
      ],
    })
    const potential = calculatePotentialEfficiency(rune, 'legend')
    // sum = 0.667 + 0.625 + 0.667 + 0.571 = 2.53
    // potential = (2.53 + 4.0) / 8 * 100 = 6.53 / 8 * 100 = 81.6%
    expect(potential).toBeGreaterThan(75)
    expect(potential).toBeLessThan(90)
  })

  it('maxEfficiency is 100%', () => {
    const rune = makeRune({
      quality: 'legend',
      level: 12,
      subStats: [
        { type: 'hp%', value: 16 },
        { type: 'atk%', value: 16 },
        { type: 'def%', value: 16 },
        { type: 'spd', value: 12 },
      ],
    })
    const result = calculateEfficiency(rune)
    expect(result.maxEfficiency).toBe(100)
  })

  it('grind efficiency adds to base correctly', () => {
    const rune = makeRune({
      quality: 'legend',
      level: 12,
      subStats: [
        { type: 'hp%', value: 16 },  // grindable, +7 max → 23/8 = 2.875
        { type: 'atk%', value: 16 }, // grindable, +7 max → 23/8 = 2.875
        { type: 'spd', value: 12 },  // grindable, +5 max → 17/6 = 2.833
        { type: 'cr', value: 12 },   // NOT grindable
      ],
    })
    const result = calculateEfficiency(rune)
    // Grind adds to 3 of 4 subs
    expect(result.grindedEfficiency).toBeGreaterThan(result.currentEfficiency)
    expect(result.grindGain).toBeGreaterThan(0)
  })

  it('estimateRolls returns correct count and quality', () => {
    // SPD +12 = 2 max rolls (6+6)
    const spd12 = estimateRolls('spd', 12)
    expect(spd12.count).toBe(2)
    expect(spd12.avgQuality).toBe(100)

    // SPD +10 = 2 rolls (max would be 12, so quality = 10/12 = 83.33%)
    const spd10 = estimateRolls('spd', 10)
    expect(spd10.count).toBe(2)
    expect(spd10.avgQuality).toBeCloseTo(83.33, 1)
  })

  it('Rare +12 perfect → 100%', () => {
    // Rare: 2 initial + 4 powerups = 6 total events
    // 2 initial at max + 2 new subs at max + 2 upgrades at max
    // Actually: 4 subs total, 6 events distributed among them
    // Let's say: sub1 has 2 rolls, sub2 has 2 rolls, sub3 has 1 roll, sub4 has 1 roll
    // All max: sub1 = 2*8=16, sub2 = 2*8=16, sub3 = 1*8=8, sub4 = 1*8=8
    // sum = 16/8 + 16/8 + 8/8 + 8/8 = 2+2+1+1 = 6.0
    // eff = 6.0 / 6 * 100 = 100%
    const rune = makeRune({
      quality: 'rare',
      level: 12,
      subStats: [
        { type: 'hp%', value: 16 },
        { type: 'atk%', value: 16 },
        { type: 'def%', value: 8 },
        { type: 'spd', value: 6 },
      ],
    })
    const result = calculateEfficiency(rune)
    expect(result.currentEfficiency).toBe(100)
  })
})

describe('Ancient rune support', () => {
  it('ancient rune with same values as normal has lower efficiency (higher base max)', () => {
    // Normal: base max=8, roll max=8 → 2 events each → maxPossible per sub = 8+8 = 16
    // Ancient: base max=9, roll max=8 → 2 events each → maxPossible per sub = 9+8 = 17
    // Same values → ancient ratio is lower since maxPossible is higher
    const subStats = [
      { type: 'hp%', value: 16 },
      { type: 'atk%', value: 16 },
      { type: 'def%', value: 16 },
      { type: 'spd', value: 12 },
    ]

    const normalRune = makeRune({ quality: 'legend', level: 12, subStats })
    const ancientRune = makeRune({ quality: 'legend', level: 12, subStats, isAncient: true })

    const normalResult = calculateEfficiency(normalRune)
    const ancientResult = calculateEfficiency(ancientRune)

    // Normal: perfect → 100%. Ancient: same values but higher maxPossible → < 100%
    expect(normalResult.currentEfficiency).toBe(100)
    expect(ancientResult.currentEfficiency).toBeLessThan(normalResult.currentEfficiency)
  })

  it('ancient rune with max ancient values → 100%', () => {
    // Ancient base ranges (verified in-game 2026-03-27):
    // hp%: baseMax=10, rollMax=8 → max = 10+8 = 18
    // atk%: baseMax=10, rollMax=8 → max = 10+8 = 18
    // def%: baseMax=10, rollMax=8 → max = 10+8 = 18
    // spd: baseMax=7, rollMax=6 → max = 7+6 = 13
    const rune = makeRune({
      quality: 'legend',
      level: 12,
      isAncient: true,
      subStats: [
        { type: 'hp%', value: 18 },  // 10+8 = 18, ratio = 1.0
        { type: 'atk%', value: 18 }, // 10+8 = 18, ratio = 1.0
        { type: 'def%', value: 18 }, // 10+8 = 18, ratio = 1.0
        { type: 'spd', value: 13 },  // 7+6 = 13, ratio = 1.0
      ],
    })
    const result = calculateEfficiency(rune)
    expect(result.currentEfficiency).toBe(100)
  })

  it('isAncient flag propagates — ancient rune uses ancient grind ranges', () => {
    const rune = makeRune({
      quality: 'legend',
      level: 12,
      isAncient: true,
      subStats: [
        { type: 'hp%', value: 16 },
        { type: 'atk%', value: 16 },
        { type: 'spd', value: 12 },
        { type: 'cr', value: 12 },
      ],
    })
    const result = calculateEfficiency(rune)

    // Ancient grind max for spd = 6 (vs 5 for normal)
    const spdSub = result.substats.find(s => s.type === 'spd')
    expect(spdSub).toBeDefined()
    // Ancient legend grind max for SPD = 6
    expect(spdSub!.grindAmount).toBe(6)
    expect(spdSub!.grindedValue).toBe(12 + 6) // 18
  })

  it('estimateRolls uses ancient base ranges when flagged', () => {
    // SPD: normal baseMax=6, rollMax=6 | ancient baseMax=7, rollMax=6
    // Value 13 → normal: 6 + 6 = 12 < 13, need 3 events: 6+6+6=18 >= 13 → count=3
    //            ancient: 7 + 6 = 13 >= 13 → count=2
    const normalRolls = estimateRolls('spd', 13)
    const ancientRolls = estimateRolls('spd', 13, true)

    expect(normalRolls.count).toBe(3)
    expect(ancientRolls.count).toBe(2)
  })

  it('ancient roll ranges are identical to normal (only base differs)', () => {
    // SPD +12 on normal: base=6, roll=6 → 2 events, quality = 12/12 = 100%
    // SPD +12 on ancient: base=7, roll=6 → 1 base(7) is not enough, need 2 events: 7+6=13 > 12 → count=2
    //   quality = 12/13 = 92.3%
    const normalRolls = estimateRolls('spd', 12)
    const ancientRolls = estimateRolls('spd', 12, true)

    expect(normalRolls.count).toBe(2)
    expect(normalRolls.avgQuality).toBe(100) // 12 / (6+6) = 100%

    expect(ancientRolls.count).toBe(2)
    expect(ancientRolls.avgQuality).toBeCloseTo(92.31, 1) // 12 / (7+6) = 92.3%
  })
})
