/**
 * Summoners War Artifact Parser
 *
 * Parses OCR text from Summoners War artifact screenshots into structured data.
 * Artifacts differ from runes: they have a category (Type/Attribute), a main stat
 * (always flat ATK/DEF/HP), and skill-based substats (full phrases like
 * "CRIT DMG on single-target +4%").
 *
 * Design principle: TOLERANT to noise — better to extract partially than nothing.
 */

import type { OcrResult, ParsedResult } from '../types.js'
import { failedResult, successResult, type GameParser } from './base-parser.js'

// --- Types ---

type ArtifactCategory = 'type' | 'attribute'

type ArtifactType = 'attack' | 'defense' | 'hp' | 'support'

type ArtifactAttribute = 'fire' | 'water' | 'wind' | 'light' | 'dark'

type ArtifactQuality = 'legend' | 'hero' | 'rare' | 'magic' | 'normal'

type ArtifactMainStatType = 'atk' | 'def' | 'hp'

interface ArtifactMainStat {
  type: ArtifactMainStatType
  value: number
}

interface ArtifactSubStat {
  effect: string
  value: number
}

const MAX_SUBSTATS = 4

// --- Detection patterns ---

/** Category + type/attribute detection from header line */
const CATEGORY_PATTERNS: { pattern: RegExp; category: ArtifactCategory; value: string }[] = [
  // Type artifacts
  { pattern: /\battack\s*artifact\b/i, category: 'type', value: 'attack' },
  { pattern: /\bdefense\s*artifact\b/i, category: 'type', value: 'defense' },
  { pattern: /\bhp\s*artifact\b/i, category: 'type', value: 'hp' },
  { pattern: /\bsupport\s*artifact\b/i, category: 'type', value: 'support' },
  // Attribute artifacts
  { pattern: /\bfire\s*artifact\b/i, category: 'attribute', value: 'fire' },
  { pattern: /\bwater\s*artifact\b/i, category: 'attribute', value: 'water' },
  { pattern: /\bwind\s*artifact\b/i, category: 'attribute', value: 'wind' },
  { pattern: /\blight\s*artifact\b/i, category: 'attribute', value: 'light' },
  { pattern: /\bdark\s*artifact\b/i, category: 'attribute', value: 'dark' },
]

/** Quality keywords with OCR misread tolerance */
const QUALITY_KEYWORDS: { pattern: RegExp; quality: ArtifactQuality }[] = [
  { pattern: /\blegend(?:ary)?\b/i, quality: 'legend' },
  { pattern: /\bleger\b/i, quality: 'legend' },
  { pattern: /\bleg\b/i, quality: 'legend' },
  { pattern: /\bhero(?:ic)?\b/i, quality: 'hero' },
  { pattern: /\bheo\b/i, quality: 'hero' },
  { pattern: /\brare\b/i, quality: 'rare' },
  { pattern: /\bmagic\b/i, quality: 'magic' },
  { pattern: /\bnormal\b/i, quality: 'normal' },
]

/** Main stat detection — artifacts always have flat ATK, DEF, or HP */
const MAIN_STAT_PATTERNS: { pattern: RegExp; type: ArtifactMainStatType }[] = [
  { pattern: /\batk\s*\+\s*(\d+)\b/i, type: 'atk' },
  { pattern: /\battack\s*\+\s*(\d+)\b/i, type: 'atk' },
  { pattern: /\bdef\s*\+\s*(\d+)\b/i, type: 'def' },
  { pattern: /\bdefense\s*\+\s*(\d+)\b/i, type: 'def' },
  { pattern: /\bhp\s*\+\s*(\d+)\b/i, type: 'hp' },
]

/**
 * Known artifact substat effect patterns.
 * These are full-phrase effects unique to artifacts (vs rune flat/% stats).
 * Each captures the effect description and a trailing +N%.
 */
const SUBSTAT_EFFECT_PATTERNS: RegExp[] = [
  // Damage-related
  /(?:additional\s+dmg\s+by\s+(?:atk|def|hp|spd))\s*\+\s*(\d+)%/i,
  /(?:crit\s*dmg\s+(?:on\s+)?(?:single[- ]?target|aoe|multi[- ]?hit))\s*\+\s*(\d+)%/i,
  /(?:dmg\s+(?:dealt\s+)?(?:on\s+)?(?:fire|water|wind|light|dark))\s*\+\s*(\d+)%/i,
  /(?:dmg\s+(?:dealt\s+)?(?:by|with)\s+\w+)\s*\+\s*(\d+)%/i,
  /(?:damage\s+received\s+(?:from|on)\s+\w+)\s*\+\s*(\d+)%/i,

  // Recovery / sustain
  /(?:life\s*drain)\s*\+\s*(\d+)%/i,
  /(?:recovery)\s*\+\s*(\d+)%/i,
  /(?:hp\s+when\s+revived)\s*\+\s*(\d+)%/i,
  /(?:heal\s+amount|healing)\s*\+\s*(\d+)%/i,
  /(?:ally\s+hp\s+recovery)\s*\+\s*(\d+)%/i,

  // Accuracy / resistance
  /(?:acc(?:uracy)?\s+(?:boost|increase))\s*\+\s*(\d+)%/i,
  /(?:res(?:istance)?\s+(?:boost|increase))\s*\+\s*(\d+)%/i,

  // Shield / protection
  /(?:shield\s+(?:amount|efficiency))\s*\+\s*(\d+)%/i,
  /(?:damage\s+reduction\s+from\s+\w+)\s*\+\s*(\d+)%/i,

  // Speed / ATB
  /(?:spd\s+(?:boost|increase)\s+\w*)\s*\+\s*(\d+)%/i,
  /(?:atb\s+(?:boost|increase))\s*\+\s*(\d+)%/i,

  // Counter / revenge
  /(?:counter\s+(?:dmg|damage))\s*\+\s*(\d+)%/i,
  /(?:bomb\s+dmg)\s*\+\s*(\d+)%/i,
  /(?:reflect\s+dmg)\s*\+\s*(\d+)%/i,

  // Skill-specific
  /(?:(?:s|skill)\s*[1-4]\s+(?:crit\s*(?:rate|dmg)|acc(?:uracy)?|cd)\s*(?:increase)?)\s*\+\s*(\d+)%/i,
]

/**
 * Normalize OCR text: collapse noise characters, preserve line structure
 */
function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r?\n/g, ' ')
    .replace(/[|»©€×]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Preserve line structure for substat detection.
 * Returns cleaned lines (trim, remove noise chars, keep line separation).
 */
function toCleanLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(line => line
      .replace(/[|»©€×]/g, '')
      .trim()
    )
    .filter(line => line.length > 0)
}

/**
 * Detect artifact category and type/attribute from text
 */
function parseCategory(text: string): { category: ArtifactCategory; artifactType?: ArtifactType; artifactAttribute?: ArtifactAttribute } | null {
  for (const { pattern, category, value } of CATEGORY_PATTERNS) {
    if (pattern.test(text)) {
      if (category === 'type') {
        return { category, artifactType: value as ArtifactType }
      }
      return { category, artifactAttribute: value as ArtifactAttribute }
    }
  }
  return null
}

/**
 * Extract quality from text
 */
function parseQuality(text: string): ArtifactQuality | null {
  for (const { pattern, quality } of QUALITY_KEYWORDS) {
    if (pattern.test(text)) return quality
  }
  return null
}

/**
 * Extract level (+0 to +15) from a standalone line like "+12"
 */
function parseLevel(line: string): number | null {
  // Only match lines that are JUST a +N value (the level indicator)
  const match = line.trim().match(/^\+(\d{1,2})$/)
  if (match) {
    const level = parseInt(match[1]!, 10)
    if (level >= 0 && level <= 15) return level
  }
  return null
}

/**
 * Extract main stat (flat ATK/DEF/HP + value)
 */
function parseMainStat(text: string): ArtifactMainStat | null {
  for (const { pattern, type } of MAIN_STAT_PATTERNS) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return { type, value: parseInt(match[1], 10) }
    }
  }
  return null
}

/**
 * Extract substats from individual lines.
 * Artifact substats are full phrases ending with +N%.
 * Falls back to a generic "any text +N%" pattern for unknown effects.
 */
function parseSubStats(lines: string[]): ArtifactSubStat[] {
  const subStats: ArtifactSubStat[] = []

  for (const line of lines) {
    if (subStats.length >= MAX_SUBSTATS) break

    // Skip lines that look like headers, quality, or main stat
    if (/artifact/i.test(line)) continue
    if (/^\+\d{1,2}$/.test(line.trim())) continue
    if (QUALITY_KEYWORDS.some(q => q.pattern.test(line) && line.trim().split(/\s+/).length <= 2)) continue

    // Try known patterns first
    let matched = false
    for (const pattern of SUBSTAT_EFFECT_PATTERNS) {
      const match = line.match(pattern)
      if (match && match[1]) {
        const value = parseInt(match[1], 10)
        const effect = line.replace(/\s*\+\s*\d+%\s*$/, '').trim()
        subStats.push({ effect, value })
        matched = true
        break
      }
    }

    // Fallback: generic "description +N%" pattern for substats we don't know yet
    if (!matched) {
      const genericMatch = line.match(/^(.+?)\s*\+\s*(\d+)%\s*$/)
      if (genericMatch && genericMatch[1] && genericMatch[2]) {
        const effect = genericMatch[1].trim()
        const value = parseInt(genericMatch[2], 10)
        // Filter out main stat lines (flat values without %) and noise
        if (effect.length > 2 && value > 0 && value <= 20) {
          subStats.push({ effect, value })
        }
      }
    }
  }

  return subStats
}

/**
 * Check if OCR text looks like an artifact (not a rune)
 */
function isArtifact(text: string): boolean {
  return /artifact/i.test(text)
}

// --- Parser export ---

export const summonersWarArtifactParser: GameParser = {
  gameName: 'summoners-war-artifact',

  parse(ocrResult: OcrResult): ParsedResult {
    const normalized = normalizeOcrText(ocrResult.text)
    const lines = toCleanLines(ocrResult.text)

    // Must be an artifact
    if (!isArtifact(normalized)) {
      return failedResult(['Not an artifact: "Artifact" keyword not found'])
    }

    const errors: string[] = []

    // Parse category (type vs attribute)
    const categoryInfo = parseCategory(normalized)
    if (!categoryInfo) {
      errors.push('Could not detect artifact category (Type/Attribute)')
    }

    // Parse quality
    const quality = parseQuality(normalized)

    // Parse level from lines (look for standalone +N)
    let level: number | null = null
    for (const line of lines) {
      const l = parseLevel(line)
      if (l !== null) {
        level = l
        break
      }
    }

    // Parse main stat
    const mainStat = parseMainStat(normalized)
    if (!mainStat) {
      errors.push('Could not detect main stat')
    }

    // Parse substats from lines
    const subStats = parseSubStats(lines)

    // Need at least category + main stat to consider it a success
    if (!categoryInfo && !mainStat) {
      return failedResult(['Could not parse artifact: missing category and main stat', ...errors])
    }

    return successResult({
      category: categoryInfo?.category ?? null,
      artifactType: categoryInfo?.artifactType ?? null,
      artifactAttribute: categoryInfo?.artifactAttribute ?? null,
      quality: quality ?? null,
      level: level ?? null,
      mainStat: mainStat ?? null,
      subStats,
    })
  },
}
