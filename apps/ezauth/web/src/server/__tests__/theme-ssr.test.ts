/**
 * Unit tests for the SSR theme resolver + inline-CSS renderer.
 *
 * The renderer emits a string that is later injected into a
 * `dangerouslySetInnerHTML` <style> element, so every branch of the
 * sanitization logic is covered here.
 */

import { describe, it, expect } from 'vitest'
import { renderThemeStyle, resolveSsrTheme } from '../theme-ssr'

function fakeHeaders(entries: Record<string, string>): { get(name: string): string | null } {
  return {
    get(name: string) {
      return entries[name] ?? null
    },
  }
}

describe('resolveSsrTheme', () => {
  it('falls back to "ezauth" when no header is present', () => {
    const { appName, theme } = resolveSsrTheme(fakeHeaders({}))
    expect(appName).toBe('ezauth')
    expect(theme).toBeNull()
  })

  it('reads the app slug from x-app-theme', () => {
    const { appName } = resolveSsrTheme(fakeHeaders({ 'x-app-theme': 'ezpay' }))
    expect(appName).toBe('ezpay')
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

  it('wraps declarations in :root[data-app=""] selectors', () => {
    const css = renderThemeStyle('ezpay', { primary: '#00D9F7' })
    expect(css).toContain(':root[data-app="ezpay"]')
    expect(css).toContain('--primary:#00D9F7;')
  })

  it('also emits a :root[data-app="x"] .dark override', () => {
    const css = renderThemeStyle('ezpay', { primary: '#00D9F7' })
    expect(css).toContain(':root[data-app="ezpay"] .dark')
  })

  it('omits the logo field', () => {
    const css = renderThemeStyle('ezpay', { logo: 'https://cdn/logo.svg' })
    expect(css).toBe('')
  })

  it('rejects malformed slug (no CSS emitted)', () => {
    const css = renderThemeStyle('bad"slug', { primary: '#fff' })
    expect(css).toBe('')
  })
})
