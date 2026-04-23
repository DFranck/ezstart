/**
 * SSR helpers for the white-label theme.
 *
 * The middleware populates two request headers when a publishable key
 * resolves to an Application with `themeEnabled=true`:
 * - `x-app-theme`         — the owning app slug (e.g. `'ezpay'`)
 * - `x-app-theme-tokens`  — JSON-encoded `KeyConfigTheme` (primary, etc.)
 *
 * This module reads them from the `headers()` API exposed by `next/headers`
 * and emits the inline CSS string we inject into a `<style>` block in the
 * root layout. The CSS selector uses the resolved app slug so the tokens
 * only apply when a matching `<html data-app="<slug>">` renders.
 */

import type { KeyConfigTheme } from './key-config-cache'

const SAFE_KEY_RE = /^[a-z0-9-]{1,32}$/i
const MAX_VALUE_LEN = 64

function isSafeCssValue(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > MAX_VALUE_LEN) return false
  // Reject any character that could break out of the CSS declaration.
  if (/[<>{};]/.test(value)) return false
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

/**
 * Resolve the SSR app slug + theme tokens from the middleware headers.
 *
 * The slug is sanitized against `SAFE_KEY_RE` so it is safe to interpolate
 * directly into the CSS selector (no escaping ambiguity).
 */
export function resolveSsrTheme(h: { get(name: string): string | null }): {
  appName: string
  theme: KeyConfigTheme | null
} {
  const rawSlug = h.get('x-app-theme') || ''
  const appName = SAFE_KEY_RE.test(rawSlug) ? rawSlug : 'ezauth'
  const theme = parseThemeHeader(h.get('x-app-theme-tokens'))
  return { appName, theme }
}

/**
 * Build the inline CSS string to inject into a `<style>` block. Returns an
 * empty string when no theme tokens are set — callers can use that to
 * skip rendering the `<style>` element entirely.
 *
 * The selector targets both `:root[data-app="<slug>"]` AND the
 * `:root[data-app="<slug>"] .dark` combo so the tokens apply uniformly
 * regardless of the user's light/dark preference. If the brand wants
 * different tokens per color scheme, future work can split the output.
 */
export function renderThemeStyle(appName: string, theme: KeyConfigTheme | null): string {
  if (!theme) return ''
  if (!SAFE_KEY_RE.test(appName)) return ''
  const decls: string[] = []
  if (theme.primary) decls.push(`--primary:${theme.primary};`)
  if (theme.background) decls.push(`--background:${theme.background};`)
  if (theme.foreground) decls.push(`--foreground:${theme.foreground};`)
  if (theme.accent) decls.push(`--accent:${theme.accent};`)
  if (decls.length === 0) return ''
  const body = decls.join('')
  return `:root[data-app="${appName}"]{${body}}:root[data-app="${appName}"] .dark{${body}}`
}
