/**
 * Unit tests for the SSR theme resolver + inline-CSS renderer.
 *
 * The renderer emits a string that is later injected into a
 * `dangerouslySetInnerHTML` <style> element, so every branch of the
 * sanitization logic is covered here. Since the primary-only refactor
 * (2026-04-24), the renderer emits ONLY `--primary` under a bare `:root{}`
 * selector — the other legacy tokens (background, foreground, accent) are
 * intentionally dropped to avoid clashing with next-themes on ezauth.
 */

import { describe, it, expect } from 'vitest'
import { prettifySlug, renderThemeStyle, resolveSsrTheme } from '../theme-ssr'

function fakeHeaders(entries: Record<string, string>): { get(name: string): string | null } {
  return {
    get(name: string) {
      return entries[name] ?? null
    },
  }
}

describe('resolveSsrTheme', () => {
  it('falls back to "ezauth" when no header is present', () => {
    const { appName, appDisplayName, theme } = resolveSsrTheme(fakeHeaders({}))
    expect(appName).toBe('ezauth')
    expect(appDisplayName).toBeUndefined()
    expect(theme).toBeNull()
  })

  it('reads the app slug from x-app-theme', () => {
    const { appName } = resolveSsrTheme(fakeHeaders({ 'x-app-theme': 'ezpay' }))
    expect(appName).toBe('ezpay')
  })

  it('reads the display name from x-app-display-name', () => {
    const { appDisplayName } = resolveSsrTheme(
      fakeHeaders({ 'x-app-display-name': 'GreenPulse.AI' })
    )
    expect(appDisplayName).toBe('GreenPulse.AI')
  })

  it('trims whitespace from the display name', () => {
    const { appDisplayName } = resolveSsrTheme(
      fakeHeaders({ 'x-app-display-name': '  Acme Inc  ' })
    )
    expect(appDisplayName).toBe('Acme Inc')
  })

  it('rejects an empty display name', () => {
    const { appDisplayName } = resolveSsrTheme(fakeHeaders({ 'x-app-display-name': '   ' }))
    expect(appDisplayName).toBeUndefined()
  })

  it('rejects an oversized display name (>100 chars)', () => {
    const longName = 'A'.repeat(101)
    const { appDisplayName } = resolveSsrTheme(fakeHeaders({ 'x-app-display-name': longName }))
    expect(appDisplayName).toBeUndefined()
  })

  it('rejects a malformed slug and falls back to default', () => {
    const { appName } = resolveSsrTheme(fakeHeaders({ 'x-app-theme': 'ez<pay>' }))
    expect(appName).toBe('ezauth')
  })

  it('parses theme tokens from x-app-theme-tokens', () => {
    const headers = fakeHeaders({
      'x-app-theme': 'ezpay',
      'x-app-theme-tokens': JSON.stringify({ primary: '#00D9F7', background: '#000' }),
    })
    const { theme } = resolveSsrTheme(headers)
    // Legacy tokens remain in the parsed object for future tooling, but
    // `renderThemeStyle` will ignore them.
    expect(theme).toEqual({ primary: '#00D9F7', background: '#000' })
  })

  it('drops unsafe CSS values from the parsed tokens', () => {
    const headers = fakeHeaders({
      'x-app-theme': 'ezpay',
      'x-app-theme-tokens': JSON.stringify({
        primary: '#00D9F7',
        background: 'red;}</style>',
      }),
    })
    const { theme } = resolveSsrTheme(headers)
    expect(theme).toEqual({ primary: '#00D9F7' })
  })

  it('returns null theme when JSON is malformed', () => {
    const { theme } = resolveSsrTheme(fakeHeaders({ 'x-app-theme-tokens': '{not-json' }))
    expect(theme).toBeNull()
  })
})

describe('renderThemeStyle', () => {
  it('returns empty string for nullish theme', () => {
    expect(renderThemeStyle('ezpay', null)).toBe('')
  })

  it('emits --primary under selectors matching ezauth.css specificity (light + dark)', () => {
    const css = renderThemeStyle('ezpay', { primary: '#00D9F7' })
    expect(css).toBe(
      ":root[data-app='ezauth']{--primary:#00D9F7;}:root[data-app='ezauth'].dark{--primary:#00D9F7;}"
    )
  })

  it('scopes the override to the ezauth-pinned data-app root', () => {
    const css = renderThemeStyle('ezpay', { primary: '#00D9F7' })
    expect(css).toContain("[data-app='ezauth']")
  })

  it('emits a .dark override so the tenant primary also wins in dark mode', () => {
    const css = renderThemeStyle('ezpay', { primary: '#00D9F7' })
    expect(css).toContain('.dark{--primary:#00D9F7;}')
  })

  it('does NOT emit legacy background/foreground/accent tokens even when present', () => {
    const css = renderThemeStyle('ezpay', {
      primary: '#00D9F7',
      background: '#fff',
      foreground: '#000',
      accent: '#f0f',
    })
    expect(css).toBe(
      ":root[data-app='ezauth']{--primary:#00D9F7;}:root[data-app='ezauth'].dark{--primary:#00D9F7;}"
    )
    expect(css).not.toContain('--background')
    expect(css).not.toContain('--foreground')
    expect(css).not.toContain('--accent')
  })

  it('omits the logo field', () => {
    const css = renderThemeStyle('ezpay', { logo: 'https://cdn/logo.svg' })
    expect(css).toBe('')
  })

  it('returns empty when theme has no primary', () => {
    // Only background/foreground/accent — nothing renders.
    const css = renderThemeStyle('ezpay', { background: '#fff', foreground: '#000' })
    expect(css).toBe('')
  })

  it('rejects malformed slug (no CSS emitted)', () => {
    const css = renderThemeStyle('bad"slug', { primary: '#fff' })
    expect(css).toBe('')
  })
})

describe('prettifySlug', () => {
  it('capitalises each hyphen-delimited part', () => {
    expect(prettifySlug('green-pulse')).toBe('Green Pulse')
  })

  it('handles single-word slugs', () => {
    expect(prettifySlug('ezpay')).toBe('Ezpay')
  })

  it('returns empty string for empty input', () => {
    expect(prettifySlug('')).toBe('')
  })

  it('skips empty segments from leading/trailing hyphens', () => {
    expect(prettifySlug('-green-pulse-')).toBe('Green Pulse')
  })
})
