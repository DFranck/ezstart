import { describe, expect, it } from 'vitest'

import type { OcrResult } from '../../src/types.js'
import { summonersWarArtifactParser } from '../parsers/summoners-war-artifact.js'

function makeOcrResult(text: string): OcrResult {
  return { text, confidence: 0.9, regions: [] }
}

describe('summonersWarArtifactParser', () => {
  it('has correct gameName', () => {
    expect(summonersWarArtifactParser.gameName).toBe('summoners-war-artifact')
  })

  describe('complete artifact parsing', () => {
    it('parses a standard Attack artifact (Legend +12)', () => {
      const text = [
        'Attack Artifact',
        'ATK +50',
        'Legend',
        '+12',
        'CRIT DMG on single-target +4%',
        'Additional DMG by ATK +3%',
        'Life Drain +5%',
        'Recovery +4%',
      ].join('\n')

      const result = summonersWarArtifactParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        category: 'type',
        artifactType: 'attack',
        artifactAttribute: null,
        quality: 'legend',
        level: 12,
        mainStat: { type: 'atk', value: 50 },
      })
      expect(result.data.subStats).toHaveLength(4)

      const subStats = result.data.subStats as { effect: string; value: number }[]
      expect(subStats[0]).toMatchObject({ effect: expect.stringContaining('CRIT DMG'), value: 4 })
      expect(subStats[1]).toMatchObject({ effect: expect.stringContaining('Additional DMG'), value: 3 })
      expect(subStats[2]).toMatchObject({ effect: expect.stringContaining('Life Drain'), value: 5 })
      expect(subStats[3]).toMatchObject({ effect: expect.stringContaining('Recovery'), value: 4 })
    })

    it('parses a Fire attribute artifact', () => {
      const text = [
        'Fire Artifact',
        'HP +100',
        'Hero',
        '+9',
        'Recovery +3%',
        'Life Drain +4%',
        'Additional DMG by HP +2%',
      ].join('\n')

      const result = summonersWarArtifactParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        category: 'attribute',
        artifactType: null,
        artifactAttribute: 'fire',
        quality: 'hero',
        level: 9,
        mainStat: { type: 'hp', value: 100 },
      })
      expect(result.data.subStats).toHaveLength(3)
    })

    it('parses a Defense type artifact', () => {
      const text = [
        'Defense Artifact',
        'DEF +30',
        'Rare',
        '+6',
        'Shield amount +3%',
        'Recovery +2%',
      ].join('\n')

      const result = summonersWarArtifactParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        category: 'type',
        artifactType: 'defense',
        quality: 'rare',
        level: 6,
        mainStat: { type: 'def', value: 30 },
      })
      expect(result.data.subStats).toHaveLength(2)
    })

    it('parses a Support type artifact (+15)', () => {
      const text = [
        'Support Artifact',
        'HP +200',
        'Legend',
        '+15',
        'Heal amount +5%',
        'Recovery +4%',
        'Ally HP recovery +3%',
        'Life Drain +4%',
      ].join('\n')

      const result = summonersWarArtifactParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        category: 'type',
        artifactType: 'support',
        quality: 'legend',
        level: 15,
        mainStat: { type: 'hp', value: 200 },
      })
      expect(result.data.subStats).toHaveLength(4)
    })

    it('parses a Dark attribute artifact', () => {
      const text = [
        'Dark Artifact',
        'ATK +40',
        'Magic',
        '+3',
        'Additional DMG by ATK +2%',
      ].join('\n')

      const result = summonersWarArtifactParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        category: 'attribute',
        artifactAttribute: 'dark',
        quality: 'magic',
        level: 3,
        mainStat: { type: 'atk', value: 40 },
      })
      expect(result.data.subStats).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    it('fails when text is not an artifact', () => {
      const text = 'Violent Rune (6) +15 HP +63%'
      const result = summonersWarArtifactParser.parse(makeOcrResult(text))
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('handles artifact with no substats (level 0)', () => {
      const text = [
        'Water Artifact',
        'DEF +10',
        'Normal',
        '+0',
      ].join('\n')

      const result = summonersWarArtifactParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        category: 'attribute',
        artifactAttribute: 'water',
        quality: 'normal',
        level: 0,
        mainStat: { type: 'def', value: 10 },
      })
      expect(result.data.subStats).toHaveLength(0)
    })

    it('handles noisy OCR with extra characters', () => {
      const text = [
        '| Wind Artifact |',
        'HP +80',
        'Rare',
        '+6',
        'Life Drain +3%',
      ].join('\n')

      const result = summonersWarArtifactParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      expect(result.data.category).toBe('attribute')
      expect(result.data.artifactAttribute).toBe('wind')
    })

    it('caps substats at 4 maximum', () => {
      const text = [
        'Attack Artifact',
        'ATK +50',
        'Legend',
        '+15',
        'CRIT DMG on single-target +4%',
        'Additional DMG by ATK +3%',
        'Life Drain +5%',
        'Recovery +4%',
        'Shield amount +2%',
      ].join('\n')

      const result = summonersWarArtifactParser.parse(makeOcrResult(text))

      expect(result.success).toBe(true)
      const subStats = result.data.subStats as unknown[]
      expect(subStats).toHaveLength(4)
    })
  })
})
