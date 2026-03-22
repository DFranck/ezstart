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
      const text = 'Hello World\nThis is not a rune\nJust random text'

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('fails when set is missing', () => {
      const text = [
        'Rune (3)',
        '+12',
        'DEF +160',
      ].join('\n')

      const result = summonersWarParser.parse(makeOcrResult(text))

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Could not detect rune set')
    })
  })
})
