import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// Control the values returned by `next-intl` / `next/navigation` per-test.
let mockLocale = 'en'
let mockSearchParams = new URLSearchParams()

vi.mock('next-intl', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useLocale: () => mockLocale,
    useTranslations: () => (key: string) => key,
  }
})

vi.mock('next/navigation', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useSearchParams: () => mockSearchParams,
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/',
  }
})

const { useAuthNavigation } = await import('../../react/useAuthNavigation.js')

describe('useAuthNavigation', () => {
  beforeEach(() => {
    mockLocale = 'en'
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
    mockLocale = 'fr'
    mockSearchParams = new URLSearchParams()

    const { result } = renderHook(() => useAuthNavigation())

    expect(result.current.locale).toBe('fr')
    expect(result.current.loginHref).toBe('/fr/login')
    expect(result.current.registerHref).toBe('/fr/register')
    expect(result.current.forgotPasswordHref).toBe('/fr/forgot-password')
    expect(result.current.resetPasswordHref).toBe('/fr/reset-password')
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
    mockLocale = 'en'
    mockSearchParams = new URLSearchParams('key=abc')

    const { result } = renderHook(() => useAuthNavigation())

    expect(result.current.buildAuthPath('/custom')).toBe('/en/custom?key=abc')
  })
})
