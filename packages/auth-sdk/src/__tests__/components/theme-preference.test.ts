/**
 * Unit tests for the theme-preference helpers used to propagate the
 * consumer's light/dark preference across the ezauth redirect flow.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { detectCurrentThemePreference, readThemeCookie } from '../../components/themePreference.js'

describe('readThemeCookie', () => {
  it('returns undefined for an empty string', () => {
    expect(readThemeCookie('')).toBeUndefined()
  })

  it('returns the value when a theme cookie is present', () => {
    expect(readThemeCookie('theme=dark')).toBe('dark')
    expect(readThemeCookie('theme=light')).toBe('light')
    expect(readThemeCookie('theme=system')).toBe('system')
  })

  it('parses the theme cookie when mixed with other cookies', () => {
    expect(readThemeCookie('foo=bar; theme=dark; session=abc')).toBe('dark')
  })

  it('returns undefined when theme cookie has a non-whitelisted value', () => {
    expect(readThemeCookie('theme=neon')).toBeUndefined()
    expect(readThemeCookie('theme=')).toBeUndefined()
  })

  it('decodes percent-encoded cookie values', () => {
    expect(readThemeCookie('theme=%64ark')).toBe('dark')
  })

  it('ignores cookies whose name has a theme suffix', () => {
    // Edge case: cookie named `mytheme` must not be picked up by the
    // `theme=` matcher. The regex is anchored on `^` or `;\s*`.
    expect(readThemeCookie('mytheme=dark')).toBeUndefined()
  })
})

describe('detectCurrentThemePreference', () => {
  const originalDocument = globalThis.document

  beforeEach(() => {
    // Minimal document mock — jsdom is the default in auth-sdk tests, so
    // `document` already exists but we reset cookie/classList for each test.
    if (typeof document !== 'undefined') {
      // Clear all cookies
      document.cookie.split(';').forEach(c => {
        const eq = c.indexOf('=')
        const name = (eq > -1 ? c.slice(0, eq) : c).trim()
        if (name) {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
      })
      document.documentElement.className = ''
      delete document.documentElement.dataset.theme
    }
  })

  afterEach(() => {
    // @ts-expect-error — restore in case a test overwrote globalThis.document
    globalThis.document = originalDocument
  })

  it('returns undefined when no signal is available', () => {
    expect(detectCurrentThemePreference()).toBeUndefined()
  })

  it('reads the theme cookie first', () => {
    document.cookie = 'theme=dark; path=/'
    expect(detectCurrentThemePreference()).toBe('dark')
  })

  it('falls back to the data-theme attribute', () => {
    document.documentElement.dataset.theme = 'light'
    expect(detectCurrentThemePreference()).toBe('light')
  })

  it('falls back to the .dark class when no cookie and no data-theme', () => {
    document.documentElement.classList.add('dark')
    expect(detectCurrentThemePreference()).toBe('dark')
  })

  it('falls back to the .light class when no cookie and no data-theme', () => {
    document.documentElement.classList.add('light')
    expect(detectCurrentThemePreference()).toBe('light')
  })

  it('cookie overrides a conflicting class', () => {
    document.cookie = 'theme=light; path=/'
    document.documentElement.classList.add('dark')
    expect(detectCurrentThemePreference()).toBe('light')
  })
})
