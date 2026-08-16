/**
 * Cross-origin detection helpers — used by the AuthProvider to decide whether
 * the configured `authMode` (`'httpOnly'` or `'localStorage'`) is actually
 * usable in the current browser environment.
 *
 * **Why this exists** — when a consumer hardcodes `authMode='httpOnly'` but
 * the web origin and the API origin live on **different registrable
 * domains** (eTLD+1), the browser silently rejects any `Set-Cookie` carrying
 * a `Domain` attribute that doesn't belong to the request origin. The login
 * call returns `200 OK`, but no cookie is stored, so the next SSR request
 * reads no cookie → `getServerAuth()` returns `null` → the user appears to
 * be logged out immediately after a "successful" login.
 *
 * Reproduced 2026-05-01 staging Vercel preview:
 *   web: `ezauth-git-staging-ezstart.vercel.app` (eTLD+1: `vercel.app`)
 *   api: `ezauth-api-staging.up.railway.app`     (eTLD+1: `railway.app`)
 *
 * Production is unaffected because both web and API live on `*.ezstart.xyz`
 * (same eTLD+1).
 *
 * **Design choice — naive eTLD+1** — we split the hostname by `.` and
 * compare the last two segments. This is correct for the common gTLDs we
 * use (`.com`, `.xyz`, `.app`, `.io`, `.dev`) and for the deployment
 * platforms we target (`.vercel.app`, `.railway.app`, `.fly.dev`,
 * `.netlify.app`). It is **wrong** for multi-segment country TLDs like
 * `.co.uk`, `.com.br`, `.com.au` — those would compare as same-domain when
 * they are not. Acceptable trade-off: we don't host on those TLDs, the
 * Public Suffix List (`psl` package, ~80KB) would be overkill, and the
 * fallback to `localStorage` is the *safer* default anyway.
 *
 * @module
 */

import type { AuthMode } from './types.js'

// ---------------------------------------------------------------------------
// Module-level dedup — warn ONCE per (api, web) pair per session
// ---------------------------------------------------------------------------

/**
 * Tracks `(api, web)` pairs we have already warned about, so a re-render
 * cascade or repeated `useMemo` re-evaluation doesn't spam the console with
 * the same advisory.
 *
 * Keyed by `<apiUrl>|<webOrigin>` so the same pair never warns twice but a
 * different deployment (e.g. preview branch) still surfaces its own warning.
 *
 * @internal
 */
const warnedPairs = new Set<string>()

/**
 * Reset the dedup cache. **Test-only** — never call from production code.
 *
 * @internal
 */
export function __resetCrossOriginWarnCache(): void {
  warnedPairs.clear()
}

// ---------------------------------------------------------------------------
// Same-eTLD+1 comparison
// ---------------------------------------------------------------------------

/**
 * Compare two URLs by their **registrable domain** (eTLD+1).
 *
 * Returns `true` when both URLs share the same parent domain (e.g. both
 * `*.ezstart.xyz`), `false` when they live on different parent domains
 * (e.g. `*.vercel.app` vs `*.railway.app`).
 *
 * Handling matrix:
 * - Identical hostnames → `true`
 * - `localhost` ↔ `localhost` → `true` (same dev machine)
 * - `localhost` ↔ anything else → `false`
 * - IPv4 / IPv6 literals → strict equality on the host
 * - Single-segment hosts (e.g. `intranet`) → strict equality on the host
 * - Standard domains → compare last two segments after splitting on `.`
 * - Malformed input (throws inside `new URL`) → `false`
 *
 * @param a - First URL (typically the API base URL)
 * @param b - Second URL (typically the web origin)
 * @returns `true` when both URLs share the same registrable domain
 *
 * @example
 * ```ts
 * isSameRegistrableDomain('https://api.ezstart.xyz', 'https://app.ezstart.xyz')
 * // → true (same eTLD+1: ezstart.xyz)
 *
 * isSameRegistrableDomain('https://api.up.railway.app', 'https://app.vercel.app')
 * // → false (different eTLD+1)
 *
 * isSameRegistrableDomain('http://localhost:6110', 'http://localhost:6111')
 * // → true (both localhost — dev cross-port is allowed via Domain=localhost)
 * ```
 */
export function isSameRegistrableDomain(a: string, b: string): boolean {
  let hostA: string
  let hostB: string
  try {
    hostA = new URL(a).hostname
    hostB = new URL(b).hostname
  } catch {
    return false
  }

  if (hostA === hostB) return true

  // localhost: only same-as-self counts (we already returned above for
  // strict equality, so this branch handles `localhost` vs anything else).
  if (hostA === 'localhost' || hostB === 'localhost') {
    return false
  }

  // IP literals (IPv4 dotted-quad, IPv6 literal) — strict equality only.
  // The eTLD+1 split would produce nonsense (`'0.1'` for `127.0.0.1`).
  const isIpLiteral = (host: string): boolean =>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || host.startsWith('[')
  if (isIpLiteral(hostA) || isIpLiteral(hostB)) {
    return false
  }

  const partsA = hostA.split('.')
  const partsB = hostB.split('.')

  // Single-segment hosts (e.g. `intranet`) — strict equality only.
  if (partsA.length < 2 || partsB.length < 2) {
    return false
  }

  const eTLDPlusOneA = partsA.slice(-2).join('.')
  const eTLDPlusOneB = partsB.slice(-2).join('.')
  return eTLDPlusOneA === eTLDPlusOneB
}

// ---------------------------------------------------------------------------
// Effective authMode resolution
// ---------------------------------------------------------------------------

/**
 * Optional logger surface — `warn` is the only level called. Designed to be
 * compatible with `console`, `@ezstart/logger`, or any custom shim.
 */
export interface CrossOriginLogger {
  warn?: (message: string, ...args: unknown[]) => void
}

/**
 * Resolve the **effective** `authMode` given the consumer's configured value
 * and the cross-origin state of the current environment.
 *
 * Decision tree:
 * 1. `configured === 'localStorage'` → returns `'localStorage'`.
 *    The consumer explicitly opted out of cookie auth; respect that.
 * 2. SSR (no `window`) → returns `configured`.
 *    Cookies are evaluated on the server via `getServerAuth({cookieHeader})`
 *    which doesn't care about the browser-side mode.
 * 3. `configured === 'httpOnly'` + same eTLD+1 → returns `'httpOnly'`.
 *    Cookies will be set and replayed correctly.
 * 4. `configured === 'httpOnly'` + cross-origin → returns `'localStorage'`
 *    with a one-time `console.warn`. Cross-domain cookies are blocked by
 *    every modern browser, so silently falling back to localStorage is the
 *    only way to keep the consumer functional.
 *
 * @param configured - The value the consumer passed to `<AuthProvider authMode={...}>`
 * @param apiUrl - The API base URL (e.g. `'https://api.example.com'`)
 * @param webOrigin - Optional override for the web origin (defaults to `window.location.origin` in browser, ignored in SSR)
 * @param logger - Optional logger; only `warn` is called, exactly once per (api, web) pair per session
 * @returns The `AuthMode` the SDK should actually use
 *
 * @example
 * ```ts
 * // Production — same eTLD+1 → keeps httpOnly
 * resolveEffectiveAuthMode('httpOnly', 'https://api.ezstart.xyz', 'https://app.ezstart.xyz')
 * // → 'httpOnly'
 *
 * // Vercel preview — cross-origin → falls back to localStorage with a warning
 * resolveEffectiveAuthMode(
 *   'httpOnly',
 *   'https://ezauth-api-staging.up.railway.app',
 *   'https://ezauth-git-staging-ezstart.vercel.app',
 *   console
 * )
 * // → 'localStorage' (and console.warn fires once)
 *
 * // Consumer opted out — respect the choice unconditionally
 * resolveEffectiveAuthMode('localStorage', 'https://api.x.com', 'https://app.y.com')
 * // → 'localStorage'
 * ```
 */
export function resolveEffectiveAuthMode(
  configured: AuthMode,
  apiUrl: string,
  webOrigin?: string,
  logger?: CrossOriginLogger
): AuthMode {
  if (configured === 'localStorage') return 'localStorage'

  // SSR: no window means no cookie jar to inspect; defer to the configured
  // mode. The server-side cookie read happens via `getServerAuth()` which
  // is independent of browser-side mode resolution.
  if (typeof window === 'undefined' && webOrigin === undefined) {
    return configured
  }

  const origin = webOrigin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  if (!origin) return configured

  if (isSameRegistrableDomain(apiUrl, origin)) {
    return 'httpOnly'
  }

  // Cross-origin detected — warn once per (api, web) pair, then fall back.
  const dedupKey = `${apiUrl}|${origin}`
  if (!warnedPairs.has(dedupKey)) {
    warnedPairs.add(dedupKey)
    logger?.warn?.(
      `[auth-sdk] Cross-origin detected (api=${apiUrl} vs web=${origin}). ` +
        `Falling back authMode 'httpOnly' → 'localStorage' since cross-domain ` +
        `cookies are blocked by browsers. Set up a custom domain for your API ` +
        `on the same eTLD+1 as your web for httpOnly support (e.g. ` +
        `api.<your-domain> + app.<your-domain>).`
    )
  }
  return 'localStorage'
}
