/**
 * Nikke: Goddess of Victory — Gear Parser
 *
 * Parses OCR text from gear screenshots into structured GearData
 */

import type { OcrResult, GameParser } from '@ezstart/ocr-sdk'
import { cleanText, extractNumbers, matchPattern, failedResult, successResult } from '@ezstart/ocr-sdk'

// --- Mappings ---

const GEAR_TYPES = ['helm', 'gloves', 'chest', 'boots'] as const

const MANUFACTURERS = ['elysion', 'missilis', 'tetra', 'pilgrim', 'abnormal'] as const

/** Map OCR stat names to GearStatType identifiers */
const STAT_NAME_MAP: Record<string, string> = {
  'crit rate': 'crit-rate',
  'crit dmg': 'crit-dmg',
  'charge spd': 'charge-spd',
  'charge dmg': 'charge-dmg',
  'element dmg': 'element-dmg',
  'hit rate': 'hit-rate',
  ammo: 'ammo',
  atk: 'atk',
  def: 'def',
  hp: 'hp',
}

// --- Helpers ---

function parseGearType(text: string): string | null {
  const lower = text.toLowerCase()
  for (const t of GEAR_TYPES) {
    if (lower.includes(t)) return t
  }
  return null
}

function parseManufacturer(text: string): string | null {
  const lower = text.toLowerCase()
  for (const m of MANUFACTURERS) {
    if (lower.includes(m)) return m
  }
  return null
}

function parseLevel(text: string): number | null {
  const match = matchPattern(text, /lv\.?\s*(\d+)/i)
  if (!match) return null
  const nums = extractNumbers(match)
  return nums.length > 0 ? nums[0]! : null
}

function parseTier(text: string): number | null {
  const match = matchPattern(text, /tier\s*(\d+)/i)
  if (!match) return null
  const nums = extractNumbers(match)
  return nums.length > 0 ? nums[0]! : null
}

/**
 * Build a regex that matches all known stat names (longest first to avoid partial matches)
 */
function buildStatPattern(): RegExp {
  const names = Object.keys(STAT_NAME_MAP).sort((a, b) => b.length - a.length)
  const group = names.join('|')
  // Matches: STAT_NAME +/-VALUE% or STAT_NAME +/-VALUE
  return new RegExp(`(${group})\\s*[+\\-]\\s*([\\d.,]+)\\s*(%?)`, 'gi')
}

interface ParsedStat {
  type: string
  value: number
}

function parseStats(text: string): ParsedStat[] {
  const pattern = buildStatPattern()
  const stats: ParsedStat[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const rawName = match[1]!.toLowerCase().trim()
    const rawValue = match[2]!.replace(',', '.')
    const isPercent = match[3] === '%'
    const value = Number(rawValue)

    if (isNaN(value)) continue

    const baseType = STAT_NAME_MAP[rawName]
    if (!baseType) continue

    // For atk/def/hp, append % variant when value has %
    const hasPercentVariant = ['atk', 'def', 'hp'].includes(baseType)
    const statType = hasPercentVariant && isPercent ? `${baseType}%` : baseType

    stats.push({ type: statType, value })
  }

  return stats
}

// --- Parser ---

export const nikkeParser: GameParser = {
  gameName: 'nikke',

  parse(ocrResult: OcrResult) {
    const errors: string[] = []
    const raw = cleanText(ocrResult.text)

    const gearType = parseGearType(raw)
    if (!gearType) errors.push('Could not detect gear type')

    const manufacturer = parseManufacturer(raw)
    if (!manufacturer) errors.push('Could not detect manufacturer')

    const level = parseLevel(raw)
    if (level === null) errors.push('Could not detect level')

    const tier = parseTier(raw)
    if (tier === null) errors.push('Could not detect tier')

    const stats = parseStats(raw)
    if (stats.length === 0) errors.push('Could not detect any stats')

    // Need at least type + manufacturer + 1 stat to be useful
    if (errors.length > 2) {
      return failedResult(errors)
    }

    const mainStat = stats[0] ?? { type: 'atk', value: 0 }
    const subStats = stats.slice(1)

    return successResult({
      type: gearType ?? 'helm',
      manufacturer: manufacturer ?? 'elysion',
      level: level ?? 0,
      tier: tier ?? 0,
      mainStat: { type: mainStat.type, value: mainStat.value },
      subStats: subStats.map((s) => ({ type: s.type, value: s.value })),
    })
  },
}
