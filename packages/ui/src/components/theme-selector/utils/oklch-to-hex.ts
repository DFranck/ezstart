/**
 * Convert OKLCH to Hex color
 * Uses culori for accurate color space conversions
 */

import { formatHex, oklch } from 'culori'
import { parseOklch } from './sanitize-color'

/**
 * Convert OKLCH string to Hex
 * Returns #000000 if conversion fails
 */
export function oklchToHex(oklchString: string): string {
  try {
    const parsed = parseOklch(oklchString)
    if (!parsed) {
      console.error('[oklchToHex] Failed to parse:', oklchString)
      return '#000000'
    }

    const { l, c, h } = parsed

    // Use culori for accurate OKLCH → sRGB → Hex conversion
    const color = oklch({ mode: 'oklch', l, c, h })
    const hex = formatHex(color)

    return hex || '#000000'
  } catch (error) {
    console.error('[oklchToHex] Error:', error, 'for input:', oklchString)
    return '#000000'
  }
}

/**
 * Convert any color string (OKLCH or Hex) to Hex
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

  // Unknown format
  console.warn(`[toHex] Unknown format: ${trimmed}`)
  return '#000000'
}
