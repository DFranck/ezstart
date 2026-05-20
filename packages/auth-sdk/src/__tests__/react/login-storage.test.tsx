/**
 * LOW-1 regression — `login()` must never abort when `localStorage.setItem`
 * throws (Safari private mode QuotaExceededError, storage disabled, quota
 * full). The redirect-after-login hint is best-effort: a write failure is
 * swallowed (warned via the injected logger), and the login redirect still
 * proceeds.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { useAuth } from '../../react/hooks.js'
import type { AuthLogger } from '../../react/auth-provider.js'
import { createTestStore, TestAuthProvider } from '../testProvider.js'

// jsdom's `window.location` ignores `href` assignment and emits a "Not
// implemented: navigation" warning. Replace it with a plain object that
// records writes so we can assert that `login()` still redirects.
function stubLocation(pathname = '/dashboard') {
  const calls: string[] = []
  const fakeLocation: Record<string, unknown> = {
    pathname,
    search: '',
    hash: '',
    origin: 'http://localhost',
    get href() {
      return `http://localhost${pathname}`
    },
    set href(value: string) {
      calls.push(value)
    },
    assign: (value: string) => calls.push(value),
    replace: (value: string) => calls.push(value),
  }
  const original = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: fakeLocation,
  })
  return {
    calls,
    restore: () =>
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: original,
      }),
  }
}

describe('useAuth login() — defensive localStorage.setItem (LOW-1)', () => {
  let store: ReturnType<typeof createTestStore>
  let loc: ReturnType<typeof stubLocation>

  beforeEach(() => {
    store = createTestStore()
    localStorage.clear()
    loc = stubLocation()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    loc.restore()
    vi.restoreAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestAuthProvider store={store} webUrl="https://auth.example.com" appName="testapp">
      {children}
    </TestAuthProvider>
  )

  it('persists the redirect hint and redirects on the happy path', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useAuth(), { wrapper })

    // login() returns a never-resolving promise (it redirects). Do NOT await.
    void result.current.login()

    expect(setItemSpy).toHaveBeenCalledWith('ezauth_redirect_after_login', expect.any(String))
    expect(loc.calls.some(u => u.includes('https://auth.example.com/login'))).toBe(true)
  })

  it('continues the login redirect when setItem throws (private mode / quota)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError')
    })

    const warn = vi.fn()
    const logger: AuthLogger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }

    const localWrapper = ({ children }: { children: React.ReactNode }) => (
      <TestAuthProvider store={store} webUrl="https://auth.example.com" appName="testapp">
        {children}
      </TestAuthProvider>
    )
    const { result } = renderHook(() => useAuth(logger), { wrapper: localWrapper })

    // Must NOT throw — the storage failure is swallowed.
    expect(() => void result.current.login()).not.toThrow()

    expect(setItemSpy).toHaveBeenCalled()
    // The redirect still happened despite the storage failure.
    expect(loc.calls.some(u => u.includes('https://auth.example.com/login'))).toBe(true)
    // The failure was surfaced through the injected logger (not console).
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('ezauth_redirect_after_login'),
      expect.any(String)
    )
  })

  it('stays silent (no throw) when setItem throws and no logger is wired', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError')
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(() => void result.current.login()).not.toThrow()
    expect(loc.calls.some(u => u.includes('https://auth.example.com/login'))).toBe(true)
  })
})
