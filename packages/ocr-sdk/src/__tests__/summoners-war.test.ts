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
    it('parses a standard Violent rune', () => {
      const text = [
        'Violent Rune (6)',
        '+15',
        '★★★★★★',
        'ATK +160',
        'SPD +23',
        'CRI Rate +12%',
        'CRI Dmg +7%',
        'HP +8%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'violent',
        slot: 6,
        grade: 6,
        level: 15,
        mainStat: { type: 'atk', value: 160 },
        subStats: [
          { type: 'spd', value: 23 },
          { type: 'cr', value: 12 },
          { type: 'cd', value: 7 },
          { type: 'hp%', value: 8 },
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

  describe('real OCR text (single-line, noisy)', () => {
    it('parses "#1 412 strong Despair Rune (1) ..." format', () => {
      const text =
        '#1 412 strong Despair Rune (1) ATK +118 Legend HP +184 CRI Rate +11% HP+16% Resistance +14% CRI Dmg +16% 4 Set : Stun Rate +25%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'despair',
        slot: 1,
        mainStat: { type: 'atk', value: 118 },
      })

      const data = result.data as { subStats: { type: string; value: number }[]; quality: string }
      expect(data.quality).toBe('legend')
      // Substats should include HP, CRI Rate, HP%, Resistance, CRI Dmg
      expect(data.subStats.length).toBeGreaterThanOrEqual(4)
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'cr', value: 11 }),
          expect.objectContaining({ type: 'cd', value: 16 }),
          expect.objectContaining({ type: 'res', value: 14 }),
        ]),
      )
    })

    it('parses "a (#412 Cruel Rage Rune (1) ..." format', () => {
      const text =
        'a (#412 Cruel Rage Rune (1) ATK +118 Hero CRI Dmg +4% CRI Rate +11% SPD +14 ATK +14% HP +10% 4 Set : CRI Dmg +40%'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      // Should match "Rage" as the set (Cruel is also valid but Rage comes first in "Cruel Rage")
      expect(['rage', 'cruel']).toContain(result.data.set)
      expect(result.data).toMatchObject({
        slot: 1,
        mainStat: { type: 'atk', value: 118 },
      })

      const data = result.data as { subStats: { type: string; value: number }[]; quality: string }
      expect(data.quality).toBe('hero')
      expect(data.subStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'cd', value: 4 }),
          expect.objectContaining({ type: 'cr', value: 11 }),
          expect.objectContaining({ type: 'spd', value: 14 }),
        ]),
      )
    })

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
      // The "Resistance +25%" from set bonus should NOT appear as a substat
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
        'DEF +160',
        'SPD +18',
        'HP +12%',
        'ATK +8%',
        'CRI Rate +6%',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        set: 'despair',
        grade: 6,
      })
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
})
