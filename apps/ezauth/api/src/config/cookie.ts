/**
 * Cookie configuration — centralized to avoid duplication across
 * login-cookie, sso-exchange, token, logout, middleware/auth and refresh routes.
 *
 * Exports cookie names, TTLs and builder helpers that derive the cookie
 * `Domain` attribute dynamically from the request's `Origin` header so the
 * same code path works on:
 *
 * - Production: web `auth.ezstart.xyz` ↔ API `api.ezstart.xyz`
 *   → `Domain=.ezstart.xyz` (cross-subdomain SSO)
 * - Staging Vercel preview: web `*.vercel.app` ↔ API `*.up.railway.app`
 *   → `Domain=undefined` (host-only — cookie unusable cross-origin, the SDK
 *   transparently falls back to localStorage mode in that case)
 * - Dev: web `localhost:6111` ↔ API `localhost:6110`
 *   → `Domain=localhost` (cross-port localhost cookie)
 *
 * Background — the previous implementation hardcoded `.ezstart.xyz` whenever
 * `NODE_ENV === 'production'`. On Railway staging that env var is `production`
 * but the API host is NOT a subdomain of `ezstart.xyz`, so the browser
 * silently rejected every `Set-Cookie` carrying `Domain=.ezstart.xyz`. Result:
 * zero cookie stored after login → SSR `getServerAuth()` always returned null
 * → infinite auth loop. This refactor derives the Domain from the request
 * Origin so the cookie is always valid for the actual host pair.
 */

import type { CookieOptions, Request } from 'express'
import { env } from './env.js'

export const ACCESS_COOKIE_NAME = 'ezauth_token'
export const REFRESH_COOKIE_NAME = 'ezauth_refresh'

/** Access token TTL — mirrors JWT access-token lifetime (15 minutes). */
export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000

/** Refresh token TTL — must match REFRESH_TOKEN_DAYS in auth.service (30 days). */
export const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/** Path scope for the refresh cookie (only exposed on refresh endpoints). */
export const REFRESH_COOKIE_PATH = '/api/auth/refresh'

// ---------------------------------------------------------------------------
// Public Suffix List handling
// ---------------------------------------------------------------------------
//
// Duplicated from packages/auth-sdk/src/core/cross-origin.ts for now — extract
// to a shared package in a future refactor (see plan groovy-knitting-nebula.md).
// We keep these helpers local so the API has zero coupling to the SDK and the
// PSL list can be augmented independently for server-side concerns.
//
// The "naive eTLD+1" approach (split last 2 segments) is correct for the gTLDs
// we deploy on (.com, .xyz, .io, .dev) but wrong for multi-segment TLDs
// (.co.uk, .com.br) and for hosting platforms whose customer subdomains
// MUST be host-only because the parent domain is a public suffix
// (e.g. `vercel.app`, `up.railway.app`, `github.io`). This list captures the
// platforms we deploy on; if the computed eTLD+1 matches any entry we drop
// to host-only (`Domain=undefined`).

/**
 * Public suffixes where customer apps live as direct children. If the
 * computed parent domain matches any entry, force host-only cookies because
 * setting `Domain=<entry>` would let any customer on that platform read our
 * cookie.
 *
 * @internal
 */
const PUBLIC_SUFFIX_HOSTING_PLATFORMS = new Set<string>([
  'vercel.app',
  'up.railway.app',
  'railway.app',
  'github.io',
  'netlify.app',
  'fly.dev',
  'pages.dev',
  'workers.dev',
])

/**
 * Returns true when the host is `localhost`, `127.0.0.1`, `::1` or any
 * `[::1]`-style IPv6 literal. We treat all of these as "same dev machine"
 * for the purpose of cookie domain derivation.
 *
 * @internal
 */
function isLocalhostHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]' ||
    host.endsWith('.localhost')
  )
}

/**
 * Returns true when the host looks like an IP literal (IPv4 dotted-quad or
 * IPv6) — IP literals can never carry a `Domain` attribute (browsers reject
 * it), so we always fall back to host-only.
 *
 * @internal
 */
function isIpLiteralHost(host: string): boolean {
  return (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || // IPv4
    host.includes(':') || // IPv6
    host.startsWith('[') // bracketed IPv6
  )
}

/**
 * Compute the registrable domain (eTLD+1) of a hostname using the same
 * naive last-2-segments split as the auth-sdk helper. Returns `null` when
 * the host is single-segment (localhost, intranet) or an IP literal.
 *
 * @internal
 */
function getRegistrableDomain(host: string): string | null {
  if (isLocalhostHost(host) || isIpLiteralHost(host)) return null
  const parts = host.split('.')
  if (parts.length < 2) return null
  return parts.slice(-2).join('.')
}

/**
 * Returns true when `a` and `b` share the same registrable domain (eTLD+1).
 * Mirrors `isSameRegistrableDomain` in `packages/auth-sdk/src/core/cross-origin.ts`
 * but operates on bare hostnames (no `new URL()` parse needed — the caller
 * already has them).
 *
 * @internal
 */
function isSameRegistrableHost(a: string, b: string): boolean {
  if (a === b) return true
  if (isLocalhostHost(a) || isLocalhostHost(b)) return false
  if (isIpLiteralHost(a) || isIpLiteralHost(b)) return false
  const eTldA = getRegistrableDomain(a)
  const eTldB = getRegistrableDomain(b)
  return eTldA !== null && eTldB !== null && eTldA === eTldB
}

/**
 * Extract the hostname from an Origin header value. Returns `null` for
 * malformed values, the literal `"null"` (sent for opaque origins like
 * `data:` or sandboxed iframes), and `"*"`.
 *
 * @internal
 */
function getOriginHost(originHeader: string | undefined): string | null {
  if (!originHeader || originHeader === 'null' || originHeader === '*') return null
  try {
    return new URL(originHeader).hostname
  } catch {
    return null
  }
}

/**
 * Derive the cookie `Domain` attribute for the current request.
 *
 * Decision tree (in order):
 * 1. No `Origin` header (curl, server-to-server) → `undefined` (host-only).
 * 2. Both Origin host AND request host are localhost → `'localhost'`
 *    (preserves dev cross-port behavior; cf. `.claude/rules/env.md` §7).
 * 3. Origin host and request host are NOT same eTLD+1 → `undefined`
 *    (cross-eTLD+1 cookie would be silently dropped by the browser anyway).
 * 4. Computed eTLD+1 is in `PUBLIC_SUFFIX_HOSTING_PLATFORMS` → `undefined`
 *    (would otherwise share the cookie with every other tenant).
 * 5. `env.COOKIE_DOMAIN` is set AND matches the request eTLD+1 → use it
 *    (operator override, useful for explicit production setups).
 * 6. Default → return `'.' + eTLD+1` (e.g. `.ezstart.xyz`) for cross-subdomain.
 *
 * @internal
 */
function getCookieDomain(req: Request): string | undefined {
  const originHost = getOriginHost(req.headers.origin)
  // `req.hostname` honours `app.set('trust proxy', N)` so it returns the real
  // public hostname even behind Railway / Vercel reverse proxies.
  const requestHost = req.hostname

  // (1) No Origin → host-only. Server-to-server callers have no browser jar
  // to populate anyway; CORS would block the same call from a real browser.
  if (!originHost) return undefined

  // (2) Pure localhost dev — keep the cross-port cookie behavior.
  if (isLocalhostHost(originHost) && isLocalhostHost(requestHost)) {
    return 'localhost'
  }

  // (3) Cross-eTLD+1 (e.g. *.vercel.app web ↔ *.railway.app API) → host-only.
  // The browser would drop a `Domain=` attribute that doesn't match the
  // response host anyway; falling back to host-only at least keeps the
  // response valid (the SDK will detect cross-origin and switch to
  // localStorage mode on its own).
  if (!isSameRegistrableHost(originHost, requestHost)) return undefined

  const eTld = getRegistrableDomain(requestHost)
  if (!eTld) return undefined

  // (4) Customer apps on a public-suffix hosting platform — host-only.
  // Setting `Domain=vercel.app` (or `up.railway.app`) would let every other
  // tenant on the platform read our cookie.
  if (PUBLIC_SUFFIX_HOSTING_PLATFORMS.has(eTld)) return undefined

  // (5) Operator override — only honoured when consistent with the actual
  // request domain, so a stale env var can't break the cookie silently.
  if (env.COOKIE_DOMAIN) {
    const overrideStripped = env.COOKIE_DOMAIN.startsWith('.')
      ? env.COOKIE_DOMAIN.slice(1)
      : env.COOKIE_DOMAIN
    if (overrideStripped === eTld) return env.COOKIE_DOMAIN
    // Mismatch — ignore the override and fall through to the dynamic value.
  }

  // (6) Standard cross-subdomain cookie. The leading dot is the legacy form
  // accepted by every browser and is the form Express expects when you want
  // the cookie sent to all subdomains.
  return `.${eTld}`
}

/**
 * Cookie options for the short-lived access token (`ezauth_token`).
 * Scoped to `/` so every route on the domain can read it.
 */
export function buildAuthCookieOptions(
  req: Request,
  overrides: Partial<CookieOptions> = {}
): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: '/',
    domain: getCookieDomain(req),
    ...overrides,
  }
}

/**
 * Cookie options used when clearing the access token cookie. Omits maxAge so
 * the browser removes the cookie immediately, but keeps domain/path/secure
 * flags identical to the ones used at creation (otherwise the clear is ignored).
 */
export function buildAuthCookieClearOptions(
  req: Request,
  overrides: Partial<CookieOptions> = {}
): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: getCookieDomain(req),
    ...overrides,
  }
}

/**
 * Cookie options for the refresh token (`ezauth_refresh`).
 * Scoped to the refresh endpoint path so it's never sent on unrelated routes.
 */
export function buildRefreshCookieOptions(
  req: Request,
  overrides: Partial<CookieOptions> = {}
): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: REFRESH_COOKIE_PATH,
    domain: getCookieDomain(req),
    ...overrides,
  }
}

/** Clear-options counterpart for the refresh cookie. */
export function buildRefreshCookieClearOptions(
  req: Request,
  overrides: Partial<CookieOptions> = {}
): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    domain: getCookieDomain(req),
    ...overrides,
  }
}

/** Short (seconds) access token TTL exposed to clients in token responses. */
export const ACCESS_TOKEN_EXPIRES_SECONDS = Math.floor(ACCESS_TOKEN_MAX_AGE_MS / 1000)

// ---------------------------------------------------------------------------
// Test-only exports
// ---------------------------------------------------------------------------

/**
 * Internal helper exported for unit tests only. Do not call from production
 * code paths — use the cookie option builders above instead.
 *
 * @internal
 */
export const __testOnly = {
  getCookieDomain,
  isSameRegistrableHost,
  getRegistrableDomain,
  isLocalhostHost,
  isIpLiteralHost,
  PUBLIC_SUFFIX_HOSTING_PLATFORMS,
}
