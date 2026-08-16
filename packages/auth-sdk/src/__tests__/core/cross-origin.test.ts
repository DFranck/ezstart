/**
 * Unit tests for `core/cross-origin.ts` — the helper used by the AuthProvider
 * to auto-fallback `authMode='httpOnly'` → `'localStorage'` when the web
 * origin and the API origin live on different registrable domains.
 *
 * Reproduces the staging Vercel + Railway scenario that motivated the fix.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetCrossOriginWarnCache,
  isSameRegistrableDomain,
  resolveEffectiveAuthMode,
} from '../../core/cross-origin.js'

describe('isSameRegistrableDomain', () => {
  it('returns true when both URLs share the exact same hostname', () => {
    expect(isSameRegistrableDomain('https://api.ezstart.xyz', 'https://api.ezstart.xyz')).toBe(true)
  })

  it('returns true for two subdomains of the same eTLD+1', () => {
    expect(isSameRegistrableDomain('https://api.ezstart.xyz', 'https://app.ezstart.xyz')).toBe(true)
    expect(
      isSameRegistrableDomain('https://api.staging.ezstart.xyz', 'https://web.staging.ezstart.xyz')
    ).toBe(true)
  })

  it('returns false for different eTLD+1 (the staging Vercel/Railway scenario)', () => {
    expect(
      isSameRegistrableDomain(
        'https://ezauth-api-staging.up.railway.app',
        'https://ezauth-git-staging-ezstart.vercel.app'
      )
    ).toBe(false)
    expect(isSameRegistrableDomain('https://api.fly.dev', 'https://app.netlify.app')).toBe(false)
  })

  it('treats localhost vs localhost as same domain', () => {
    expect(isSameRegistrableDomain('http://localhost:6110', 'http://localhost:6111')).toBe(true)
  })

  it('treats localhost vs anything else as different domain', () => {
    expect(isSameRegistrableDomain('http://localhost:6110', 'https://api.ezstart.xyz')).toBe(false)
    expect(isSameRegistrableDomain('https://api.ezstart.xyz', 'http://localhost:6111')).toBe(false)
  })

  it('returns false for malformed URLs (gracefully)', () => {
    expect(isSameRegistrableDomain('not-a-url', 'https://api.ezstart.xyz')).toBe(false)
    expect(isSameRegistrableDomain('https://api.ezstart.xyz', '')).toBe(false)
    expect(isSameRegistrableDomain('', '')).toBe(false)
  })

  it('handles IPv4 literals via strict equality only', () => {
    expect(isSameRegistrableDomain('http://127.0.0.1:6110', 'http://127.0.0.1:6111')).toBe(true)
    expect(isSameRegistrableDomain('http://127.0.0.1', 'http://192.168.1.10')).toBe(false)
  })

  it('handles IPv6 literals via strict equality only', () => {
    expect(isSameRegistrableDomain('http://[::1]:6110', 'http://[::1]:6111')).toBe(true)
    expect(isSameRegistrableDomain('http://[::1]', 'http://[::2]')).toBe(false)
  })

  it('returns false for single-segment hostnames that differ', () => {
    expect(isSameRegistrableDomain('http://intranet', 'http://api')).toBe(false)
  })

  it('returns true for cross-protocol matches on the same eTLD+1', () => {
    expect(isSameRegistrableDomain('http://api.ezstart.xyz', 'https://app.ezstart.xyz')).toBe(true)
  })

  it('returns true for matches with explicit port differences on the same eTLD+1', () => {
    expect(
      isSameRegistrableDomain('https://api.ezstart.xyz:8443', 'https://app.ezstart.xyz:443')
    ).toBe(true)
  })
})

describe('resolveEffectiveAuthMode', () => {
  beforeEach(() => {
    __resetCrossOriginWarnCache()
  })

  it('returns localStorage when configured localStorage, regardless of origins', () => {
    expect(
      resolveEffectiveAuthMode('localStorage', 'https://api.ezstart.xyz', 'https://app.ezstart.xyz')
    ).toBe('localStorage')
    expect(
      resolveEffectiveAuthMode(
        'localStorage',
        'https://api.up.railway.app',
        'https://app.vercel.app'
      )
    ).toBe('localStorage')
  })

  it('returns httpOnly when configured httpOnly + same eTLD+1', () => {
    expect(
      resolveEffectiveAuthMode('httpOnly', 'https://api.ezstart.xyz', 'https://app.ezstart.xyz')
    ).toBe('httpOnly')
  })

  it('falls back to localStorage when configured httpOnly + cross-origin, with a warning', () => {
    const logger = { warn: vi.fn() }
    const mode = resolveEffectiveAuthMode(
      'httpOnly',
      'https://ezauth-api-staging.up.railway.app',
      'https://ezauth-git-staging-ezstart.vercel.app',
      logger
    )
    expect(mode).toBe('localStorage')
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Cross-origin detected'))
    expect(logger.warn.mock.calls[0]?.[0]).toContain('ezauth-api-staging.up.railway.app')
    expect(logger.warn.mock.calls[0]?.[0]).toContain('ezauth-git-staging-ezstart.vercel.app')
  })

  it('respects configured mode in SSR (no window) when no webOrigin override', () => {
    const originalWindow = globalThis.window
    // Remove window to simulate SSR. jsdom sets it by default.
    // @ts-expect-error — intentional removal for SSR simulation
    delete globalThis.window

    try {
      expect(resolveEffectiveAuthMode('httpOnly', 'https://api.example.com')).toBe('httpOnly')
      expect(resolveEffectiveAuthMode('localStorage', 'https://api.example.com')).toBe(
        'localStorage'
      )
    } finally {
      globalThis.window = originalWindow
    }
  })

  it('warns ONCE per (api, web) pair across multiple calls in the same session', () => {
    const logger = { warn: vi.fn() }
    const api = 'https://api.up.railway.app'
    const web = 'https://app.vercel.app'

    resolveEffectiveAuthMode('httpOnly', api, web, logger)
    resolveEffectiveAuthMode('httpOnly', api, web, logger)
    resolveEffectiveAuthMode('httpOnly', api, web, logger)
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('warns again when the (api, web) pair changes (different preview branch)', () => {
    const logger = { warn: vi.fn() }
    resolveEffectiveAuthMode(
      'httpOnly',
      'https://api.up.railway.app',
      'https://branch-a.vercel.app',
      logger
    )
    resolveEffectiveAuthMode(
      'httpOnly',
      'https://api.up.railway.app',
      'https://branch-b.vercel.app',
      logger
    )
    expect(logger.warn).toHaveBeenCalledTimes(2)
  })

  it('does not throw when the logger is omitted on cross-origin', () => {
    expect(() =>
      resolveEffectiveAuthMode('httpOnly', 'https://api.up.railway.app', 'https://app.vercel.app')
    ).not.toThrow()
  })

  it('falls back to window.location.origin when webOrigin is not provided', () => {
    // jsdom default origin is `http://localhost:3000`.
    const logger = { warn: vi.fn() }
    const mode = resolveEffectiveAuthMode(
      'httpOnly',
      'https://api.up.railway.app',
      undefined,
      logger
    )
    // localhost (jsdom) vs api.up.railway.app → cross-origin → fallback
    expect(mode).toBe('localStorage')
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  afterEach(() => {
    __resetCrossOriginWarnCache()
  })
})
