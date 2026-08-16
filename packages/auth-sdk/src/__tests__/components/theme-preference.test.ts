/**
 * Unit tests for the theme-preference helpers used to propagate the
 * consumer's light/dark preference across the ezauth redirect flow.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  detectCurrentThemePreference,
  readThemeCookie,
  readThemeStorage,
} from '../../components/themePreference.js'

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
    // Reset localStorage — next-themes' primary storage in most consumers.
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('theme')
      } catch {
        // ignore
      }
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

  // ---------------------------------------------------------------------------
  // localStorage-first (fix for stale-cookie bug — cf. `themePreference.ts`
  // Resolution order §0).
  //
  // next-themes (the default wrapper in `packages/ui/src/theme/theme-provider.tsx`
  // and most @ezstart consumers) writes ONLY to `localStorage['theme']`, never
  // to a cookie. If the resolver read the cookie first it would surface a
  // stale value after the user toggled the theme in-session, and the ezauth
  // pages would paint in the previous scheme.
  // ---------------------------------------------------------------------------

  it('reads localStorage["theme"] with highest priority (over cookie + DOM class)', () => {
    window.localStorage.setItem('theme', 'dark')
    document.cookie = 'theme=light; path=/'
    document.documentElement.classList.add('light')
    expect(detectCurrentThemePreference()).toBe('dark')
  })

  it('falls back to cookie when localStorage is absent', () => {
    // No localStorage['theme'] set.
    document.cookie = 'theme=dark; path=/'
    expect(detectCurrentThemePreference()).toBe('dark')
  })

  it('falls back to .dark class when both localStorage and cookie are absent', () => {
    document.documentElement.classList.add('dark')
    expect(detectCurrentThemePreference()).toBe('dark')
  })

  it('returns "system" when localStorage["theme"] is "system"', () => {
    window.localStorage.setItem('theme', 'system')
    expect(detectCurrentThemePreference()).toBe('system')
  })

  it('ignores an invalid localStorage value and falls back to cookie/DOM', () => {
    window.localStorage.setItem('theme', 'blue')
    document.cookie = 'theme=dark; path=/'
    expect(detectCurrentThemePreference()).toBe('dark')
  })

  it('does not throw when localStorage.getItem throws (private-mode Safari, quota, ...)', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('QuotaExceededError: localStorage disabled')
    })
    document.cookie = 'theme=light; path=/'
    // Must not throw AND must fall back to the cookie.
    expect(() => detectCurrentThemePreference()).not.toThrow()
    expect(detectCurrentThemePreference()).toBe('light')
    spy.mockRestore()
  })
})

describe('readThemeStorage', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('theme')
      } catch {
        // ignore
      }
    }
  })

  it('returns undefined when the key is missing', () => {
    expect(readThemeStorage()).toBeUndefined()
  })

  it('returns "light" | "dark" | "system" when set', () => {
    window.localStorage.setItem('theme', 'light')
    expect(readThemeStorage()).toBe('light')

    window.localStorage.setItem('theme', 'dark')
    expect(readThemeStorage()).toBe('dark')

    window.localStorage.setItem('theme', 'system')
    expect(readThemeStorage()).toBe('system')
  })

  it('returns undefined for a non-whitelisted value', () => {
    window.localStorage.setItem('theme', 'blue')
    expect(readThemeStorage()).toBeUndefined()

    window.localStorage.setItem('theme', '')
    expect(readThemeStorage()).toBeUndefined()
  })

  it('returns undefined when localStorage.getItem throws (Safari private mode)', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('QuotaExceededError: localStorage disabled')
    })
    expect(() => readThemeStorage()).not.toThrow()
    expect(readThemeStorage()).toBeUndefined()
    spy.mockRestore()
  })
})
