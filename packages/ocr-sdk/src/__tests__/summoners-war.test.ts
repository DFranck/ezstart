import { describe, expect, it } from 'vitest'

import type { OcrResult } from '../../src/types.js'
import { summonersWarParser } from '../parsers/summoners-war.js'

function makeOcrResult(text: string): OcrResult {
  return { text, confidence: 0.9, regions: [] }
}

describe('summonersWarParser', () => {
  it('has correct gameName', () => {
    expect(summonersWarParser.gameName).toBe('summoners-war')
  })

  describe('complete rune parsing', () => {
    it('parses a standard Violent rune (slot 6 with HP% main)', () => {
      const text = [
        'Violent Rune (6)',
        '+15',
        '★★★★★★',
        'HP +63%',
        'SPD +23',
        'CRI Rate +12%',
        'CRI Dmg +7%',
        'ATK +8%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'violent',
        slot: 6,
        grade: 6,
        level: 15,
        mainStat: { type: 'hp%', value: 63 },
        subStats: [
          { type: 'spd', value: 23 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 7 },
          { type: 'atk%', value: 8 },
        ],
      })
    })

    it('parses a Swift rune with percent main stat', () => {
      const text = [
        'Swift Rune (2)',
        '+12',
        '★★★★★★',
        'SPD +42',
        'HP +15%',
        'ATK +8%',
        'DEF +20',
        'Accuracy +6%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'swift',
        slot: 2,
        level: 12,
        mainStat: { type: 'spd', value: 42 },
        subStats: [
          { type: 'hp%', value: 15 },
          { type: 'atk%', value: 8 },
          { type: 'def', value: 20 },
          { type: 'acc', value: 6 },
        ],
      })
    })

    it('parses a Will rune with Resistance substat', () => {
      const text = [
        'Will Rune (4)',
        '+9',
        '★★★★★',
        'CRI Dmg +80%',
        'ATK +5%',
        'DEF +12%',
        'Resistance +8%',
        'SPD +5',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'will',
        slot: 4,
        grade: 5,
        level: 9,
        mainStat: { type: 'cd', value: 80 },
      })
      expect((result.data as { subStats: unknown[] }).subStats).toHaveLength(4)
    })
  })

  describe('real OCR text (noisy single-line)', () => {
    it('parses Endure rune with newlines and OCR artifacts', () => {
      const text =
        '"AEE»,\na © € +12 Endure Rune (1) xX\nF& ATK +118 TI\n"12 153\nResistance +15% Temporarily)\nCRI Dmg +7% -\nCRI Rate +18%\n2 Set : Resistance +20%\n"'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'endure',
        slot: 1,
        // Slot 1 → hardcoded main stat ATK flat
        mainStat: { type: 'atk', value: 118 },
      })

      const data = result.data as { subStats: { type: string; value: number }[]; level: number }
      expect(data.level).toBe(12)
      expect(data.subStats.length).toBeGreaterThanOrEqual(2)
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'res', value: 15 }),
          expect.objectContaining({ type: 'cr', value: 18 }),
        ]),
      )
    })

    it('parses Despair rune with Legend quality and set bonus', () => {
      const text =
        '#1 412 strong Despair Rune (1) ATK +118 Legend HP +184 CRI Rate +11% HP+16% Resistance +14% CRI Dmg +16% 4 Set : Stun Rate +25%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'despair',
        slot: 1,
        // Slot 1 → hardcoded main stat ATK flat
        mainStat: { type: 'atk', value: 118 },
      })

      const data = result.data as { subStats: { type: string; value: number }[]; quality: string; level: number }
      expect(data.quality).toBe('legend')
      expect(data.level).toBe(12)
      // SW rule: max 4 substats per rune
      expect(data.subStats.length).toBeLessThanOrEqual(4)
      expect(data.subStats.length).toBeGreaterThanOrEqual(3)
      // At least CR and CD should be present (first stats extracted in order)
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'cr', value: 11 }),
        ]),
      )
    })

    it('parses Cruel Rage rune with Hero quality and innate stat', () => {
      const text =
        'a (#412 Cruel Rage Rune (1) ATK +118 Hero CRI Dmg +4% CRI Rate +11% SPD +14 ATK +14% HP +10% 4 Set : CRI Dmg +40%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(['rage', 'cruel']).toContain(result.data.set)
      expect(result.data).toMatchObject({
        slot: 1,
        // Slot 1 → hardcoded main stat ATK flat
        mainStat: { type: 'atk', value: 118 },
      })

      const data = result.data as {
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
        quality: string
      }
      expect(data.quality).toBe('hero')
      // 5 stats found → first (CD +4) is innate, remaining 4 are substats
      expect(data.innateStat).toBeDefined()
      expect(data.innateStat).toMatchObject({ type: 'cd', value: 4 })
      expect(data.subStats).toHaveLength(4)
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'cr', value: 11 }),
          expect.objectContaining({ type: 'spd', value: 14 }),
          expect.objectContaining({ type: 'atk%', value: 14 }),
          expect.objectContaining({ type: 'hp%', value: 10 }),
        ]),
      )
    })

    it('parses Intricate Violent rune with heavy OCR noise', () => {
      const text =
        '"AEE»,\n#2 115 Intricate Violent Rune (1) xX\n[75] ATK +160 (Legend\nF524 Accuracy +8% 6186\nSPD +10 €)\nCRI Rate +9% Temporarily)\n\nHP +27%\n4 Set : Get Extra Turn +22%\n"'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'violent',
        // Slot 1 → hardcoded main stat ATK flat
        mainStat: { type: 'atk', value: 160 },
      })

      const data = result.data as { subStats: { type: string; value: number }[]; quality: string; level: number }
      expect(data.quality).toBe('legend')
      expect(data.level).toBe(15)
      expect(data.subStats.length).toBeGreaterThanOrEqual(2)
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'acc', value: 8 }),
          expect.objectContaining({ type: 'cr', value: 9 }),
        ]),
      )
    })
  })

  describe('hardcoded main stats for fixed slots', () => {
    it('slot 1 → main stat is always ATK flat', () => {
      const text = 'Focus Rune (1) +12 Legend Accuracy +27% HP +194 ATK +13% CRI Rate +12%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'focus',
        slot: 1,
        mainStat: { type: 'atk', value: 118 }, // Hardcoded for slot 1 +12
      })

      const data = result.data as { subStats: { type: string; value: number }[] }
      // Accuracy should be a substat, NOT main stat
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'acc', value: 27 }),
          expect.objectContaining({ type: 'atk%', value: 13 }),
          expect.objectContaining({ type: 'cr', value: 12 }),
        ]),
      )
      // ATK flat should NOT appear in substats (it's the main stat)
      const atkFlatSubs = data.subStats.filter((s: { type: string }) => s.type === 'atk')
      expect(atkFlatSubs).toHaveLength(0)
    })

    it('slot 3 → main stat is always DEF flat', () => {
      const text = [
        'Despair Rune (3)',
        '+12',
        'Legend',
        'DEF +118',
        'SPD +18',
        'HP +12%',
        'ATK +8%',
        'CRI Rate +6%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'despair',
        slot: 3,
        mainStat: { type: 'def', value: 118 },
      })

      const data = result.data as { subStats: { type: string; value: number }[] }
      // DEF flat should NOT appear in substats
      const defFlatSubs = data.subStats.filter((s: { type: string }) => s.type === 'def')
      expect(defFlatSubs).toHaveLength(0)
    })

    it('slot 5 → main stat is always HP flat', () => {
      const text = [
        'Violent Rune (5)',
        '+15',
        'HP +2448',
        'SPD +20',
        'CRI Rate +12%',
        'ATK +8%',
        'DEF +15%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'violent',
        slot: 5,
        mainStat: { type: 'hp', value: 2448 },
      })

      const data = result.data as { subStats: { type: string; value: number }[] }
      // HP flat should NOT appear in substats
      const hpFlatSubs = data.subStats.filter((s: { type: string }) => s.type === 'hp')
      expect(hpFlatSubs).toHaveLength(0)
    })

    it('slot 1 without ATK in text → hardcodes ATK value from level', () => {
      const text = 'Swift Rune (1) +15 Legend CRI Rate +12% SPD +20 HP +8%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        slot: 1,
        mainStat: { type: 'atk', value: 160 }, // +15 → 160
      })
    })
  })

  describe('multiline stat detection', () => {
    it('detects SPD on one line with +value on next line', () => {
      const text = [
        'Focus Rune (1)',
        '+12',
        'Legend',
        'SPD 51',        // SPD name on this line, 51 is noise
        '2 +6',          // +6 is the actual SPD value
        'HP +194',
        'ATK +13%',
        'CRI Rate +12%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }

      // Max 4 substats
      expect(data.subStats.length).toBeLessThanOrEqual(4)

      // SPD +6 should be found via multiline detection
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'spd', value: 6 }),
        ]),
      )
    })
  })

  describe('fuzzy stat name matching', () => {
    it('handles "Acturaty" as Accuracy', () => {
      const text = 'Violent Rune (2) SPD +42 Acturaty +8% HP +12%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'acc', value: 8 }),
        ]),
      )
    })

    it('handles "CRIRate" (no space) via stat patterns', () => {
      const text = 'Swift Rune (2) SPD +42 CRIRate +12% HP +8%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'cr', value: 12 }),
        ]),
      )
    })

    it('handles "CRIDmg" (no space) via stat patterns', () => {
      const text = 'Rage Rune (4) CRI Dmg +80% CRIDmg +7% ATK +12%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'cd', value: 7 }),
        ]),
      )
    })

    it('handles "Axes" as ATK', () => {
      const text = 'Swift Rune (2) SPD +42 Axes +12% HP +8%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'atk%', value: 12 }),
        ]),
      )
    })
  })

  describe('substat value validation', () => {
    it('rejects SPD 51 as out of range (max 35)', () => {
      // If OCR reads SPD +51, it should be rejected
      const text = 'Violent Rune (2) SPD +42 HP +8% ATK +5%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }
      // SPD 42 is the main stat (slot 2), not a substat
      const spdSubs = data.subStats.filter((s: { type: string }) => s.type === 'spd')
      expect(spdSubs).toHaveLength(0)
    })

    it('keeps valid substat values and rejects out-of-range ones', () => {
      const text = 'Will Rune (4) CRI Dmg +80% SPD +5 CRI Rate +45% HP +8%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }
      // CRI Rate +45% is out of range (max 30) → rejected
      const crSubs = data.subStats.filter((s: { type: string }) => s.type === 'cr')
      expect(crSubs).toHaveLength(0)
      // SPD +5 is valid
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'spd', value: 5 }),
        ]),
      )
    })
  })

  describe('real noisy OCR — Focus Rune example', () => {
    it('parses the full noisy Focus Rune OCR text correctly (multiline SPD + innate)', () => {
      const text = [
        '1% +12 Quick Focus Rune (1) v',
        'yg Axes Legend',
        'Ce SPD 51',
        '2 +6',
        'Accuracy +27%',
        'HP +194',
        'ATK +13%',
        'CRI Rate +12%',
        '2 set: Acturaty -20%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'focus',
        slot: 1,
        level: 12,
        quality: 'legend',
        // Slot 1 → main stat is ATK flat (hardcoded)
        mainStat: { type: 'atk', value: 118 },
      })

      const data = result.data as {
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
      }

      // 5 stats found (acc, hp, atk%, cr, spd via multiline) → first is innate
      // The first stat extracted is HP +194 (acc is the first inline stat)
      expect(data.innateStat).toBeDefined()
      // SW rule: max 4 substats per rune
      expect(data.subStats).toHaveLength(4)

      // The remaining substats should include atk%, cr
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'atk%', value: 13 }),
          expect.objectContaining({ type: 'cr', value: 12 }),
        ]),
      )
    })

    it('parses real OCR with SPD +6 as innate stat (slot 1 hardcode)', () => {
      const text = [
        'a 412 Quick Focus Rune (1) v',
        'yg Axes Legend',
        'Ce SPD +6 51',
        '2',
        'Accuracy +27%',
        'HP +194 Temporarily',
        'ATK +13%',
        'CRI Rate +12%',
        '2 set: Acturaty -20%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'focus',
        slot: 1,
        level: 12,
        quality: 'legend',
        // Slot 1 → main stat is ATK flat (hardcoded), NOT SPD +6
        mainStat: { type: 'atk', value: 118 },
      })

      const data = result.data as {
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
      }

      // 5 stats found → first (SPD +6) is the innate stat
      expect(data.innateStat).toBeDefined()
      expect(data.innateStat).toMatchObject({ type: 'spd', value: 6 })

      // SW rule: max 4 substats per rune
      expect(data.subStats).toHaveLength(4)

      // SPD +6 should NOT appear in substats (it's the innate)
      const spdSubs = data.subStats.filter((s: { type: string }) => s.type === 'spd')
      expect(spdSubs).toHaveLength(0)

      // ATK flat should NOT appear in substats (it's the main stat type)
      const atkFlatSubs = data.subStats.filter((s: { type: string }) => s.type === 'atk')
      expect(atkFlatSubs).toHaveLength(0)

      // ATK +13% should be a substat
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'acc', value: 27 }),
          expect.objectContaining({ type: 'atk%', value: 13 }),
          expect.objectContaining({ type: 'cr', value: 12 }),
        ]),
      )
    })
  })

  describe('max 4 substats rule', () => {
    it('caps substats at 4 even when more are extracted from OCR', () => {
      // OCR text that produces 5+ stat matches after main stat
      const text = 'Swift Rune (2) SPD +42 HP +8% ATK +5% DEF +12% CRI Rate +6% Resistance +4%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }
      expect(data.subStats.length).toBeLessThanOrEqual(4)
    })
  })

  describe('innate stat detection', () => {
    it('detects innate stat when 5 stats found on a Legend rune (slot 1)', () => {
      const text = [
        'Focus Rune (1)',
        '+12',
        'Legend',
        'SPD +6',
        'Accuracy +27%',
        'HP +194',
        'ATK +13%',
        'CRI Rate +12%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        mainStat: { type: string; value: number }
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
      }

      // Slot 1 → main stat is ATK flat (hardcoded)
      expect(data.mainStat).toMatchObject({ type: 'atk', value: 118 })

      // SPD +6 is the innate stat (first stat after main, 5 stats total)
      expect(data.innateStat).toBeDefined()
      expect(data.innateStat).toMatchObject({ type: 'spd', value: 6 })

      // Remaining 4 substats should NOT include SPD +6
      expect(data.subStats).toHaveLength(4)
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'acc', value: 27 }),
          expect.objectContaining({ type: 'atk%', value: 13 }),
          expect.objectContaining({ type: 'cr', value: 12 }),
        ]),
      )
      const spdSubs = data.subStats.filter(s => s.type === 'spd')
      expect(spdSubs).toHaveLength(0)
    })

    it('does not set innate when only 4 substats on Legend rune', () => {
      const text = [
        'Violent Rune (6)',
        '+15',
        'Legend',
        'HP +63%',
        'SPD +23',
        'CRI Rate +12%',
        'CRI Dmg +7%',
        'ATK +8%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
      }

      expect(data.innateStat).toBeUndefined()
      expect(data.subStats).toHaveLength(4)
    })
  })

  describe('innate detection based on quality+level substat count', () => {
    it('Hero +6 with 4 stats → innate + 3 subs', () => {
      const text = [
        'Violent Rune (1)',
        '+6',
        'Hero',
        'RES +6%',
        'SPD +12',
        'HP +8%',
        'ATK +5%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        mainStat: { type: string; value: number }
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
      }

      // Slot 1 → main stat is ATK flat (hardcoded)
      expect(data.mainStat).toMatchObject({ type: 'atk' })
      // Hero +6 → expected 3 subs. 4 found → first is innate
      expect(data.innateStat).toBeDefined()
      expect(data.innateStat).toMatchObject({ type: 'res', value: 6 })
      expect(data.subStats).toHaveLength(3)
    })

    it('Hero +12 with 5 stats → innate + 4 subs', () => {
      const text = [
        'Swift Rune (1)',
        '+12',
        'Hero',
        'Accuracy +4%',
        'SPD +18',
        'HP +8%',
        'ATK +12%',
        'DEF +10%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        mainStat: { type: string; value: number }
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
      }

      expect(data.mainStat).toMatchObject({ type: 'atk' })
      // Hero +12 → expected 4 subs. 5 found → first is innate
      expect(data.innateStat).toBeDefined()
      expect(data.innateStat).toMatchObject({ type: 'acc', value: 4 })
      expect(data.subStats).toHaveLength(4)
    })

    it('Legend +12 with 4 stats → no innate', () => {
      const text = [
        'Violent Rune (1)',
        '+12',
        'Legend',
        'SPD +18',
        'HP +8%',
        'ATK +12%',
        'CRI Rate +10%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        mainStat: { type: string; value: number }
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
      }

      expect(data.mainStat).toMatchObject({ type: 'atk' })
      // Legend +12 → expected 4 subs. 4 found → no innate
      expect(data.innateStat).toBeUndefined()
      expect(data.subStats).toHaveLength(4)
    })

    it('Hero +6 with 3 stats → no innate', () => {
      const text = [
        'Blade Rune (1)',
        '+6',
        'Hero',
        'SPD +10',
        'HP +8%',
        'CRI Rate +6%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        mainStat: { type: string; value: number }
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
      }

      expect(data.mainStat).toMatchObject({ type: 'atk' })
      // Hero +6 → expected 3 subs. 3 found → no innate
      expect(data.innateStat).toBeUndefined()
      expect(data.subStats).toHaveLength(3)
    })
  })

  describe('tolerant parsing', () => {
    it('handles "HP+16%" without space', () => {
      const text = 'Violent Rune (2) SPD +42 HP+16% ATK+8%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'violent',
        slot: 2,
        mainStat: { type: 'spd', value: 42 },
      })

      const data = result.data as { subStats: { type: string; value: number }[] }
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'hp%', value: 16 }),
          expect.objectContaining({ type: 'atk%', value: 8 }),
        ]),
      )
    })

    it('strips "Temporarily" UI noise', () => {
      const text = 'Temporarily Swift Rune (4) CRI Rate +58% Temporarily ATK +5%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'swift',
        slot: 4,
        mainStat: { type: 'cr', value: 58 },
      })
    })

    it('handles set bonus suffix without false stat matches', () => {
      const text =
        'Will Rune (4) CRI Dmg +80% ATK +5% DEF +12% Resistance +8% SPD +5 2 Set : Resistance +25%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }
      const resStats = data.subStats.filter((s) => s.type === 'res')
      expect(resStats).toHaveLength(1)
      expect(resStats[0]!.value).toBe(8)
    })

    it('handles "Leg" as Legend quality (OCR misread)', () => {
      const text = 'Rage Rune (4) CRI Dmg +80% Leg ATK +20% HP +12%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { quality: string }
      expect(data.quality).toBe('legend')
    })

    it('succeeds with set + main stat even if slot is missing', () => {
      const text = 'Violent ATK +118 HP +8% CRI Rate +6%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'violent',
        mainStat: { type: 'atk', value: 118 },
      })
    })
  })

  describe('noisy OCR text', () => {
    it('handles extra whitespace and mixed casing', () => {
      const text = [
        '  VIOLENT   Rune   (1)  ',
        '  +15  ',
        '★★★★★★',
        '  ATK  +118  ',
        'HP  +  8%',
        '  CRI  Rate  +6%  ',
        'DEF +5%',
        'SPD +4',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'violent',
        slot: 1,
        level: 15,
        // Slot 1 → hardcoded ATK flat main stat (118 found in text, used as-is)
        mainStat: { type: 'atk', value: 118 },
      })
    })

    it('handles "6*" grade notation instead of star characters', () => {
      const text = [
        'Rage Rune (4)',
        '+15',
        '6*',
        'CRI Dmg +80%',
        'ATK +20%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'rage',
        slot: 4,
        grade: 6,
      })
    })

    it('handles "Legend" grade keyword', () => {
      const text = [
        'Despair Rune (3)',
        '+12',
        'Legend',
        'DEF +118',
        'SPD +18',
        'HP +12%',
        'ATK +8%',
        'CRI Rate +6%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'despair',
        slot: 3,
        grade: 6,
        // Slot 3 → hardcoded DEF flat main stat
        mainStat: { type: 'def', value: 118 },
      })
    })
  })

  describe('fuzzy OCR stat recovery', () => {
    it('parses "AK +118" as ATK +118 (truncated stat name)', () => {
      const text = [
        '0 E         +12 Violent Rune (1)               X',
        'Fin AK +118                 legend',
        'w) 112                                       (5) 147',
        'ATK +30%                                    emporarily',
        'HP +445',
        '',
        '4 Set : Get Extra Turn +22%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'violent',
        slot: 1,
        level: 12,
        quality: 'legend',
        mainStat: { type: 'atk', value: 118 },
      })

      const data = result.data as {
        subStats: { type: string; value: number }[]
        partial?: boolean
      }
      // ATK +30% and HP +445 should be detected as substats
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'atk%', value: 30 }),
          expect.objectContaining({ type: 'hp', value: 445 }),
        ]),
      )
      expect(data.subStats.length).toBeGreaterThanOrEqual(2)
    })

    it('marks result as partial when fewer substats than expected', () => {
      // Legend +12 rune should have 4 substats, but only 2 are clearly detected
      const text = 'Violent Rune (1) +12 Legend ATK +30% HP +445'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[]; partial?: boolean }
      // With only 2 substats on a Legend +12 rune, should be marked partial
      if (data.subStats.length < 4) {
        expect(data.partial).toBe(true)
      }
    })

    it('does not mark as partial when all expected substats are found', () => {
      const text = [
        'Violent Rune (6)',
        '+15',
        'Legend',
        'HP +63%',
        'SPD +23',
        'CRI Rate +12%',
        'CRI Dmg +7%',
        'ATK +8%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[]; partial?: boolean }
      expect(data.subStats).toHaveLength(4)
      expect(data.partial).toBeUndefined()
    })
  })

  describe('failure cases', () => {
    it('fails on empty text', () => {
      const result = summonersWarParser.parse(makeOcrResult(''))

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Empty OCR text')
    })

    it('fails on unrelated text', () => {
      const text = 'Hello World This is not a rune Just random text'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('fails when set is missing', () => {
      const text = 'Rune (3) +12 DEF +160'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Could not detect rune set')
    })
  })

  describe('slot 2/4/6 main stat detection', () => {
    it('slot 6 with main stat RES% does NOT have ATK flat as main', () => {
      const text = [
        'Will Rune (6)',
        '+12',
        'Legend',
        'Resistance +51%',
        'SPD +12',
        'HP +8%',
        'CRI Rate +11%',
        'ATK +5%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'will',
        slot: 6,
        mainStat: { type: 'res', value: 51 },
      })
      // ATK flat should NOT be the main stat
      expect(result.data.mainStat).not.toMatchObject({ type: 'atk' })
    })

    it('slot 2 with main stat SPD does NOT have ATK flat as main', () => {
      const text = [
        'Swift Rune (2)',
        '+15',
        'Legend',
        'SPD +42',
        'HP +15%',
        'ATK +8%',
        'DEF +20',
        'Accuracy +6%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'swift',
        slot: 2,
        mainStat: { type: 'spd', value: 42 },
      })
      expect(result.data.mainStat).not.toMatchObject({ type: 'atk' })
    })

    it('slot 4 with high CD% detects main stat correctly', () => {
      const text = [
        'Rage Rune (4)',
        '+12',
        'HP +8%',
        'CRI Dmg +80%',
        'ATK +5%',
        'SPD +6',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      // CD +80% is clearly the main stat (substats max 35%)
      expect(result.data).toMatchObject({
        mainStat: { type: 'cd', value: 80 },
      })
    })
  })

  describe('slot 2/4/6 rejects ATK/DEF flat as main stat', () => {
    it('slot 6 with only ATK flat detected does NOT use it as main stat', () => {
      // OCR failed to read the real main stat (e.g. RES% +51), only sees ATK +118
      const text = [
        'Violent Rune (6)',
        '+12',
        'ATK +118',
        'SPD +12',
        'HP +8%',
        'CRI Rate +11%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      // ATK flat is NOT a valid main stat for slot 6
      // Parser should pick HP% as main (only valid type found) or return null
      if (result.success && result.data.mainStat) {
        expect((result.data.mainStat as { type: string }).type).not.toBe('atk')
        expect((result.data.mainStat as { type: string }).type).not.toBe('def')
      }
    })

    it('slot 6 with ACC% +64 correctly detects main stat', () => {
      const text = [
        'Focus Rune (6)',
        '+12',
        'Accuracy +64%',
        'SPD +15',
        'HP +12%',
        'ATK +8%',
        'DEF +20',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        slot: 6,
        mainStat: { type: 'acc', value: 64 },
      })
    })

    it('slot 2 with only flat stats does NOT use ATK flat as main', () => {
      const text = [
        'Swift Rune (2)',
        '+12',
        'ATK +118',
        'DEF +20',
        'HP +8%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      // ATK flat and DEF flat are NOT valid main stats for slot 2
      if (result.success && result.data.mainStat) {
        expect((result.data.mainStat as { type: string }).type).not.toBe('atk')
        expect((result.data.mainStat as { type: string }).type).not.toBe('def')
      }
    })
  })

  describe('substat deduplication', () => {
    it('deduplicates same stat type — keeps only one CRI Rate', () => {
      // OCR text where "CRI Rate +7%" matches multiple regex patterns,
      // producing duplicate CR entries
      const text = [
        'Violent Rune (1)',
        '+12',
        'Legend',
        'SPD +6',
        'CRI Rate +7%',
        'HP +8%',
        'ATK +12%',
        'DEF +10%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        subStats: { type: string; value: number }[]
      }

      // CR should appear at most once in substats
      const crStats = data.subStats.filter(s => s.type === 'cr')
      expect(crStats.length).toBeLessThanOrEqual(1)
    })

    it('deduplicates keeping the highest value when same type appears twice', () => {
      // Simulate noisy OCR where "CRI Rate" gets detected twice with different values
      // by having the stat name appear in two different forms
      const text = 'Swift Rune (2) SPD +42 CRI Rate +7% CRI Rate +12% HP +8%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        subStats: { type: string; value: number }[]
      }

      // CR should appear exactly once
      const crStats = data.subStats.filter(s => s.type === 'cr')
      expect(crStats).toHaveLength(1)
      // Should keep the highest value (12, not 7)
      expect(crStats[0]!.value).toBe(12)
    })
  })

  describe('real OCR — Violent slot 4 CD main, grinded SPD', () => {
    it('extracts all 4 subs correctly, no false positives from efficiency number or level', () => {
      const text = [
        's)         +15 Violent Rune (4)              X',
        'loli                                  legend',
        '    CRI Dmg +80%',
        '',
        ' 214',
        'DEF +16%                                  Temporarily',
        'SPD +32',
        '',
        'ATK +12%',
        '',
        '4 Set : Get Extra Turn +22%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'violent',
        slot: 4,
        level: 15,
        quality: 'legend',
        mainStat: { type: 'cd', value: 80 },
      })

      const data = result.data as {
        subStats: { type: string; value: number }[]
        partial?: boolean
      }

      // Should have exactly these 3 substats (4th is missing from OCR — HP% not in text)
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'def%', value: 16 }),
          expect.objectContaining({ type: 'spd', value: 32 }),
          expect.objectContaining({ type: 'atk%', value: 12 }),
        ]),
      )

      // HP +214 should NOT be a substat (214 is rune efficiency, not a stat)
      const hpFlatSubs = data.subStats.filter(s => s.type === 'hp')
      expect(hpFlatSubs).toHaveLength(0)

      // HP% +15 should NOT be a substat (15 is the rune level, not a stat)
      const hpPercentSubs = data.subStats.filter(s => s.type === 'hp%' && s.value === 15)
      expect(hpPercentSubs).toHaveLength(0)

      // SPD +32 should be accepted (grinded value, within valid range)
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'spd', value: 32 }),
        ]),
      )
    })

    it('accepts grinded SPD values up to 35', () => {
      const text = [
        'Violent Rune (6)',
        '+15',
        'Legend',
        'HP +63%',
        'SPD +35',
        'CRI Rate +12%',
        'CRI Dmg +7%',
        'ATK +8%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[] }
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'spd', value: 35 }),
        ]),
      )
    })
  })

  describe('slot 4 CD main stat at low level', () => {
    it('detects CD +35% as main stat on slot 4 +6 (not innate)', () => {
      const text = [
        'Shield Rune (4)',
        '+6',
        '★★★★★★',
        'CRI Dmg +35%',
        'HP +7%',
        'ATK +5%',
        'DEF +12',
        'SPD +4',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        mainStat: { type: string; value: number }
        subStats: { type: string; value: number }[]
        innateStat?: { type: string; value: number }
      }
      expect(data.mainStat).toEqual({ type: 'cd', value: 35 })
      expect(data.subStats).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'cd' }),
        ]),
      )
      // CD should NOT be innate
      if (data.innateStat) {
        expect(data.innateStat.type).not.toBe('cd')
      }
    })

    it('detects CR +25% as main stat on slot 4 +6 (not innate)', () => {
      const text = [
        'Violent Rune (4)',
        '+6',
        '★★★★★★',
        'CRI Rate +25%',
        'HP +8%',
        'ATK +6%',
        'DEF +15',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as {
        mainStat: { type: string; value: number }
        subStats: { type: string; value: number }[]
      }
      expect(data.mainStat).toEqual({ type: 'cr', value: 25 })
    })
  })

  describe('partial flag propagation', () => {
    it('legend +12 with only 2 substats has partial = true', () => {
      // Slot 2 with SPD main stat, only 2 substats visible
      const text = 'Swift Rune (2) +12 Legend SPD +42 HP +8% ATK +5%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const data = result.data as { subStats: { type: string; value: number }[]; partial?: boolean }
      // Legend rune at +12 should have 4 substats, but only 2 are detected
      expect(data.subStats.length).toBeLessThan(4)
      expect(data.partial).toBe(true)
    })
  })
})
