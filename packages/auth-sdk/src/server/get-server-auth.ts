/**
 * Server-side auth bootstrap helper — Clerk-style SSR pattern.
 *
 * Reads the session cookie from the incoming request and resolves the current
 * user via the `/api/auth/me` endpoint. Returns `null` if not authenticated or
 * if any error occurs (network, parse, 401, timeout, ...).
 *
 * The primary use case is killing the **LoginButton flash** in `httpOnly`
 * mode: because the session cookie is not readable from JavaScript, the
 * client-side `<AuthProvider>` defaults to `isAuthenticated: false` until the
 * async `/me` call resolves. By bootstrapping the user server-side and
 * passing the result as `<AuthProvider initialUser={...}>`, the Zustand store
 * is hydrated synchronously at mount and `<UserMenu>` / `<LoginButton>` /
 * `<RequireAuth>` render the correct state on the very first paint.
 *
 * **Server-only export.** Do NOT import from client code — this module
 * intentionally has zero React or browser dependencies.
 */

import './_internal/server-only.js'

import { resolveAuthApiUrl } from './_internal/resolve-api-url.js'
import type { AuthUser } from '../core/types.js'

/** Minimal logger surface — opt-in, avoids hard dep on `@ezstart/logger`. */
export interface GetServerAuthLogger {
  warn: (message: string, ...args: unknown[]) => void
  debug?: (message: string, ...args: unknown[]) => void
  info?: (message: string, ...args: unknown[]) => void
}

/**
 * Default timeout (in milliseconds) for the `/api/auth/me` fetch.
 *
 * Sized to cover an ezauth healthy round-trip (typically < 300 ms p95) plus
 * a generous buffer for occasional latency spikes, while staying well under
 * Vercel's default 10 s SSR budget. Caps SSR hang on cold start / hung
 * upstream — see {@link getServerAuth} `@remarks`.
 */
export const DEFAULT_GET_SERVER_AUTH_TIMEOUT_MS = 1500

/** Options for {@link getServerAuth}. */
export interface GetServerAuthOptions {
  /**
   * Base URL of the auth API (e.g. `https://api.auth.example.com`).
   *
   * The `/api/auth/me` path is appended automatically. Trailing slashes are
   * tolerated.
   *
   * **Optional since Phase A1 (2026-05-05).** When omitted, the helper
   * falls back to `process.env.NEXT_PUBLIC_EZAUTH_API_URL`, then to the
   * shipped production default (`https://ezauth-api.ezstart.xyz`). Pass
   * an explicit URL to override (self-hosted EZAuth, custom cloud, etc.).
   */
  apiUrl?: string
  /**
   * Raw `Cookie` header from the incoming request. Pass `undefined` (or an
   * empty string) for unauthenticated requests — the helper short-circuits
   * to `null` without making a network call.
   */
  cookieHeader?: string | null
  /**
   * Optional `fetch` override — useful for testing. Defaults to the global
   * `fetch` available in Node 18+, Bun, Deno and modern edge runtimes.
   */
  fetchImpl?: typeof fetch
  /** Optional logger; only `warn` is called, on transport / parse failures. */
  logger?: GetServerAuthLogger
  /**
   * Maximum time (in milliseconds) to wait for `/api/auth/me` before aborting
   * the request and returning `null` gracefully. Defaults to
   * {@link DEFAULT_GET_SERVER_AUTH_TIMEOUT_MS} (1500 ms).
   *
   * Set higher when the upstream EZAuth API is known to be slow (e.g. cold
   * starts on a free-tier Railway service). Set lower for latency-sensitive
   * routes where you prefer a snappy SSR over a server-rendered auth state.
   *
   * Setting `0` or a negative value disables the timeout (NOT recommended —
   * any hung upstream will block the whole SSR render).
   */
  timeoutMs?: number
}

/**
 * Fetch the current user via `/api/auth/me` using the provided cookie header.
 *
 * Returns:
 * - `null` when no cookie header is provided
 * - `null` when the API responds with a non-2xx status (typically 401)
 * - `null` when the response cannot be parsed as JSON or has no user
 * - `null` when the request times out (default {@link DEFAULT_GET_SERVER_AUTH_TIMEOUT_MS})
 * - `AuthUser` on success
 *
 * Network, parse, or timeout errors are caught and logged via
 * `options.logger?.warn` — the helper never throws, so it is safe to call from
 * a top-level layout without try/catch.
 *
 * @remarks
 * **When this helper returns `null` (and that is expected — not a bug):**
 *
 * 1. **No cookie header sent.** The consumer app's browser did not send an
 *    EZAuth session cookie to the SSR render. This is the case in two common
 *    setups:
 *    - **Cross-domain consumers** (e.g. `greenpulse.com` consuming
 *      `ezauth.ezstart.xyz`): the EZAuth httpOnly cookie is scoped to the
 *      ezauth domain and never travels to the consumer's SSR. The browser
 *      handles auth via cross-domain redirects + token exchange, not via
 *      cookie sharing.
 *    - **`authMode: 'localStorage'` setups**: tokens live in `localStorage`
 *      (client-only), so SSR has no way to observe them. The
 *      `<AuthProvider>` will still hydrate post-mount from localStorage,
 *      but `getServerAuth` cannot help.
 *
 *    In both cases, returning `null` is correct and graceful — the
 *    `<AuthProvider>` boots in its "logged out" default and switches to the
 *    authenticated UI once the client-side bootstrap completes. The
 *    anti-flash benefit of this helper applies **only** when the EZAuth
 *    cookie is same-eTLD+1 (or same-origin) with the consumer app AND
 *    `authMode: 'httpOnly'` is used. See `AUTH-FLASH-LOCALSTORAGE-001` in
 *    BACKLOG.md for the dedicated anti-flash strategy for localStorage mode.
 *
 * 2. **Upstream EZAuth is slow / cold-starting.** The fetch is bounded by
 *    `timeoutMs` (default {@link DEFAULT_GET_SERVER_AUTH_TIMEOUT_MS}) to
 *    cap SSR hang. If EZAuth (typically on Railway free tier) is in cold
 *    start and replies in > 1500 ms, the helper aborts and returns `null`
 *    — the page still renders, just without server-bootstrapped auth.
 *
 * @example
 * ```tsx
 * // app/[locale]/layout.tsx (Next.js App Router, Server Component)
 * import { getServerAuth } from '@ezstart/auth-sdk/server'
 * import { headers } from 'next/headers'
 *
 * export default async function LocaleLayout({ children }) {
 *   const headersList = await headers()
 *   const initialUser = await getServerAuth({
 *     apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL!,
 *     cookieHeader: headersList.get('cookie'),
 *   })
 *
 *   return (
 *     <Providers initialUser={initialUser}>{children}</Providers>
 *   )
 * }
 * ```
 */
export async function getServerAuth(options: GetServerAuthOptions): Promise<AuthUser | null> {
  const { apiUrl, cookieHeader, fetchImpl, logger, timeoutMs } = options
  const resolvedApiUrl = resolveAuthApiUrl(apiUrl)
  const resolvedTimeoutMs = timeoutMs ?? DEFAULT_GET_SERVER_AUTH_TIMEOUT_MS
  const timeoutEnabled = resolvedTimeoutMs > 0

  // Cookie inventory: which cookie names are present? (values redacted —
  // session/JWT tokens are sensitive). Logged at debug so the operator can
  // confirm the right cookie is being forwarded to /me.
  const cookieNames = cookieHeader
    ? cookieHeader
        .split(';')
        .map(c => c.trim().split('=')[0])
        .filter(Boolean)
    : []
  logger?.debug?.('[getServerAuth] called', {
    apiUrl: resolvedApiUrl,
    hasCookieHeader: !!cookieHeader,
    cookieHeaderLength: cookieHeader?.length ?? 0,
    cookieNames,
  })

  if (!cookieHeader || cookieHeader.length === 0) {
    logger?.debug?.('[getServerAuth] no cookie header → returning null (anonymous)')
    return null
  }

  const fetchFn = fetchImpl ?? fetch
  const baseUrl = resolvedApiUrl.replace(/\/+$/, '')
  const url = `${baseUrl}/api/auth/me`

  // Bound the upstream call with an AbortController so a slow / hung EZAuth
  // (cold start on Railway free tier, network blip, runaway upstream) cannot
  // block the consumer's SSR indefinitely. Without this guard a hung
  // `/api/auth/me` would suspend the layout render until the platform's
  // outer timeout kicks in (10 s on Vercel by default — way past the user's
  // patience threshold).
  const controller = timeoutEnabled ? new AbortController() : null
  const timer =
    timeoutEnabled && controller ? setTimeout(() => controller.abort(), resolvedTimeoutMs) : null

  try {
    logger?.debug?.('[getServerAuth] fetching /me', {
      url,
      timeoutMs: timeoutEnabled ? resolvedTimeoutMs : 'disabled',
    })
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
      // We forward the Cookie header manually — no need for `credentials`
      // (and the option is meaningless for server-side fetch anyway).
      cache: 'no-store',
      signal: controller?.signal,
    })

    logger?.debug?.('[getServerAuth] /me response', {
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      logger?.debug?.('[getServerAuth] non-2xx → returning null')
      return null
    }

    const body: unknown = await response.json().catch(() => null)
    const user = extractUser(body)
    logger?.debug?.('[getServerAuth] extracted user', {
      hasUser: !!user,
      email: user?.email,
      roles: user?.globalRoles,
    })
    return user
  } catch (err) {
    if (isAbortError(err)) {
      logger?.warn('[getServerAuth] /api/auth/me aborted (timeout)', {
        url,
        timeoutMs: resolvedTimeoutMs,
      })
    } else {
      logger?.warn('[getServerAuth] failed to fetch /api/auth/me', err)
    }
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * True when `err` is a fetch AbortError raised because the AbortController
 * we attached above signalled. We accept both the DOMException-style
 * `name: 'AbortError'` produced by undici (Node 18+, Edge) and the legacy
 * Node `ERR_ABORTED` code, so the same check works across runtimes.
 *
 * @internal
 */
function isAbortError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false
  const candidate = err as { name?: unknown; code?: unknown }
  if (candidate.name === 'AbortError') return true
  if (candidate.code === 'ABORT_ERR' || candidate.code === 'ERR_ABORTED') return true
  return false
}

/**
 * Extract the user object from the API response envelope.
 *
 * Handles the common shapes:
 * - `{ success: true, data: { user: AuthUser } }` (api-core `sendSuccess`)
 * - `{ user: AuthUser }` (legacy direct payload)
 * - `{ data: AuthUser }` (legacy nested without `user` key)
 * - `AuthUser` (raw payload, very legacy)
 *
 * Returns `null` when no recognizable user shape is found or when the
 * envelope explicitly signals failure (`success: false`).
 *
 * @internal
 */
function extractUser(body: unknown): AuthUser | null {
  if (body == null || typeof body !== 'object') return null

  const record = body as Record<string, unknown>

  // Explicit failure envelope — bail out even if there's a stray `user` key.
  if (record.success === false) return null

  // 1. Standard `sendSuccess` envelope: { success, data: { user } }
  const data = record.data
  if (data && typeof data === 'object') {
    const dataRecord = data as Record<string, unknown>
    const userInData = dataRecord.user
    if (isAuthUserLike(userInData)) return userInData as AuthUser
    // 2bis. `{ data: AuthUser }` — user object directly under data.
    if (isAuthUserLike(dataRecord)) return dataRecord as unknown as AuthUser
  }

  // 2. Legacy: { user: AuthUser } at the top level.
  const userTopLevel = record.user
  if (isAuthUserLike(userTopLevel)) return userTopLevel as AuthUser

  // 3. Raw user payload at the top level.
  if (isAuthUserLike(record)) return record as unknown as AuthUser

  return null
}

/**
 * Structural check for the minimum AuthUser shape — `_id` + `email` are the
 * two non-optional fields on the public user contract. Avoids accidentally
 * returning empty envelopes or arbitrary objects.
 *
 * @internal
 */
function isAuthUserLike(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v._id === 'string' && typeof v.email === 'string'
}
