/**
 * Unit tests for the cookie domain derivation logic.
 *
 * Focus: ensure the cookie `Domain` attribute is computed dynamically from
 * the request `Origin` header so the same code path works on production
 * (`*.ezstart.xyz`), Railway/Vercel staging (`*.up.railway.app` ↔
 * `*.vercel.app`), and dev (`localhost:6110` ↔ `localhost:6111`) without
 * silently dropping cookies on cross-eTLD+1 deployments (the bug that
 * triggered this refactor).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request } from 'express'

// Mock the env module so we can flip COOKIE_DOMAIN per test without touching
// real process.env (env.ts loads once at import time and freezes the value).
const envMock = vi.hoisted(() => ({
  NODE_ENV: 'production' as 'development' | 'test' | 'production',
  COOKIE_DOMAIN: undefined as string | undefined,
}))

vi.mock('../../config/env.js', () => ({
  env: envMock,
}))

// IMPORTANT: import AFTER the mock so the cookie module sees the mocked env.
const {
  buildAuthCookieOptions,
  buildAuthCookieClearOptions,
  buildRefreshCookieOptions,
  buildRefreshCookieClearOptions,
  REFRESH_COOKIE_PATH,
  __testOnly,
} = await import('../../config/cookie.js')

const { getCookieDomain, isSameRegistrableHost, getRegistrableDomain, isLocalhostHost } = __testOnly

/**
 * Build a minimal Express-shaped Request for the cookie helpers. We only need
 * `headers.origin` and `hostname` — the helpers ignore everything else.
 */
function makeReq(opts: {
  origin?: string
  hostname?: string
  // For the rare case we want to pass `Origin: null` (sandboxed iframe).
  rawOrigin?: string | undefined
}): Request {
  const headers: Record<string, string | undefined> = {}
  if (opts.rawOrigin !== undefined) {
    headers.origin = opts.rawOrigin
  } else if (opts.origin !== undefined) {
    headers.origin = opts.origin
  }
  return {
    headers,
    hostname: opts.hostname ?? 'api.ezstart.xyz',
  } as unknown as Request
}

beforeEach(() => {
  envMock.NODE_ENV = 'production'
  envMock.COOKIE_DOMAIN = undefined
})

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

describe('isLocalhostHost', () => {
  it('recognises canonical localhost variants', () => {
    expect(isLocalhostHost('localhost')).toBe(true)
    expect(isLocalhostHost('127.0.0.1')).toBe(true)
    expect(isLocalhostHost('::1')).toBe(true)
    expect(isLocalhostHost('[::1]')).toBe(true)
    expect(isLocalhostHost('foo.localhost')).toBe(true)
  })

  it('rejects non-localhost hosts', () => {
    expect(isLocalhostHost('ezstart.xyz')).toBe(false)
    expect(isLocalhostHost('api.ezstart.xyz')).toBe(false)
    expect(isLocalhostHost('localhost.evil.com')).toBe(false)
  })
})

describe('getRegistrableDomain', () => {
  it('returns the last 2 segments for standard hostnames', () => {
    expect(getRegistrableDomain('api.ezstart.xyz')).toBe('ezstart.xyz')
    expect(getRegistrableDomain('app.foo.bar.example.com')).toBe('example.com')
    expect(getRegistrableDomain('ezauth-api-staging.up.railway.app')).toBe('railway.app')
    expect(getRegistrableDomain('preview-pr-42.vercel.app')).toBe('vercel.app')
  })

  it('returns null for localhost / IP literals / single-segment hosts', () => {
    expect(getRegistrableDomain('localhost')).toBeNull()
    expect(getRegistrableDomain('127.0.0.1')).toBeNull()
    expect(getRegistrableDomain('::1')).toBeNull()
    expect(getRegistrableDomain('intranet')).toBeNull()
  })
})

describe('isSameRegistrableHost', () => {
  it('returns true for same eTLD+1', () => {
    expect(isSameRegistrableHost('api.ezstart.xyz', 'auth.ezstart.xyz')).toBe(true)
    expect(isSameRegistrableHost('ezstart.xyz', 'app.ezstart.xyz')).toBe(true)
  })

  it('returns true for identical hosts', () => {
    expect(isSameRegistrableHost('api.ezstart.xyz', 'api.ezstart.xyz')).toBe(true)
  })

  it('returns false for cross-eTLD+1 hosts', () => {
    expect(isSameRegistrableHost('ezauth-api-staging.up.railway.app', 'preview.vercel.app')).toBe(
      false
    )
    expect(isSameRegistrableHost('api.ezstart.xyz', 'app.example.com')).toBe(false)
  })

  it('returns false when one side is localhost and the other is not', () => {
    expect(isSameRegistrableHost('localhost', 'api.ezstart.xyz')).toBe(false)
  })

  it('returns false for distinct IP literals (cookies cannot carry Domain on IPs)', () => {
    expect(isSameRegistrableHost('127.0.0.1', '10.0.0.1')).toBe(false)
    expect(isSameRegistrableHost('127.0.0.1', 'api.ezstart.xyz')).toBe(false)
  })

  it('returns true for identical IPs (defensive — getCookieDomain still drops to host-only)', () => {
    // Identical-string fast path. The actual `getCookieDomain` path catches
    // the IP literal a step later via `getRegistrableDomain` returning null,
    // so the cookie ends up host-only regardless. See the IP-literal cases
    // in the `getCookieDomain` describe block.
    expect(isSameRegistrableHost('127.0.0.1', '127.0.0.1')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getCookieDomain — the matrix from the plan
// ---------------------------------------------------------------------------

describe('getCookieDomain', () => {
  describe('production same-eTLD+1 (auth.ezstart.xyz → api.ezstart.xyz)', () => {
    it('returns ".ezstart.xyz" for cross-subdomain cookie sharing', () => {
      const req = makeReq({
        origin: 'https://auth.ezstart.xyz',
        hostname: 'api.ezstart.xyz',
      })
      expect(getCookieDomain(req)).toBe('.ezstart.xyz')
    })

    it('returns ".ezstart.xyz" even when web and api are on different deeper subdomains', () => {
      const req = makeReq({
        origin: 'https://app.dashboard.ezstart.xyz',
        hostname: 'api.v2.ezstart.xyz',
      })
      expect(getCookieDomain(req)).toBe('.ezstart.xyz')
    })
  })

  describe('staging Vercel preview ↔ Railway API (cross-eTLD+1 hosting platforms)', () => {
    it('returns undefined when web is *.vercel.app and api is *.up.railway.app', () => {
      const req = makeReq({
        origin: 'https://ezauth-git-staging-ezstart.vercel.app',
        hostname: 'ezauth-api-staging.up.railway.app',
      })
      // Cross eTLD+1 (vercel.app vs railway.app) AND both are PSL hosting
      // platforms — must be host-only.
      expect(getCookieDomain(req)).toBeUndefined()
    })

    it('returns undefined when both web and api live on *.vercel.app (would leak cross-tenant)', () => {
      const req = makeReq({
        origin: 'https://web-tenant.vercel.app',
        hostname: 'api-tenant.vercel.app',
      })
      // Same eTLD+1 (vercel.app), but vercel.app is in PSL → host-only.
      expect(getCookieDomain(req)).toBeUndefined()
    })

    it('returns undefined when both hosts live on *.up.railway.app (would leak cross-tenant)', () => {
      const req = makeReq({
        origin: 'https://web.up.railway.app',
        hostname: 'api.up.railway.app',
      })
      expect(getCookieDomain(req)).toBeUndefined()
    })

    it.each([
      ['github.io', 'app.github.io', 'api.github.io'],
      ['fly.dev', 'web.fly.dev', 'api.fly.dev'],
      ['netlify.app', 'web.netlify.app', 'api.netlify.app'],
      ['pages.dev', 'web.pages.dev', 'api.pages.dev'],
      ['workers.dev', 'web.workers.dev', 'api.workers.dev'],
    ])('returns undefined for PSL hosting platform %s', (_label, originHost, requestHost) => {
      const req = makeReq({
        origin: `https://${originHost}`,
        hostname: requestHost,
      })
      expect(getCookieDomain(req)).toBeUndefined()
    })
  })

  describe('localhost dev (cross-port)', () => {
    it('returns "localhost" when both hosts are localhost', () => {
      envMock.NODE_ENV = 'development'
      const req = makeReq({
        origin: 'http://localhost:6111',
        hostname: 'localhost',
      })
      expect(getCookieDomain(req)).toBe('localhost')
    })

    it('returns "localhost" for 127.0.0.1 ↔ localhost (treated as same dev machine)', () => {
      envMock.NODE_ENV = 'development'
      const req = makeReq({
        origin: 'http://127.0.0.1:6111',
        hostname: 'localhost',
      })
      expect(getCookieDomain(req)).toBe('localhost')
    })
  })

  describe('no Origin header (server-to-server / curl)', () => {
    it('returns undefined when Origin is absent', () => {
      const req = makeReq({ hostname: 'api.ezstart.xyz' })
      expect(getCookieDomain(req)).toBeUndefined()
    })

    it('returns undefined when Origin is the literal "null" (sandboxed iframe)', () => {
      const req = makeReq({ rawOrigin: 'null', hostname: 'api.ezstart.xyz' })
      expect(getCookieDomain(req)).toBeUndefined()
    })

    it('returns undefined when Origin is "*" (rare, but defensive)', () => {
      const req = makeReq({ rawOrigin: '*', hostname: 'api.ezstart.xyz' })
      expect(getCookieDomain(req)).toBeUndefined()
    })

    it('returns undefined for malformed Origin headers', () => {
      const req = makeReq({ rawOrigin: 'not-a-url', hostname: 'api.ezstart.xyz' })
      expect(getCookieDomain(req)).toBeUndefined()
    })
  })

  describe('COOKIE_DOMAIN env override', () => {
    it('honours the override when it matches the request eTLD+1 (with leading dot)', () => {
      envMock.COOKIE_DOMAIN = '.ezstart.xyz'
      const req = makeReq({
        origin: 'https://auth.ezstart.xyz',
        hostname: 'api.ezstart.xyz',
      })
      expect(getCookieDomain(req)).toBe('.ezstart.xyz')
    })

    it('honours the override when it matches the request eTLD+1 (without leading dot)', () => {
      envMock.COOKIE_DOMAIN = 'ezstart.xyz'
      const req = makeReq({
        origin: 'https://auth.ezstart.xyz',
        hostname: 'api.ezstart.xyz',
      })
      expect(getCookieDomain(req)).toBe('ezstart.xyz')
    })

    it('IGNORES the override when it does not match the request eTLD+1 (stale env)', () => {
      // Operator left COOKIE_DOMAIN=.ezstart.xyz on a Railway service that
      // now hosts the API on .up.railway.app — must NOT use the stale value.
      envMock.COOKIE_DOMAIN = '.ezstart.xyz'
      const req = makeReq({
        origin: 'https://preview.vercel.app',
        hostname: 'api.up.railway.app',
      })
      expect(getCookieDomain(req)).toBeUndefined()
    })

    it('IGNORES the override on cross-eTLD+1 even when override matches one side', () => {
      envMock.COOKIE_DOMAIN = '.vercel.app'
      const req = makeReq({
        origin: 'https://preview.vercel.app',
        hostname: 'api.up.railway.app',
      })
      // Cross-origin AND vercel.app is PSL — must be host-only regardless.
      expect(getCookieDomain(req)).toBeUndefined()
    })
  })

  describe('IP literal hosts', () => {
    it('returns undefined when origin host is an IP literal (not localhost)', () => {
      const req = makeReq({
        origin: 'http://10.0.0.1:6111',
        hostname: 'api.ezstart.xyz',
      })
      expect(getCookieDomain(req)).toBeUndefined()
    })

    it('returns undefined when request host is an IP literal', () => {
      const req = makeReq({
        origin: 'https://api.ezstart.xyz',
        hostname: '10.0.0.1',
      })
      expect(getCookieDomain(req)).toBeUndefined()
    })
  })
})

// ---------------------------------------------------------------------------
// Cookie option builders — propagate the derived Domain
// ---------------------------------------------------------------------------

describe('buildAuthCookieOptions', () => {
  it('produces production-grade options with derived Domain on same eTLD+1', () => {
    const req = makeReq({
      origin: 'https://auth.ezstart.xyz',
      hostname: 'api.ezstart.xyz',
    })
    const opts = buildAuthCookieOptions(req)
    expect(opts).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      domain: '.ezstart.xyz',
      maxAge: 15 * 60 * 1000,
    })
  })

  it('drops Domain on cross-eTLD+1 staging deployment', () => {
    const req = makeReq({
      origin: 'https://web.vercel.app',
      hostname: 'api.up.railway.app',
    })
    const opts = buildAuthCookieOptions(req)
    expect(opts.domain).toBeUndefined()
    expect(opts.httpOnly).toBe(true)
  })

  it('honours overrides parameter', () => {
    const req = makeReq({
      origin: 'https://auth.ezstart.xyz',
      hostname: 'api.ezstart.xyz',
    })
    const opts = buildAuthCookieOptions(req, { sameSite: 'strict', maxAge: 1000 })
    expect(opts.sameSite).toBe('strict')
    expect(opts.maxAge).toBe(1000)
    // Derived domain still present.
    expect(opts.domain).toBe('.ezstart.xyz')
  })

  it('produces secure=false in development', () => {
    envMock.NODE_ENV = 'development'
    const req = makeReq({
      origin: 'http://localhost:6111',
      hostname: 'localhost',
    })
    const opts = buildAuthCookieOptions(req)
    expect(opts.secure).toBe(false)
    expect(opts.domain).toBe('localhost')
  })
})

describe('buildAuthCookieClearOptions', () => {
  it('mirrors buildAuthCookieOptions WITHOUT maxAge so the browser deletes the cookie', () => {
    const req = makeReq({
      origin: 'https://auth.ezstart.xyz',
      hostname: 'api.ezstart.xyz',
    })
    const opts = buildAuthCookieClearOptions(req)
    expect(opts).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      domain: '.ezstart.xyz',
    })
    expect(opts.maxAge).toBeUndefined()
  })
})

describe('buildRefreshCookieOptions', () => {
  it('uses REFRESH_COOKIE_PATH and 30-day maxAge', () => {
    const req = makeReq({
      origin: 'https://auth.ezstart.xyz',
      hostname: 'api.ezstart.xyz',
    })
    const opts = buildRefreshCookieOptions(req)
    expect(opts.path).toBe(REFRESH_COOKIE_PATH)
    expect(opts.maxAge).toBe(30 * 24 * 60 * 60 * 1000)
    expect(opts.domain).toBe('.ezstart.xyz')
  })

  it('drops Domain on cross-eTLD+1 staging deployment', () => {
    const req = makeReq({
      origin: 'https://web.vercel.app',
      hostname: 'api.up.railway.app',
    })
    const opts = buildRefreshCookieOptions(req)
    expect(opts.domain).toBeUndefined()
    expect(opts.path).toBe(REFRESH_COOKIE_PATH)
  })
})

describe('buildRefreshCookieClearOptions', () => {
  it('mirrors buildRefreshCookieOptions WITHOUT maxAge', () => {
    const req = makeReq({
      origin: 'https://auth.ezstart.xyz',
      hostname: 'api.ezstart.xyz',
    })
    const opts = buildRefreshCookieClearOptions(req)
    expect(opts).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      domain: '.ezstart.xyz',
    })
    expect(opts.maxAge).toBeUndefined()
  })
})
