/**
 * Summoners War Rune Parser
 *
 * Parses OCR text from Summoners War rune screenshots into structured RuneData
 */

import type { OcrResult, ParsedResult } from '../types.js'
import { cleanText, extractNumbers, failedResult, matchPattern, successResult, type GameParser } from './base-parser.js'

// --- Types (mirrors @game-analyzer/types/rune) ---

type RuneSet =
  | 'violent' | 'swift' | 'rage' | 'fatal' | 'despair' | 'blade' | 'focus'
  | 'guard' | 'energy' | 'endure' | 'shield' | 'revenge' | 'will' | 'nemesis'
  | 'vampire' | 'destroy' | 'fight' | 'determination' | 'enhance' | 'accuracy'
  | 'tolerance'

type RuneSlot = 1 | 2 | 3 | 4 | 5 | 6

type StatType =
  | 'hp' | 'hp%' | 'atk' | 'atk%' | 'def' | 'def%'
  | 'spd' | 'cr' | 'cd' | 'res' | 'acc'

interface RuneStat {
  type: StatType
  value: number
}

// --- Mappings ---

const RUNE_SETS: RuneSet[] = [
  'violent', 'swift', 'rage', 'fatal', 'despair', 'blade', 'focus',
  'guard', 'energy', 'endure', 'shield', 'revenge', 'will', 'nemesis',
  'vampire', 'destroy', 'fight', 'determination', 'enhance', 'accuracy',
  'tolerance',
]

/** Map OCR stat labels to StatType */
const STAT_LABEL_MAP: Record<string, StatType> = {
  'hp': 'hp',
  'atk': 'atk',
  'def': 'def',
  'spd': 'spd',
  'cri rate': 'cr',
  'cri dmg': 'cd',
  'resistance': 'res',
  'accuracy': 'acc',
}

/**
 * Parse a stat line like "ATK +160" or "CRI Rate +12%"
 * Returns null if the line doesn't match a known stat pattern
 */
function parseStat(line: string): RuneStat | null {
  const cleaned = cleanText(line).toLowerCase()

  // Try each known stat label (longest first to avoid partial matches)
  const sortedLabels = Object.keys(STAT_LABEL_MAP).sort((a, b) => b.length - a.length)

  for (const label of sortedLabels) {
    if (!cleaned.includes(label)) continue

    const isPercent = cleaned.includes('%')
    const numbers = extractNumbers(cleaned)
    if (numbers.length === 0) continue

    const value = Math.abs(numbers[numbers.length - 1]!)
    let statType = STAT_LABEL_MAP[label]!

    // For hp, atk, def: distinguish flat vs percent
    if (isPercent && (statType === 'hp' || statType === 'atk' || statType === 'def')) {
      statType = `${statType}%` as StatType
    }

    return { type: statType, value }
  }

  return null
}

/**
 * Detect rune set from a line of text
 */
function parseSet(text: string): RuneSet | null {
  const lower = text.toLowerCase()
  for (const set of RUNE_SETS) {
    if (lower.includes(set)) return set
  }
  return null
}

/**
 * Detect rune slot from text like "(6)" or "Slot 4"
 */
function parseSlot(text: string): RuneSlot | null {
  // Match "(N)" pattern
  const parenMatch = matchPattern(text, /\((\d)\)/)
  if (parenMatch) {
    const num = Number(parenMatch)
    if (num >= 1 && num <= 6) return num as RuneSlot
  }

  // Match "slot N" pattern
  const slotMatch = matchPattern(text, /slot\s*(\d)/i)
  if (slotMatch) {
    const num = Number(slotMatch)
    if (num >= 1 && num <= 6) return num as RuneSlot
  }

  return null
}

/**
 * Detect rune level from "+15" or "Level 15"
 */
function parseLevel(text: string): number | null {
  const levelMatch = matchPattern(text, /\+\s*(\d{1,2})\b/)
  if (levelMatch) return Number(levelMatch)

  const labelMatch = matchPattern(text, /level\s*(\d{1,2})/i)
  if (labelMatch) return Number(labelMatch)

  return null
}

/**
 * Detect rune grade (star count) from stars or "6*" or "Legend"
 */
function parseGrade(text: string): number | null {
  // Count star characters (various unicode stars)
  const starChars = text.match(/[★⭐✦✧*]{2,}/g)
  if (starChars) {
    const longest = starChars.reduce((a, b) => (a.length > b.length ? a : b))
    if (longest.length >= 1 && longest.length <= 6) return longest.length
  }

  // Match "N*" or "N star" pattern
  const numStarMatch = matchPattern(text, /(\d)\s*\*/)
  if (numStarMatch) {
    const num = Number(numStarMatch)
    if (num >= 1 && num <= 6) return num
  }

  // Grade keywords
  if (/legend/i.test(text)) return 6
  if (/hero/i.test(text)) return 5
  if (/rare/i.test(text)) return 4

  return null
}

/**
 * Summoners War rune parser implementation
 */
export const summonersWarParser: GameParser = {
  gameName: 'summoners-war',

  parse(ocrResult: OcrResult): ParsedResult {
    const errors: string[] = []
    const raw = ocrResult.text
    const lines = raw.split('\n').map((l) => cleanText(l)).filter(Boolean)

    if (lines.length === 0) {
      return failedResult(['Empty OCR text'])
    }

    // --- Parse set and slot from early lines ---
    let set: RuneSet | null = null
    let slot: RuneSlot | null = null
    let level: number | null = null
    let grade: number | null = null
    let mainStat: RuneStat | null = null
    const subStats: RuneStat[] = []

    for (const line of lines) {
      // Try to find set (usually in first lines)
      if (!set) {
        set = parseSet(line)
      }

      // Try to find slot
      if (!slot) {
        slot = parseSlot(line)
      }

      // Try to find grade
      if (!grade) {
        grade = parseGrade(line)
      }
    }

    // --- Parse level: look for standalone "+N" lines ---
    for (const line of lines) {
      if (/^\+\s*\d{1,2}$/.test(line)) {
        level = parseLevel(line)
        if (level !== null) break
      }
    }
    // Fallback: search all lines for level
    if (level === null) {
      for (const line of lines) {
        level = parseLevel(line)
        if (level !== null) break
      }
    }

    // --- Parse stats: main stat is first stat-like line, rest are substats ---
    for (const line of lines) {
      const stat = parseStat(line)
      if (!stat) continue

      if (!mainStat) {
        mainStat = stat
      } else {
        subStats.push(stat)
      }
    }

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
    })
  },
}
