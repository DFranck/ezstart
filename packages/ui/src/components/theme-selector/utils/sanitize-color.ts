import { logger } from '@ezstart/logger'
import { oklchColorSchema, hexColorSchema } from '../schemas/theme.schema'

/**
 * Sanitize color value to prevent CSS injection
 * Returns the sanitized value or throws an error
 */
export function sanitizeColorValue(value: string): string {
  const trimmed = value.trim()

  // Try OKLCH format first
  const oklchResult = oklchColorSchema.safeParse(trimmed)
  if (oklchResult.success) {
    return oklchResult.data
  }

  // Try hex format
  const hexResult = hexColorSchema.safeParse(trimmed)
  if (hexResult.success) {
    return hexResult.data
  }

  // If neither format matches, throw error
  throw new Error(
    `Invalid color format: "${value}". Expected OKLCH (e.g., "oklch(0.5 0.2 250)") or hex (e.g., "#ff0000")`
  )
}

/**
 * Validate multiple color values
 */
export function sanitizeColorValues(values: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(values)) {
    try {
      sanitized[key] = sanitizeColorValue(value)
    } catch (error) {
      logger.warn(`Skipping invalid color for ${key}:`, error)
      // Skip invalid values instead of throwing
    }
  }

  return sanitized
}

/**
 * Check if a value is a valid OKLCH color
 */
export function isOklchColor(value: string): boolean {
  return oklchColorSchema.safeParse(value).success
}

/**
 * Check if a value is a valid hex color
 */
export function isHexColor(value: string): boolean {
  return hexColorSchema.safeParse(value).success
}

/**
 * Extract OKLCH components from string
 * Returns { l, c, h, a } or null if invalid
 * Supports both decimal (0.62) and percentage (62%) formats for lightness
 */
export function parseOklch(value: string): { l: number; c: number; h: number; a?: number } | null {
  // Match OKLCH with optional % on lightness: oklch(62.104% 0.134 244.743) or oklch(0.62104 0.134 244.743)
  const match = value.match(/oklch\(([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/)

  if (!match || !match[1] || !match[2] || !match[3]) return null

  let l = Number.parseFloat(match[1])
  const c = Number.parseFloat(match[2])
  const h = Number.parseFloat(match[3])
  const a = match[4] ? Number.parseFloat(match[4]) : undefined

  // If lightness is > 1, assume it's a percentage (e.g., 62.104% → 0.62104)
  if (l > 1) {
    l = l / 100
  }

  return { l, c, h, a }
}

/**
 * Convert OKLCH components to string
 */
export function stringifyOklch(l: number, c: number, h: number, a?: number): string {
  const alpha = a !== undefined ? ` / ${a}` : ''
  return `oklch(${l} ${c} ${h}${alpha})`
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result || !result[1] || !result[2] || !result[3]) return null

  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  }
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
