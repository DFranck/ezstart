/**
 * Base Parser Utilities
 *
 * Shared helpers for game-specific OCR parsers
 */

import type { GameParser, OcrResult, ParsedResult } from '../types.js'

export type { GameParser }

// --- Helper functions ---

/**
 * Clean OCR text: trim, collapse whitespace, remove common artifacts
 */
export function cleanText(text: string): string {
  return text
    .replace(/[|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract all numbers from a string
 */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/-?\d+(?:[.,]\d+)?/g)
  if (!matches) return []
  return matches.map((m) => Number(m.replace(',', '.')))
}

/**
 * Match a regex pattern and return the first capture group (or full match)
 */
export function matchPattern(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern)
  return match ? (match[1] ?? match[0]) : null
}

/**
 * Create a failed ParsedResult with error messages
 */
export function failedResult(errors: string[]): ParsedResult {
  return { success: false, data: {}, errors }
}

/**
 * Create a successful ParsedResult
 */
export function successResult(data: Record<string, unknown>): ParsedResult {
  return { success: true, data }
}
