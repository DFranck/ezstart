import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// Control the values returned by `next/navigation` per-test. The hook now
// detects the locale from `usePathname()` (no `next-intl` dep), so the
// pathname is the source of truth for locale.
let mockPathname = '/en/login'
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useSearchParams: () => mockSearchParams,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => mockPathname,
  }
})

const { useAuthNavigation } = await import('../../react/useAuthNavigation.js')

describe('useAuthNavigation', () => {
  beforeEach(() => {
    mockPathname = '/en/login'
    mockSearchParams = new URLSearchParams()
  })

  it('prefixes generated hrefs with the active locale (en)', () => {
    mockSearchParams = new URLSearchParams('key=ez_pk_live_abc&redirect_uri=https://example.com')

    const { result } = renderHook(() => useAuthNavigation())

    expect(result.current.locale).toBe('en')
    expect(result.current.loginHref).toBe(
      '/en/login?key=ez_pk_live_abc&redirect_uri=https%3A%2F%2Fexample.com'
    )
    expect(result.current.registerHref).toBe(
      '/en/register?key=ez_pk_live_abc&redirect_uri=https%3A%2F%2Fexample.com'
    )
    expect(result.current.forgotPasswordHref).toBe(
      '/en/forgot-password?key=ez_pk_live_abc&redirect_uri=https%3A%2F%2Fexample.com'
    )
    expect(result.current.resetPasswordHref).toBe(
      '/en/reset-password?key=ez_pk_live_abc&redirect_uri=https%3A%2F%2Fexample.com'
    )
  })

  it('prefixes generated hrefs with the active locale (fr)', () => {
    mockPathname = '/fr/login'
    mockSearchParams = new URLSearchParams()

    const { result } = renderHook(() => useAuthNavigation())

    expect(result.current.locale).toBe('fr')
    expect(result.current.loginHref).toBe('/fr/login')
    expect(result.current.registerHref).toBe('/fr/register')
    expect(result.current.forgotPasswordHref).toBe('/fr/forgot-password')
    expect(result.current.resetPasswordHref).toBe('/fr/reset-password')
  })

  it('exposes unprefixed paths + searchSuffix for locale-aware <Link>', () => {
    mockPathname = '/en/login'
    mockSearchParams = new URLSearchParams('key=ez_pk_live_abc&redirect_uri=https://example.com')

    const { result } = renderHook(() => useAuthNavigation())

    // Unprefixed paths — safe with i18n <Link> (no locale double-prefix)
    expect(result.current.loginPath).toBe('/login')
    expect(result.current.registerPath).toBe('/register')
    expect(result.current.forgotPasswordPath).toBe('/forgot-password')
    expect(result.current.resetPasswordPath).toBe('/reset-password')
    // searchSuffix carries propagated query
    expect(result.current.searchSuffix).toBe(
      '?key=ez_pk_live_abc&redirect_uri=https%3A%2F%2Fexample.com'
    )
  })

  it('searchSuffix is empty when no propagated query', () => {
    mockPathname = '/en/login'
    mockSearchParams = new URLSearchParams()

    const { result } = renderHook(() => useAuthNavigation())

    expect(result.current.searchSuffix).toBe('')
  })

  it('strips the reserved `token` search param from propagated query', () => {
    mockSearchParams = new URLSearchParams('token=secret&key=ez_pk_live_abc')

    const { result } = renderHook(() => useAuthNavigation())

    expect(result.current.loginHref).toBe('/en/login?key=ez_pk_live_abc')
    expect(result.current.loginHref).not.toContain('token')
  })

  it('exposes publishableKey (?key=) and legacy app (?app=)', () => {
    mockSearchParams = new URLSearchParams('key=ez_pk_live_xyz&app=ezpay')

    const { result } = renderHook(() => useAuthNavigation())

    expect(result.current.publishableKey).toBe('ez_pk_live_xyz')
    expect(result.current.app).toBe('ezpay')
  })

  it('buildAuthPath respects the locale prefix and current query', () => {
    mockPathname = '/en/login'
    mockSearchParams = new URLSearchParams('key=abc')

    const { result } = renderHook(() => useAuthNavigation())

    expect(result.current.buildAuthPath('/custom')).toBe('/en/custom?key=abc')
  })
})
