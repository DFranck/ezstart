/**
 * Convert OKLCH to Hex color (and vice versa)
 * Uses culori for accurate color space conversions
 */

import { logger } from '@ezstart/logger'
import { formatHex, oklch, parseHex } from 'culori'
import { parseOklch, stringifyOklch } from './sanitize-color'

/**
 * Convert OKLCH string to Hex
 * Returns #000000 if conversion fails
 */
export function oklchToHex(oklchString: string): string {
  try {
    const parsed = parseOklch(oklchString)
    if (!parsed) {
      logger.error('[oklchToHex] Failed to parse:', oklchString)
      return '#000000'
    }

    const { l, c, h } = parsed

    // Use culori for accurate OKLCH → sRGB → Hex conversion
    const color = oklch({ mode: 'oklch', l, c, h })
    const hex = formatHex(color)

    return hex || '#000000'
  } catch (error) {
    logger.error('[oklchToHex] Error:', { error, input: oklchString })
    return '#000000'
  }
}

/**
 * Convert Hex string to OKLCH
 * Returns oklch(...) string if conversion succeeds
 */
export function hexToOklch(hexString: string): string {
  try {
    const color = parseHex(hexString)
    if (!color) {
      logger.error('[hexToOklch] Failed to parse:', hexString)
      return hexString
    }

    const oklchColor = oklch(color)
    if (!oklchColor) {
      logger.error('[hexToOklch] Failed to convert to OKLCH:', hexString)
      return hexString
    }

    const { l, c, h } = oklchColor
    return stringifyOklch(l || 0, c || 0, h || 0)
  } catch (error) {
    logger.error('[hexToOklch] Error:', { error, input: hexString })
    return hexString
  }
}

/**
 * Convert any color string (OKLCH or Hex) to Hex
 * Returns #000000 for non-color values (like 0.625rem)
 */
export function toHex(colorString: string): string {
  const trimmed = colorString.trim()

  // Already hex
  if (trimmed.startsWith('#')) {
    return trimmed
  }

  // OKLCH
  if (trimmed.startsWith('oklch(')) {
    const hex = oklchToHex(trimmed)
    return hex
  }

  // Non-color value (like 0.625rem, 1.5, etc.) - return fallback silently
  // Don't log warning for every non-color CSS variable
  return '#000000'
}

/**
 * Convert any color string to OKLCH
 */
export function toOklch(colorString: string): string {
  const trimmed = colorString.trim()

  // Already OKLCH
  if (trimmed.startsWith('oklch(')) {
    return trimmed
  }

  // Hex
  if (trimmed.startsWith('#')) {
    return hexToOklch(trimmed)
  }

  // Unknown format
  logger.warn(`[toOklch] Unknown format: ${trimmed}`)
  return 'oklch(0 0 0)'
}
