/**
 * Summoners War Rune Parser
 *
 * Parses OCR text from Summoners War rune screenshots into structured RuneData.
 * Handles noisy single-line OCR output with leading garbage, missing spaces, etc.
 *
 * Design principle: TOLERANT to noise — better to extract partially than nothing.
 * If we find set + main stat, return success even if some substats are missing.
 */

import type { OcrResult, ParsedResult } from '../types.js'
import { failedResult, successResult, type GameParser } from './base-parser.js'

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

// --- SW game rule: max 4 substats per rune ---

const MAX_SUBSTATS = 4

// --- Fixed main stats for slots 1, 3, 5 (always the same in SW) ---

const FIXED_MAIN_STATS: Record<number, { type: StatType; values: number[] }> = {
  1: { type: 'atk', values: [118, 160] },   // ATK flat
  3: { type: 'def', values: [118, 160] },   // DEF flat
  5: { type: 'hp', values: [1680, 2448] },  // HP flat
}

// --- Substat value ranges for 6★ runes (min-max including grinds/rolls) ---

const SUBSTAT_RANGES: Record<StatType, { min: number; max: number }> = {
  'hp':   { min: 100, max: 1875 },
  'hp%':  { min: 4, max: 40 },
  'atk':  { min: 8, max: 100 },
  'atk%': { min: 4, max: 40 },
  'def':  { min: 8, max: 100 },
  'def%': { min: 4, max: 40 },
  'spd':  { min: 1, max: 30 },
  'cr':   { min: 3, max: 30 },
  'cd':   { min: 4, max: 35 },
  'res':  { min: 4, max: 40 },
  'acc':  { min: 4, max: 40 },
}

// --- Fuzzy stat name aliases (handles OCR misreads) ---

const STAT_ALIASES: Record<string, StatType> = {
  'accuracy': 'acc',
  'acturaty': 'acc',
  'accuraty': 'acc',
  'acc': 'acc',
  'acu': 'acc',
  'resistance': 'res',
  'res': 'res',
  'ress': 'res',
  'cri rate': 'cr',
  'crirate': 'cr',
  'crit rate': 'cr',
  'critrate': 'cr',
  'cri': 'cr',
  'rate': 'cr',
  'rat': 'cr',
  'cri dmg': 'cd',
  'cridmg': 'cd',
  'crit dmg': 'cd',
  'critdmg': 'cd',
  'dmg': 'cd',
  'dag': 'cd',
  'spd': 'spd',
  'speed': 'spd',
  'sp': 'spd',
  'hp': 'hp',
  'atk': 'atk',
  'attack': 'atk',
  'axes': 'atk',
  'ak': 'atk',
  'def': 'def',
  'defense': 'def',
}

// --- Mappings ---

/** All valid rune sets, sorted longest-first for matching priority */
const RUNE_SETS: RuneSet[] = [
  'determination', 'tolerance', 'accuracy', 'vampire', 'violent', 'destroy',
  'despair', 'revenge', 'enhance', 'nemesis', 'endure', 'energy', 'shield',
  'fatal', 'swift', 'focus', 'guard', 'blade', 'fight', 'cruel', 'rage',
  'will',
]

/** Stat patterns sorted longest-first to avoid partial matches */
const STAT_PATTERNS: [RegExp, StatType][] = [
  [/cri(?:tical)?\s*rate/i, 'cr'],
  [/crit\s*rate/i, 'cr'],
  [/crirate/i, 'cr'],
  [/cri(?:tical)?\s*dmg/i, 'cd'],
  [/crit\s*dmg/i, 'cd'],
  [/cridmg/i, 'cd'],
  [/resistance/i, 'res'],
  [/accuracy/i, 'acc'],
  [/acturaty/i, 'acc'],
  [/accuraty/i, 'acc'],
  [/axes/i, 'atk'],
  [/attack/i, 'atk'],
  [/defense/i, 'def'],
  [/speed/i, 'spd'],
  [/atk/i, 'atk'],
  [/\bak\b/i, 'atk'],
  [/def/i, 'def'],
  [/hp/i, 'hp'],
  [/spd/i, 'spd'],
  [/\bsp\b/i, 'spd'],
  [/\bress?\b/i, 'res'],
  [/\bacu\b/i, 'acc'],
]

/** Quality keywords — includes common OCR misreads */
const QUALITY_KEYWORDS: { pattern: RegExp; quality: RuneQuality; grade: number }[] = [
  { pattern: /\blegend(?:ary)?\b/i, quality: 'legend', grade: 6 },
  { pattern: /\bleger\b/i, quality: 'legend', grade: 6 },
  { pattern: /\bleg\b/i, quality: 'legend', grade: 6 },
  { pattern: /\bhero(?:ic)?\b/i, quality: 'hero', grade: 5 },
  { pattern: /\bheo\b/i, quality: 'hero', grade: 5 },
  { pattern: /\brare\b/i, quality: 'rare', grade: 4 },
  { pattern: /\bmagic\b/i, quality: 'magic', grade: 3 },
  { pattern: /\bnormal\b/i, quality: 'normal', grade: 2 },
]

/**
 * Normalize OCR text: collapse newlines/whitespace, strip common UI noise
 */
function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r?\n/g, ' ')
    .replace(/[|»©€×]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(temporarily|tempo!)\b/gi, '')
    .trim()
}

/**
 * Preserve line structure for multiline stat detection.
 * Returns cleaned lines (trim, remove noise chars, but keep line separation).
 */
function toCleanLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(line => line
      .replace(/[|»©€×]/g, '')
      .replace(/\b(temporarily|tempo!)\b/gi, '')
      .trim()
    )
    .filter(line => line.length > 0)
}

/**
 * Strip text before the set+rune pattern to remove leading garbage.
 * Real OCR often starts with: "AEE», #2 115 Intricate Violent Rune (1) ..."
 * We want everything from the set name onward.
 */
function stripLeadingGarbage(text: string): { cleaned: string; setName: RuneSet } | null {
  const lower = text.toLowerCase()

  for (const set of RUNE_SETS) {
    // Look for "SET Rune" pattern (with optional adjective before set)
    const runePattern = new RegExp(`(?:\\w+\\s+)?${set}\\s+rune`, 'i')
    const match = lower.match(runePattern)
    if (match && match.index !== undefined) {
      return {
        cleaned: text.substring(match.index),
        setName: set,
      }
    }
  }

  // Fallback: just find set name anywhere
  for (const set of RUNE_SETS) {
    const idx = lower.indexOf(set)
    if (idx >= 0) {
      return {
        cleaned: text.substring(idx),
        setName: set,
      }
    }
  }

  return null
}

/**
 * Extract all stat occurrences from the text.
 * Returns stats in order of appearance with their position index.
 */
function extractAllStats(text: string): (RuneStat & { _index: number })[] {
  const stats: (RuneStat & { _index: number })[] = []

  for (const [pattern, baseType] of STAT_PATTERNS) {
    const fullRegex = new RegExp(
      `(${pattern.source})\\s*[+\\-]\\s*(\\d+(?:[.,]\\d+)?)\\s*(%?)`,
      'gi',
    )

    let match: RegExpExecArray | null
    while ((match = fullRegex.exec(text)) !== null) {
      const valueStr = match[match.length - 2]!
      const percentStr = match[match.length - 1]!
      const value = parseFloat(valueStr.replace(',', '.'))
      const isPercent = percentStr === '%'

      let statType: StatType = baseType
      if (isPercent && (baseType === 'hp' || baseType === 'atk' || baseType === 'def')) {
        statType = `${baseType}%` as StatType
      }

      stats.push({ type: statType, value, _index: match.index })
    }
  }

  // Sort by position in original text
  stats.sort((a, b) => a._index - b._index)

  return stats
}

/**
 * Multiline stat extraction: detect stat names on one line with value on next line.
 *
 * OCR sometimes splits like:
 *   "SPD 51"    (51 is noise — position/slot number)
 *   "2 +6"      (+6 is the actual value)
 *
 * Or:
 *   "Ce SPD 51"
 *
 * Strategy: look for stat name without +VALUE on a line, then check next line for +N.
 */
function extractMultilineStats(lines: string[]): RuneStat[] {
  const multilineStats: RuneStat[] = []

  // All known stat name patterns for detection
  const statNamePatterns: [RegExp, StatType][] = [
    [/cri(?:tical)?\s*rate/i, 'cr'],
    [/crit\s*rate/i, 'cr'],
    [/crirate/i, 'cr'],
    [/cri(?:tical)?\s*dmg/i, 'cd'],
    [/crit\s*dmg/i, 'cd'],
    [/cridmg/i, 'cd'],
    [/resistance/i, 'res'],
    [/accuracy/i, 'acc'],
    [/acturaty/i, 'acc'],
    [/accuraty/i, 'acc'],
    [/axes/i, 'atk'],
    [/attack/i, 'atk'],
    [/defense/i, 'def'],
    [/speed/i, 'spd'],
    [/\batk\b/i, 'atk'],
    [/\bak\b/i, 'atk'],
    [/\bdef\b/i, 'def'],
    [/\bhp\b/i, 'hp'],
    [/\bspd\b/i, 'spd'],
    [/\bsp\b/i, 'spd'],
    [/\bress?\b/i, 'res'],
    [/\bacu\b/i, 'acc'],
  ]

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i]!
    const nextLine = lines[i + 1]!

    for (const [namePattern, baseType] of statNamePatterns) {
      // Check if this line has a stat name but NOT a proper +VALUE on same line
      const hasStatName = namePattern.test(line)
      const hasValueOnSameLine = new RegExp(
        `${namePattern.source}\\s*[+\\-]\\s*\\d+`,
        'i',
      ).test(line)

      if (hasStatName && !hasValueOnSameLine) {
        // Check next line for a +N value
        const valueMatch = nextLine.match(/[+\-]\s*(\d+)\s*(%?)/)
        if (valueMatch) {
          const value = parseInt(valueMatch[1]!, 10)
          const isPercent = valueMatch[2] === '%'

          let statType: StatType = baseType
          if (isPercent && (baseType === 'hp' || baseType === 'atk' || baseType === 'def')) {
            statType = `${baseType}%` as StatType
          }

          multilineStats.push({ type: statType, value })
          break // Only match one stat per line
        }
      }
    }
  }

  return multilineStats
}

/**
 * Detect rune set from text. Prefers "SET Rune" pattern.
 */
function parseSet(text: string): RuneSet | null {
  const lower = text.toLowerCase()

  // Prefer "SET Rune" pattern
  for (const set of RUNE_SETS) {
    const runePattern = new RegExp(`${set}\\s+rune`, 'i')
    if (runePattern.test(lower)) return set
  }

  // Fallback: set name anywhere
  for (const set of RUNE_SETS) {
    if (lower.includes(set)) return set
  }
  return null
}

/**
 * Detect rune slot from "Rune (N)" pattern.
 */
function parseSlot(text: string): RuneSlot | null {
  const runeSlotMatch = text.match(/rune\s*\((\d)\)/i)
  if (runeSlotMatch) {
    const num = Number(runeSlotMatch[1])
    if (num >= 1 && num <= 6) return num as RuneSlot
  }

  const slotMatch = text.match(/slot\s*(\d)/i)
  if (slotMatch) {
    const num = Number(slotMatch[1])
    if (num >= 1 && num <= 6) return num as RuneSlot
  }

  return null
}

/**
 * Detect quality (Legend/Hero/Rare/Magic/Normal).
 * Searches in text AFTER the rune name and main stat area.
 * Also handles quality appearing between stats in noisy OCR.
 */
function parseQuality(text: string): { quality: RuneQuality; grade: number } | null {
  // Search the whole text with word boundaries
  for (const { pattern, quality, grade } of QUALITY_KEYWORDS) {
    if (pattern.test(text)) return { quality, grade }
  }

  // OCR sometimes truncates — look for "(Legend" as "(Legen" or just "TI" artifacts
  // Also check without word boundaries for edge cases like "(Legend"
  const legendLike = /legend/i
  if (legendLike.test(text)) return { quality: 'legend', grade: 6 }

  return null
}

/**
 * Detect rune grade from star characters or "N*" patterns.
 */
function parseGrade(text: string): number | null {
  const starChars = text.match(/[★⭐✦✧*]{2,}/g)
  if (starChars) {
    const longest = starChars.reduce((a, b) => (a.length > b.length ? a : b))
    if (longest.length >= 1 && longest.length <= 6) return longest.length
  }

  const numStarMatch = text.match(/(\d)\s*\*/)
  if (numStarMatch) {
    const num = Number(numStarMatch[1])
    if (num >= 1 && num <= 6) return num
  }

  return null
}

/**
 * Detect rune level from "+N" early in the text (before or near the set name).
 * Avoids confusing stat values (ATK +118) with the level.
 *
 * Also handles noisy OCR where the "+" is missing and the level digits are
 * glued to preceding garbage digits, e.g.:
 *   "412 Despair Rune" → 4 is noise, 12 is the level
 *   "115 Intricate Violent Rune" → 1 is noise, 15 is the level
 */
function parseLevel(text: string, setIndex: number): number | null {
  // Look for "+N" BEFORE the set name — this is the rune level
  if (setIndex > 0) {
    const beforeSet = text.substring(0, setIndex)
    const levelMatch = beforeSet.match(/\+\s*(\d{1,2})\b/)
    if (levelMatch) {
      const num = Number(levelMatch[1])
      if (num >= 0 && num <= 15) return num
    }
  }

  // Look for standalone "+N" (surrounded by spaces or at start)
  // But only values 0-15 that aren't part of a stat
  const standaloneMatches = [...text.matchAll(/(?:^|\s)\+(\d{1,2})(?:\s|$)/g)]
  for (const match of standaloneMatches) {
    const num = Number(match[1])
    // Check this isn't a stat value (stats are preceded by stat names)
    const idx = match.index!
    const before = text.substring(Math.max(0, idx - 15), idx).toLowerCase()
    const isAfterStat = /(?:atk|ak|def|hp|spd|sp|rate|rat|dmg|dag|resistance|ress?|accuracy|acturaty|accuraty|acu|axes|cri)\s*$/i.test(before)
    if (!isAfterStat && num >= 0 && num <= 15) return num
  }

  // "Level N"
  const labelMatch = text.match(/level\s*(\d{1,2})/i)
  if (labelMatch) {
    const num = Number(labelMatch[1])
    if (num >= 0 && num <= 15) return num
  }

  // Fallback: extract level from digits glued to noise BEFORE the set name.
  // OCR often produces "412 Despair Rune" where "4" is garbage and "12" is the level.
  // Strategy: find the last 1-2 digit number (0-15) at the END of a digit sequence
  // that appears before the set keyword.
  if (setIndex > 0) {
    const beforeSet = text.substring(0, setIndex)
    // Match a sequence of digits just before optional whitespace + word(s) before set
    const digitSeqMatch = beforeSet.match(/(\d{1,4})\s*\w*\s*$/)
    if (digitSeqMatch) {
      const digits = digitSeqMatch[1]!
      // Try to extract a valid level (0-15) from the END of the digit sequence
      // Try 2 digits first, then 1 digit
      if (digits.length >= 2) {
        const last2 = Number(digits.slice(-2))
        if (last2 >= 0 && last2 <= 15) return last2
      }
      if (digits.length >= 1) {
        const last1 = Number(digits.slice(-1))
        if (last1 >= 0 && last1 <= 15) return last1
      }
    }
  }

  return null
}

/**
 * Validate a substat value against known ranges for 6★ runes.
 * Returns true if the value is within a plausible range.
 */
function isValidSubstatValue(stat: RuneStat): boolean {
  const range = SUBSTAT_RANGES[stat.type]
  if (!range) return true // Unknown stat type, accept
  return stat.value >= range.min && stat.value <= range.max
}

/**
 * Recover orphan numbers from OCR lines that might be stat values.
 *
 * When we have fewer than expected substats, look for lines with standalone
 * numbers (e.g. "w) 112", "(5) 147") that might be HP flat or other stat values.
 * Also look for patterns like "+N" or "+N%" on lines without a recognized stat name.
 */
function recoverOrphanStats(
  lines: string[],
  existingTypes: Set<StatType>,
  currentStatCount: number,
  maxNeeded: number,
): RuneStat[] {
  if (currentStatCount >= maxNeeded) return []

  const orphans: RuneStat[] = []

  for (const line of lines) {
    if (currentStatCount + orphans.length >= maxNeeded) break

    // Skip lines that already have a recognized stat pattern
    const hasKnownStat = STAT_PATTERNS.some(([pattern]) => pattern.test(line))
    if (hasKnownStat) continue

    // Look for standalone +N or +N% patterns on lines without stat names
    const valueMatch = line.match(/[+\-]\s*(\d+)\s*(%?)/)
    if (!valueMatch) continue

    const value = parseInt(valueMatch[1]!, 10)
    const isPercent = valueMatch[2] === '%'

    if (value <= 0) continue

    // Try to guess what stat this could be based on value range
    const candidates: RuneStat[] = []

    if (isPercent) {
      // Percent stats: hp%, atk%, def%, res, acc (4-40 range)
      if (value >= 4 && value <= 40) {
        // Can't determine which percent stat — skip (too ambiguous)
        continue
      }
    } else {
      // Flat stats: check ranges
      if (value >= 100 && value <= 1875 && !existingTypes.has('hp')) {
        candidates.push({ type: 'hp', value })
      }
      if (value >= 8 && value <= 100 && !existingTypes.has('atk')) {
        candidates.push({ type: 'atk', value })
      }
      if (value >= 8 && value <= 100 && !existingTypes.has('def')) {
        candidates.push({ type: 'def', value })
      }
      if (value >= 1 && value <= 30 && !existingTypes.has('spd')) {
        candidates.push({ type: 'spd', value })
      }
    }

    // Only use if unambiguous (exactly one candidate)
    if (candidates.length === 1) {
      orphans.push(candidates[0]!)
      existingTypes.add(candidates[0]!.type)
    }
  }

  return orphans
}

/**
 * Determine main stat vs substats, and detect innate stat.
 *
 * Strategy:
 * - For slots 1, 3, 5: main stat is hardcoded (ATK flat, DEF flat, HP flat)
 * - For slots 2, 4, 6: main stat is the FIRST stat after the rune name
 * - Substats are validated against known ranges
 * - If more than 4 substats remain after main stat extraction and quality is
 *   legend (or inferred), the first substat is treated as innate stat.
 */
function separateMainAndSubs(
  allStats: (RuneStat & { _index: number })[],
  slot: RuneSlot | null,
  level: number | null,
  quality: RuneQuality | null,
): { mainStat: RuneStat | null; subStats: RuneStat[]; innateStat?: RuneStat } {
  if (allStats.length === 0 && !slot) return { mainStat: null, subStats: [] }

  // For slots 1, 3, 5: hardcode the main stat
  const fixedMain = slot ? FIXED_MAIN_STATS[slot] : undefined
  if (fixedMain) {
    // Find the closest matching value for the main stat, or use a default based on level
    let mainValue: number
    const matchingStatIdx = allStats.findIndex(
      s => s.type === fixedMain.type && fixedMain.values.includes(s.value),
    )

    if (matchingStatIdx >= 0) {
      mainValue = allStats[matchingStatIdx]!.value
    } else {
      // Estimate main stat value from level
      if (level !== null && level >= 13) {
        mainValue = fixedMain.values[1]! // +15 value
      } else {
        mainValue = fixedMain.values[0]! // +12 value
      }
    }

    const mainStat: RuneStat = { type: fixedMain.type, value: mainValue }

    // All found stats become substats, except the main stat type (flat only)
    let subStats = allStats
      .filter(s => {
        // Remove the matched main stat occurrence
        if (matchingStatIdx >= 0 && s._index === allStats[matchingStatIdx]!._index) return false
        // For slot 1 (ATK flat main), remove any ATK flat from substats (only ATK% is valid)
        if (fixedMain.type === 'atk' && s.type === 'atk') return false
        if (fixedMain.type === 'def' && s.type === 'def') return false
        if (fixedMain.type === 'hp' && s.type === 'hp') return false
        return true
      })
      .map(({ type, value }) => ({ type, value }))
      .filter(isValidSubstatValue)

    // Innate stat detection: if we have more than 4 substats and the rune
    // appears to be legend quality, the first stat is the innate (prefix) stat.
    let innateStat: RuneStat | undefined
    if (subStats.length > MAX_SUBSTATS && (quality === 'legend' || subStats.length >= 5)) {
      innateStat = subStats.shift()
    }
    subStats = subStats.slice(0, MAX_SUBSTATS)

    return { mainStat, subStats, innateStat }
  }

  // Slots 2, 4, 6 or unknown slot: first stat is main
  if (allStats.length === 0) return { mainStat: null, subStats: [] }

  const mainStat = { type: allStats[0]!.type, value: allStats[0]!.value }
  let subStats = allStats
    .slice(1)
    .map(({ type, value }) => ({ type, value }))
    .filter(isValidSubstatValue)

  // Innate stat detection for non-fixed slots
  let innateStat: RuneStat | undefined
  if (subStats.length > MAX_SUBSTATS && (quality === 'legend' || subStats.length >= 5)) {
    innateStat = subStats.shift()
  }
  subStats = subStats.slice(0, MAX_SUBSTATS)

  return { mainStat, subStats, innateStat }
}

/**
 * Determine expected substat count based on quality and level.
 *
 * SW rules:
 * - Legend: 4 substats from the start
 * - Hero: 3 at base, 4 at +12
 * - Rare: 2 at base, 3 at +6, 4 at +12
 * - Magic: 1 at base, 2 at +3, 3 at +6, 4 at +9/+12
 * - Normal: 0 at base, gains one every 3 levels
 *
 * For simplicity, if level >= 12, expect 4 substats for any quality.
 */
function getExpectedSubstatCount(quality: RuneQuality | null, level: number | null): number {
  const lvl = level ?? 0

  if (quality === 'legend') return 4
  if (quality === 'hero') return lvl >= 12 ? 4 : 3
  if (quality === 'rare') {
    if (lvl >= 12) return 4
    if (lvl >= 6) return 3
    return 2
  }
  if (quality === 'magic') {
    if (lvl >= 9) return 4
    if (lvl >= 6) return 3
    if (lvl >= 3) return 2
    return 1
  }

  // Unknown quality: use level to infer
  if (lvl >= 12) return 4
  if (lvl >= 9) return 3
  if (lvl >= 6) return 2
  return 0
}

/**
 * Summoners War rune parser implementation.
 *
 * Designed to handle noisy single-line OCR text with:
 * - Leading garbage (#1 412, a (#412, AEE», etc.)
 * - Missing spaces (HP+16%)
 * - UI button text (Temporarily, Tempo!)
 * - OCR artifacts (random numbers like 153, 6186)
 * - Truncated quality words (Leg, Heo, TI)
 * - Set bonus suffix (4 Set : Stun Rate +25%)
 * - Multiline stat splits (stat name and value on different lines)
 * - Fuzzy stat names (Acturaty, CRIRate, Axes, etc.)
 *
 * Tolerance: returns success if set + mainStat are found, even if slot/substats are partial.
 */
export const summonersWarParser: GameParser = {
  gameName: 'summoners-war',

  parse(ocrResult: OcrResult): ParsedResult {
    const errors: string[] = []
    const raw = ocrResult.text

    if (!raw || !raw.trim()) {
      return failedResult(['Empty OCR text'])
    }

    // Preserve lines for multiline stat detection
    const cleanLines = toCleanLines(raw)

    // Normalize: single line, clean noise characters
    const normalized = normalizeOcrText(raw)

    // Strip set bonus suffix ("4 Set : ..." or "2 Set : ...") to avoid false stat matches
    const setBonusIndex = normalized.search(/\d\s*set\s*:/i)
    const textWithoutSetBonus = setBonusIndex >= 0
      ? normalized.substring(0, setBonusIndex)
      : normalized

    // --- Parse set ---
    const setResult = stripLeadingGarbage(textWithoutSetBonus)
    const set = setResult?.setName ?? parseSet(textWithoutSetBonus)

    if (!set) {
      return failedResult(['Could not detect rune set'])
    }

    // Find set position for level parsing
    const setIndex = textWithoutSetBonus.toLowerCase().indexOf(set)

    // --- Parse slot ---
    const slot = parseSlot(textWithoutSetBonus)

    // --- Parse quality ---
    // Look for quality in the text after the rune name
    const runeNameEnd = textWithoutSetBonus.toLowerCase().indexOf('rune')
    const qualitySearchArea = runeNameEnd >= 0
      ? textWithoutSetBonus.substring(runeNameEnd)
      : textWithoutSetBonus
    const qualityInfo = parseQuality(qualitySearchArea)

    // --- Parse grade: try stars first, then quality keyword ---
    let grade = parseGrade(textWithoutSetBonus)
    if (!grade && qualityInfo) {
      grade = qualityInfo.grade
    }

    // --- Parse level ---
    const level = parseLevel(textWithoutSetBonus, setIndex >= 0 ? setIndex : 0)

    // --- Parse stats ---
    const allStats = extractAllStats(textWithoutSetBonus)

    // Also try multiline stat extraction
    const multilineStats = extractMultilineStats(cleanLines)

    // Merge multiline stats — add any that aren't already found (by type)
    const existingTypes = new Set(allStats.map(s => s.type))
    for (const mlStat of multilineStats) {
      if (!existingTypes.has(mlStat.type)) {
        allStats.push({ ...mlStat, _index: Infinity }) // Append at end
        existingTypes.add(mlStat.type)
      }
    }

    const { mainStat, subStats, innateStat } = separateMainAndSubs(
      allStats, slot, level, qualityInfo?.quality ?? null,
    )

    // --- Orphan number recovery ---
    // If we have fewer substats than expected, try to recover from orphan numbers
    const expectedCount = getExpectedSubstatCount(qualityInfo?.quality ?? null, level)
    if (subStats.length < expectedCount) {
      const recoveredTypes = new Set(subStats.map(s => s.type))
      if (innateStat) recoveredTypes.add(innateStat.type)
      if (mainStat) recoveredTypes.add(mainStat.type)

      // Strip set bonus from lines too
      const setBonusLineIdx = cleanLines.findIndex(l => /\d\s*set\s*:/i.test(l))
      const linesForRecovery = setBonusLineIdx >= 0
        ? cleanLines.slice(0, setBonusLineIdx)
        : cleanLines

      const orphans = recoverOrphanStats(
        linesForRecovery,
        recoveredTypes,
        subStats.length,
        expectedCount,
      )
      for (const orphan of orphans) {
        if (subStats.length < MAX_SUBSTATS) {
          subStats.push(orphan)
        }
      }
    }

    // --- Parse set piece count ---
    const setPieceCountMatch = normalized.match(/(\d)\s*set\s*:/i)
    const setPieceCount = setPieceCountMatch ? Number(setPieceCountMatch[1]) : null

    // --- Tolerant validation: need set + mainStat minimum ---
    if (!mainStat) {
      errors.push('Could not detect main stat')
      return failedResult(errors)
    }

    // --- Partial detection flag ---
    // Mark as partial if we have fewer substats than expected for the rune's quality/level
    const partial = subStats.length < expectedCount

    // Success — return what we found
    return successResult({
      set,
      slot: slot ?? 1, // default to 1 if not detected
      grade: grade ?? 6,
      level: level ?? 0,
      mainStat,
      subStats,
      ...(innateStat ? { innateStat } : {}),
      ...(qualityInfo ? { quality: qualityInfo.quality } : {}),
      ...(setPieceCount ? { setPieceCount } : {}),
      ...(partial ? { partial } : {}),
    })
  },
}
