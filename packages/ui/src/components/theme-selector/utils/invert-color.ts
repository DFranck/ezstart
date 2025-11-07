import { formatHex, formatRgb, oklch, parseHex } from 'culori'
import { parseOklch, stringifyOklch } from './sanitize-color'

/**
 * Invert OKLCH color for opposite theme (light ↔ dark)
 * - Inverts lightness (L): 1 - L
 * - Keeps chroma (C) and hue (H) the same for color harmony
 */
export function invertOklchColor(oklchString: string): string {
  const parsed = parseOklch(oklchString)
  if (!parsed) return oklchString

  const { l, c, h, a } = parsed

  // Invert lightness: 0 → 1, 1 → 0, 0.5 → 0.5
  const invertedL = 1 - l

  return stringifyOklch(invertedL, c, h, a)
}

/**
 * Invert HEX color by converting to OKLCH first
 */
export function invertHexColor(hexString: string): string {
  try {
    // Parse hex to color object
    const color = parseHex(hexString)
    if (!color) return hexString

    // Convert to OKLCH
    const oklchColor = oklch(color)
    if (!oklchColor) return hexString

    // Invert lightness
    const invertedL = 1 - (oklchColor.l || 0)
    const inverted = { ...oklchColor, l: invertedL }

    // Convert back to hex
    const invertedHex = formatHex(inverted)
    return invertedHex || hexString
  } catch {
    return hexString
  }
}

/**
 * Auto-generate opposite theme color
 * Supports both OKLCH and HEX formats
 */
export function invertColor(colorString: string): string {
  const trimmed = colorString.trim()

  // OKLCH format
  if (trimmed.startsWith('oklch(')) {
    return invertOklchColor(trimmed)
  }

  // HEX format
  if (trimmed.startsWith('#')) {
    return invertHexColor(trimmed)
  }

  // Unknown format - return as-is
  return trimmed
}
