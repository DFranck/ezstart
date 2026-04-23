/**
 * Theme token validation helpers.
 *
 * Accepts:
 * - Hex colors: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`
 * - OKLCH: `oklch(L C H)` or `oklch(L C H / A)` (tolerates percent L, numeric deg H)
 * - HSL/HSLA: `hsl(H S% L%)` and alpha variants
 * - RGB/RGBA: `rgb(r g b)` and alpha variants
 * - CSS named colors: a curated safelist (`transparent`, `currentColor`, `inherit`)
 *
 * Reject anything else — in particular, disallow sequences starting with `<`,
 * `;`, `{`, `}` or containing `</style>` to avoid CSS-injection risks when
 * the token is later serialized into an inline `<style>` block.
 */

import { z } from 'zod'

const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const OKLCH_RE = /^oklch\([\d.\s%,/-]+\)$/i
const HSL_RE = /^hsla?\([\d.\s%,/-]+\)$/i
const RGB_RE = /^rgba?\([\d.\s%,/-]+\)$/i
const NAMED_SAFE = new Set(['transparent', 'currentcolor', 'inherit', 'initial', 'unset'])

/**
 * Returns true when `value` is a syntactically valid CSS color that is safe
 * to inject into an inline `<style>` block (no `<`, no `{`/`}`, no `;`).
 */
export function isSafeCssColor(value: string): boolean {
  if (value.length === 0 || value.length > 64) return false
  if (/[<>{};]/.test(value)) return false
  const v = value.trim()
  if (HEX_RE.test(v)) return true
  if (OKLCH_RE.test(v)) return true
  if (HSL_RE.test(v)) return true
  if (RGB_RE.test(v)) return true
  if (NAMED_SAFE.has(v.toLowerCase())) return true
  return false
}

/**
 * Returns true when `value` is an `https:`/`http:` URL under 2048 chars. No
 * data/javascript/file schemes allowed — this value may be rendered as
 * `<img src="...">` in the future.
 */
export function isSafeLogoUrl(value: string): boolean {
  if (value.length === 0 || value.length > 2048) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

const colorToken = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isSafeCssColor, { message: 'Invalid CSS color (use hex, oklch(), hsl(), or rgb())' })

const logoUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(isSafeLogoUrl, { message: 'Invalid logo URL (must be http/https)' })

/**
 * Zod schema for `ApplicationTheme`. All fields are optional — the client
 * sends only the tokens it wants to override. Omitted tokens inherit the
 * default theme.
 */
export const applicationThemeSchema = z
  .object({
    primary: colorToken.optional(),
    background: colorToken.optional(),
    foreground: colorToken.optional(),
    accent: colorToken.optional(),
    logo: logoUrl.optional(),
  })
  .strict()

export type ApplicationThemeInput = z.infer<typeof applicationThemeSchema>

/**
 * Serialize a theme object into inline CSS variable declarations for
 * injection into a `<style>` block. Only known-safe keys are emitted.
 *
 * @example
 *   serializeThemeToCssVars({ primary: '#00D9F7' })
 *   // '--primary:#00D9F7;'
 */
export function serializeThemeToCssVars(theme: ApplicationThemeInput | null | undefined): string {
  if (!theme) return ''
  const parts: string[] = []
  if (theme.primary && isSafeCssColor(theme.primary)) parts.push(`--primary:${theme.primary};`)
  if (theme.background && isSafeCssColor(theme.background))
    parts.push(`--background:${theme.background};`)
  if (theme.foreground && isSafeCssColor(theme.foreground))
    parts.push(`--foreground:${theme.foreground};`)
  if (theme.accent && isSafeCssColor(theme.accent)) parts.push(`--accent:${theme.accent};`)
  return parts.join('')
}
