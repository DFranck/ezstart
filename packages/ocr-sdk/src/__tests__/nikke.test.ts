import { describe, it, expect } from 'vitest'
import { nikkeParser } from '../parsers/nikke.js'
import type { OcrResult } from '../types.js'

function makeOcrResult(text: string): OcrResult {
  return { text, confidence: 0.9, regions: [] }
}

describe('nikkeParser', () => {
  it('should have gameName "nikke"', () => {
    expect(nikkeParser.gameName).toBe('nikke')
  })

  describe('complete gear parsing', () => {
    it('parses a full gear with type, manufacturer, level, tier, main stat and substats', () => {
      const ocr = makeOcrResult(`
        Helm
        Elysion
        Lv. 10
        Tier 9
        ATK +1.28%
        HP +512
        DEF +2.14%
        CRIT Rate +3.52%
        Charge SPD +1.07%
      `)

      const result = nikkeParser.parse(ocr)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        type: 'helm',
        manufacturer: 'elysion',
        level: 10,
        tier: 9,
        mainStat: { type: 'atk%', value: 1.28 },
        subStats: [
          { type: 'hp', value: 512 },
          { type: 'def%', value: 2.14 },
          { type: 'crit-rate', value: 3.52 },
          { type: 'charge-spd', value: 1.07 },
        ],
      })
    })

    it('parses boots with pilgrim manufacturer', () => {
      const ocr = makeOcrResult(`
        Boots
        Pilgrim
        Lv. 5
        Tier 7
        DEF +320
        ATK +1.5%
      `)

      const result = nikkeParser.parse(ocr)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        type: 'boots',
        manufacturer: 'pilgrim',
        level: 5,
        tier: 7,
        mainStat: { type: 'def', value: 320 },
        subStats: [{ type: 'atk%', value: 1.5 }],
      })
    })

    it('parses gear with flat and percent variants correctly', () => {
      const ocr = makeOcrResult(`
        Chest
        Tetra
        Lv. 8
        Tier 6
        HP +2.5%
        ATK +400
        CRIT DMG +5.1%
        Element DMG +3.0%
      `)

      const result = nikkeParser.parse(ocr)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        type: 'chest',
        manufacturer: 'tetra',
        level: 8,
        tier: 6,
        mainStat: { type: 'hp%', value: 2.5 },
        subStats: [
          { type: 'atk', value: 400 },
          { type: 'crit-dmg', value: 5.1 },
          { type: 'element-dmg', value: 3 },
        ],
      })
    })
  })

  describe('noisy OCR text', () => {
    it('handles extra whitespace and mixed casing', () => {
      const ocr = makeOcrResult(`
        GLOVES
          MISSILIS
        Lv.   15
        tier  10
        atk  +800
        Hit Rate  +2.33%
      `)

      const result = nikkeParser.parse(ocr)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        type: 'gloves',
        manufacturer: 'missilis',
        level: 15,
        tier: 10,
        mainStat: { type: 'atk', value: 800 },
        subStats: [{ type: 'hit-rate', value: 2.33 }],
      })
    })

    it('handles OCR artifacts like pipe characters', () => {
      const ocr = makeOcrResult(`
        |Helm|
        |Abnormal|
        |Lv. 3|
        |Tier 4|
        |Charge DMG +4.20%|
        |Ammo +5|
      `)

      const result = nikkeParser.parse(ocr)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        type: 'helm',
        manufacturer: 'abnormal',
        level: 3,
        tier: 4,
        mainStat: { type: 'charge-dmg', value: 4.2 },
        subStats: [{ type: 'ammo', value: 5 }],
      })
    })
  })

  describe('failed parsing', () => {
    it('returns failure for completely unrelated text', () => {
      const ocr = makeOcrResult('Hello this is a random text with no gear data')

      const result = nikkeParser.parse(ocr)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('returns failure for empty text', () => {
      const ocr = makeOcrResult('')

      const result = nikkeParser.parse(ocr)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })
})
