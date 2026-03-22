/**
 * Summoners War Rune Parser
 *
 * Parses OCR text from Summoners War rune screenshots into structured RuneData.
 * Handles noisy single-line OCR output with leading garbage, missing spaces, etc.
 */

import type { OcrResult, ParsedResult } from '../types.js'
import { cleanText, failedResult, successResult, type GameParser } from './base-parser.js'

// --- Types (mirrors @game-analyzer/types/rune) ---

type RuneSet =
  | 'violent' | 'swift' | 'rage' | 'fatal' | 'despair' | 'blade' | 'focus'
  | 'guard' | 'energy' | 'endure' | 'shield' | 'revenge' | 'will' | 'nemesis'
  | 'vampire' | 'destroy' | 'fight' | 'determination' | 'enhance' | 'accuracy'
  | 'tolerance' | 'cruel'

type RuneSlot = 1 | 2 | 3 | 4 | 5 | 6

type StatType =
  | 'hp' | 'hp%' | 'atk' | 'atk%' | 'def' | 'def%'
  | 'spd' | 'cr' | 'cd' | 'res' | 'acc'

interface RuneStat {
  type: StatType
  value: number
}

type RuneQuality = 'legend' | 'hero' | 'rare' | 'magic' | 'normal'

// --- Mappings ---

const RUNE_SETS: RuneSet[] = [
  'violent', 'swift', 'rage', 'fatal', 'despair', 'blade', 'focus',
  'guard', 'energy', 'endure', 'shield', 'revenge', 'will', 'nemesis',
  'vampire', 'destroy', 'fight', 'determination', 'enhance', 'accuracy',
  'tolerance', 'cruel',
]

/** Stat patterns sorted longest-first. Each entry: [label regex, stat type] */
const STAT_PATTERNS: [RegExp, StatType][] = [
  [/cri(?:tical)?\s*rate/i, 'cr'],
  [/cri(?:tical)?\s*dmg/i, 'cd'],
  [/resistance/i, 'res'],
  [/accuracy/i, 'acc'],
  [/atk/i, 'atk'],
  [/def/i, 'def'],
  [/hp/i, 'hp'],
  [/spd/i, 'spd'],
]

/** Quality keywords mapped to substats count and grade */
const QUALITY_MAP: Record<string, { quality: RuneQuality; grade: number }> = {
  'legend': { quality: 'legend', grade: 6 },
  'leger': { quality: 'legend', grade: 6 },
  'leg': { quality: 'legend', grade: 6 },
  'hero': { quality: 'hero', grade: 5 },
  'heo': { quality: 'hero', grade: 5 },
  'rare': { quality: 'rare', grade: 4 },
  'magic': { quality: 'magic', grade: 3 },
  'normal': { quality: 'normal', grade: 2 },
}

/**
 * Normalize OCR text: collapse whitespace, strip UI noise, lowercase
 */
function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r?\n/g, ' ')
    .replace(/[|]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(temporarily|tempo!)\b/gi, '')
    .trim()
}

/**
 * Extract all stat occurrences from the text.
 * Handles both "STAT +VALUE%" and "STAT+VALUE%" (no space).
 * Returns stats in order of appearance.
 */
function extractAllStats(text: string): RuneStat[] {
  const stats: RuneStat[] = []
  const normalized = text

  for (const [pattern, baseType] of STAT_PATTERNS) {
    // Build a regex that finds the stat label followed by an optional sign and number
    // Handles: "ATK +118", "ATK+118", "HP +16%", "HP+16%", "CRI Rate +11%"
    const fullRegex = new RegExp(
      `${pattern.source}\\s*[+\\-]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(%?)`,
      'gi',
    )

    let match: RegExpExecArray | null
    while ((match = fullRegex.exec(normalized)) !== null) {
      const value = parseFloat(match[1]!.replace(',', '.'))
      const isPercent = match[2] === '%'

      let statType: StatType = baseType
      if (isPercent && (baseType === 'hp' || baseType === 'atk' || baseType === 'def')) {
        statType = `${baseType}%` as StatType
      }

      stats.push({ type: statType, value, _index: match.index } as RuneStat & { _index: number })
    }
  }

  // Sort by position in the original text to preserve order
  stats.sort((a, b) => ((a as unknown as { _index: number })._index) - ((b as unknown as { _index: number })._index))

  // Remove the _index helper
  return stats.map(({ type, value }) => ({ type, value }))
}

/**
 * Detect rune set from text. Looks for "SET Rune" or just the set name.
 */
function parseSet(text: string): RuneSet | null {
  const lower = text.toLowerCase()

  // Prefer "SET Rune" pattern for accuracy
  for (const set of RUNE_SETS) {
    const runePattern = new RegExp(`${set}\\s+rune`, 'i')
    if (runePattern.test(lower)) return set
  }

  // Fallback: just find a set name in the text
  for (const set of RUNE_SETS) {
    if (lower.includes(set)) return set
  }
  return null
}

/**
 * Detect rune slot from "Rune (N)" pattern.
 * Must be careful: OCR noise can contain other parenthesized numbers.
 * We look specifically for "Rune (N)" or "rune(N)" patterns.
 */
function parseSlot(text: string): RuneSlot | null {
  // "Rune (N)" or "Rune(N)" — the most reliable pattern
  const runeSlotMatch = text.match(/rune\s*\((\d)\)/i)
  if (runeSlotMatch) {
    const num = Number(runeSlotMatch[1])
    if (num >= 1 && num <= 6) return num as RuneSlot
  }

  // "Slot N"
  const slotMatch = text.match(/slot\s*(\d)/i)
  if (slotMatch) {
    const num = Number(slotMatch[1])
    if (num >= 1 && num <= 6) return num as RuneSlot
  }

  return null
}

/**
 * Detect quality (Legend/Hero/Rare/Magic/Normal).
 * Returns the grade number or null.
 */
function parseQuality(text: string): { quality: RuneQuality; grade: number } | null {
  const lower = text.toLowerCase()
  // Sort keys longest first to avoid partial matches
  const keys = Object.keys(QUALITY_MAP).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    // Use word boundary to avoid matching "legend" inside other words, but be flexible
    const pattern = new RegExp(`\\b${key}\\b`, 'i')
    if (pattern.test(lower)) return QUALITY_MAP[key]!
  }
  return null
}

/**
 * Detect rune grade from stars or "N*" patterns.
 */
function parseGrade(text: string): number | null {
  // Count star characters
  const starChars = text.match(/[★⭐✦✧*]{2,}/g)
  if (starChars) {
    const longest = starChars.reduce((a, b) => (a.length > b.length ? a : b))
    if (longest.length >= 1 && longest.length <= 6) return longest.length
  }

  // "N*" or "N star"
  const numStarMatch = text.match(/(\d)\s*\*/)
  if (numStarMatch) {
    const num = Number(numStarMatch[1])
    if (num >= 1 && num <= 6) return num
  }

  return null
}

/**
 * Detect rune level from "+N" at the start of the rune info
 * (before the set name or right after the noise prefix).
 * Must avoid confusing stat values like "ATK +118" with level.
 */
function parseLevel(text: string): number | null {
  // Look for a standalone +N that is clearly the rune level (1-15)
  // The level appears before the set name or early in the text
  const setIndex = text.search(/\b(?:violent|swift|rage|fatal|despair|blade|focus|guard|energy|endure|shield|revenge|will|nemesis|vampire|destroy|fight|determination|enhance|accuracy|tolerance|cruel)\b/i)

  // Check for "+N" before the set name (typical for "Strong" prefix lines)
  if (setIndex > 0) {
    const beforeSet = text.substring(0, setIndex)
    const levelMatch = beforeSet.match(/\+\s*(\d{1,2})\b/)
    if (levelMatch) {
      const num = Number(levelMatch[1])
      if (num >= 0 && num <= 15) return num
    }
  }

  // Look for standalone "+N" on its own line or surrounded by spaces
  const standaloneMatch = text.match(/(?:^|\s)\+\s*(\d{1,2})(?:\s|$)/)
  if (standaloneMatch) {
    const num = Number(standaloneMatch[1])
    if (num >= 0 && num <= 15) return num
  }

  // "Level N"
  const labelMatch = text.match(/level\s*(\d{1,2})/i)
  if (labelMatch) {
    const num = Number(labelMatch[1])
    if (num >= 0 && num <= 15) return num
  }

  return null
}

/**
 * Extract set bonus info like "4 Set :" or "2 Set :"
 */
function parseSetPieceCount(text: string): number | null {
  const match = text.match(/(\d)\s*set\s*:/i)
  if (match) return Number(match[1])
  return null
}

/**
 * Summoners War rune parser implementation.
 *
 * Designed to handle noisy single-line OCR text with:
 * - Leading garbage (#1 412, a (#412, etc.)
 * - Missing spaces (HP+16%)
 * - UI button text (Temporarily, Tempo!)
 * - Set bonus suffix (4 Set : Stun Rate +25%)
 */
export const summonersWarParser: GameParser = {
  gameName: 'summoners-war',

  parse(ocrResult: OcrResult): ParsedResult {
    const errors: string[] = []
    const raw = ocrResult.text

    if (!raw || !raw.trim()) {
      return failedResult(['Empty OCR text'])
    }

    // Normalize: single line, clean noise
    const normalized = normalizeOcrText(raw)

    // Strip set bonus suffix ("4 Set : ..." or "2 Set : ...") to avoid false stat matches
    const setBonusIndex = normalized.search(/\d\s*set\s*:/i)
    const textWithoutSetBonus = setBonusIndex >= 0
      ? normalized.substring(0, setBonusIndex)
      : normalized

    // --- Parse set ---
    const set = parseSet(textWithoutSetBonus)

    // --- Parse slot ---
    const slot = parseSlot(textWithoutSetBonus)

    // --- Parse grade: try stars first, then quality keyword ---
    let grade = parseGrade(textWithoutSetBonus)
    const qualityInfo = parseQuality(textWithoutSetBonus)
    if (!grade && qualityInfo) {
      grade = qualityInfo.grade
    }

    // --- Parse level ---
    const level = parseLevel(textWithoutSetBonus)

    // --- Parse stats ---
    const allStats = extractAllStats(textWithoutSetBonus)
    const mainStat = allStats.length > 0 ? allStats[0]! : null
    const subStats = allStats.slice(1)

    // --- Parse set piece count ---
    const setPieceCount = parseSetPieceCount(normalized)

    // --- Validate required fields ---
    if (!set) errors.push('Could not detect rune set')
    if (!slot) errors.push('Could not detect rune slot')
    if (!mainStat) errors.push('Could not detect main stat')

    if (errors.length > 0) {
      return failedResult(errors)
    }

    return successResult({
      set: set!,
      slot: slot!,
      grade: grade ?? 6,
      level: level ?? 0,
      mainStat: mainStat!,
      subStats,
      ...(qualityInfo ? { quality: qualityInfo.quality } : {}),
      ...(setPieceCount ? { setPieceCount } : {}),
    })
  },
}
