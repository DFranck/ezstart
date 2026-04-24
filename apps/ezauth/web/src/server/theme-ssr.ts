/**
 * SSR helpers for the white-label theme.
 *
 * The middleware populates three request headers when a publishable key
 * resolves to an Application:
 * - `x-app-theme`         — the owning app slug (e.g. `'ezpay'`) — retained
 *                           for debug/diagnostic purposes, NOT used to scope
 *                           the CSS override anymore.
 * - `x-app-theme-tokens`  — JSON-encoded `KeyConfigTheme` (only `primary`
 *                           is actively rendered; other tokens are ignored).
 * - `x-app-display-name`  — human-readable Application name
 *                           (`Application.name`, e.g. `'GreenPulse.AI'`).
 *
 * This module reads them from the `headers()` API exposed by `next/headers`
 * and emits the inline CSS string we inject into a `<style>` block in the
 * root layout.
 *
 * **Primary-only policy (2026-04-24):** we no longer override `background`,
 * `foreground`, or `accent` per tenant. Light/dark mode is handled by
 * next-themes on ezauth, so forcing those tokens would clash with the
 * user's preference. The selector is `:root` (unscoped) — it applies on
 * every auth page render regardless of `data-app` value, which is now
 * fixed to `"ezauth"` to keep ezauth's own theme as the baseline.
 */

import type { KeyConfigTheme } from './key-config-cache'

const SAFE_KEY_RE = /^[a-z0-9-]{1,32}$/i
const MAX_VALUE_LEN = 64
const MAX_DISPLAY_NAME_LEN = 100
// Reject any character that could break out of the CSS declaration OR the
// surrounding `<style>` block.
const UNSAFE_CSS_CHAR_RE = /[<>{};]/

function isSafeCssValue(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > MAX_VALUE_LEN) return false
  if (UNSAFE_CSS_CHAR_RE.test(value)) return false
  return true
}

function parseThemeHeader(value: string | null | undefined): KeyConfigTheme | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const p = parsed as Record<string, unknown>
    const out: KeyConfigTheme = {}
    if (isSafeCssValue(p.primary)) out.primary = p.primary
    // Legacy fields — kept in the parsed object so any future tooling that
    // consumes the raw theme can still read them, but `renderThemeStyle`
    // below intentionally ignores them.
    if (isSafeCssValue(p.background)) out.background = p.background
    if (isSafeCssValue(p.foreground)) out.foreground = p.foreground
    if (isSafeCssValue(p.accent)) out.accent = p.accent
    // logo is a URL — cheap validation, not emitted to CSS anyway
    if (typeof p.logo === 'string' && p.logo.length <= 2048) out.logo = p.logo
    return out
  } catch {
    return null
  }
}

function sanitizeDisplayName(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_DISPLAY_NAME_LEN) return undefined
  return trimmed
}

/**
 * Prettify a slug into a display name when the DB has no `Application.name`.
 * `'green-pulse'` → `'Green Pulse'`, `'ezauth'` → `'Ezauth'`. Not perfect
 * (no casing of common acronyms like `EZAuth`), but good enough as a
 * last-resort fallback — tenants owning a real Application should set
 * `name` so this never runs in production.
 *
 * @example
 *   prettifySlug('green-pulse') // 'Green Pulse'
 *   prettifySlug('ezpay')       // 'Ezpay'
 */
export function prettifySlug(slug: string): string {
  if (!slug) return ''
  return slug
    .split('-')
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Resolve the SSR app slug, display name, and theme tokens from the
 * middleware headers.
 *
 * - `appName`          — slug sanitized against `SAFE_KEY_RE` (fallback:
 *   `'ezauth'`)
 * - `appDisplayName`   — `Application.name` from the DB when provided,
 *   otherwise `undefined` (callers fall back to `prettifySlug(appName)`)
 * - `theme`            — parsed tokens; callers should use the `primary`
 *   field only
 */
export function resolveSsrTheme(h: { get(name: string): string | null }): {
  appName: string
  appDisplayName: string | undefined
  theme: KeyConfigTheme | null
} {
  const rawSlug = h.get('x-app-theme') || ''
  const appName = SAFE_KEY_RE.test(rawSlug) ? rawSlug : 'ezauth'
  const appDisplayName = sanitizeDisplayName(h.get('x-app-display-name'))
  const theme = parseThemeHeader(h.get('x-app-theme-tokens'))
  return { appName, appDisplayName, theme }
}

/**
 * Build the inline CSS string to inject into a `<style>` block. Returns an
 * empty string when no usable theme tokens are set — callers can use that
 * to skip rendering the `<style>` element entirely.
 *
 * **Only `--primary` is emitted.** The selector is the bare `:root`,
 * unscoped by `data-app`, because:
 *
 * 1. The ezauth layout now fixes `data-app="ezauth"` so ezauth's own theme
 *    (including `--primary-foreground` in both light and dark mode) always
 *    applies as the baseline.
 * 2. Consumer-specific CSS overrides in
 *    `packages/ui/src/styles/themes/<slug>/<slug>.css` are NOT reached from
 *    the ezauth auth pages anymore, so the DB theme is the single source
 *    of truth for `--primary` on those pages.
 * 3. Light/dark mode is driven by `next-themes` on ezauth. Overriding
 *    `--background`, `--foreground`, or `--accent` per tenant would clash
 *    with the user's chosen scheme (white-on-white in dark mode, etc.) —
 *    so those fields are intentionally dropped even when present.
 *
 * The `appName` param is retained for signature compatibility and logging
 * but is NOT interpolated into the selector anymore.
 */
export function renderThemeStyle(appName: string, theme: KeyConfigTheme | null): string {
  if (!theme) return ''
  // Slug validation kept as a defence-in-depth check for the whole SSR
  // code path — a malformed slug indicates upstream tampering.
  if (!SAFE_KEY_RE.test(appName)) return ''
  if (!theme.primary) return ''
  return `:root{--primary:${theme.primary};}`
}
