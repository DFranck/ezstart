/**
 * @internal
 *
 * CSRF double-submit support for cookie-authenticated writes (SDK-CSRF-APICALL-001).
 *
 * Mirrors the `cookieWrite` helper of `@ezstart/auth-sdk`: on a state-changing
 * request that is cookie-authenticated (`credentials: 'include'` with NO
 * `Authorization: Bearer` header), the SDK reads the non-httpOnly `csrf-token`
 * cookie and attaches it as an `X-CSRF-Token` request header. This satisfies the
 * server's OWASP double-submit check (`@ezstart/api-core` `createCsrfMiddleware`).
 *
 * Everything here is agnostic — the priming endpoint URL, the cookie name and
 * the header name are all injected via {@link CsrfConfig}. No hardcoded URLs,
 * no `@ezstart/config` / `@ezstart/logger` coupling. SSR-safe: `getToken()`
 * returns `undefined` and `prime()` no-ops when `document` is unavailable.
 *
 * Bearer callers and GET/HEAD requests never touch this path — zero overhead
 * and full backwards-compatibility when no `csrfConfig` is provided (the client
 * builds no manager and {@link isCookieAuthWrite} is never consulted).
 */

import { getHeaderCI, hasHeaderCI } from './request.js'
import { parseApiError, parseApiErrorCode } from '../parse-api-error.js'
import type { CsrfConfig } from '../types.js'

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const DEFAULT_COOKIE_NAME = 'csrf-token'
const DEFAULT_HEADER_NAME = 'X-CSRF-Token'

/**
 * @internal
 *
 * Default heuristic — does a `403` response body look like a CSRF token
 * mismatch (worth re-priming + retrying) rather than a genuine authorization
 * failure? Reuses {@link parseApiError} / {@link parseApiErrorCode} to unwrap
 * every standard envelope shape, then looks for `'csrf'` (case-insensitive) in
 * the message or code. Mirrors `@ezstart/auth-sdk`'s `isCsrfMismatch` and
 * matches the `@ezstart/api-core` server, which emits `'CSRF token mismatch'`
 * (cf. `packages/api-core/src/core/middleware/csrf.ts`).
 */
export function defaultCsrfMismatchMatcher(status: number, body: unknown): boolean {
  if (status !== 403) return false
  const message = parseApiError(body)
  if (message !== null && message.toLowerCase().includes('csrf')) return true
  const code = parseApiErrorCode(body)
  return code !== undefined && code.toLowerCase().includes('csrf')
}

/**
 * @internal
 *
 * `CsrfConfig` with defaults applied.
 */
export type ResolvedCsrfConfig = {
  cookieName: string
  headerName: string
  primeUrl?: string
  mismatchMatcher: (status: number, body: unknown) => boolean
}

/**
 * @internal
 *
 * Stateful CSRF token manager. One instance per client (created by
 * `createApiClient` when `csrfConfig` is set), so the primed flag and the
 * in-flight prime promise are shared across every call of that client.
 */
export interface CsrfManager {
  /** Resolved config (cookie / header names + optional prime URL). */
  readonly config: ResolvedCsrfConfig
  /** Read the current CSRF token from the cookie (`undefined` server-side). */
  getToken(): string | undefined
  /**
   * GET the prime URL so the server sets the `csrf-token` cookie. No-ops when
   * `document` is unavailable (SSR) or when no `primeUrl` is configured.
   * Concurrent calls share a single in-flight promise; never throws.
   */
  prime(): Promise<void>
  /** Discard the primed flag so the next `prime()` re-fetches a fresh token. */
  invalidate(): void
  /**
   * Decide whether a `403` response body is a CSRF mismatch worth re-priming +
   * retrying. Delegates to the configured (or default) matcher.
   */
  isMismatch(status: number, body: unknown): boolean
}

/**
 * @internal
 *
 * Read a cookie value by name from `document.cookie`. Returns `undefined` when
 * the cookie is missing or when running server-side. Uses a leading boundary so
 * prefix-similar names (`csrf-token-other`) do not collide.
 */
function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const raw = document.cookie
  if (!raw) return undefined
  const prefix = `${name}=`
  for (const part of raw.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return undefined
}

/**
 * @internal
 *
 * Build a CSRF manager bound to a {@link CsrfConfig}. State (primed flag +
 * in-flight dedup) is scoped to the closure — each call returns an independent
 * manager.
 */
export function createCsrfManager(config: CsrfConfig): CsrfManager {
  const resolved: ResolvedCsrfConfig = {
    cookieName: config.cookieName ?? DEFAULT_COOKIE_NAME,
    headerName: config.headerName ?? DEFAULT_HEADER_NAME,
    primeUrl: config.primeUrl,
    mismatchMatcher: config.mismatchMatcher ?? defaultCsrfMismatchMatcher,
  }
  let inflight: Promise<void> | null = null
  let primed = false

  return {
    config: resolved,
    getToken: () => readCookie(resolved.cookieName),
    prime(): Promise<void> {
      // SSR or no prime endpoint → nothing to fetch.
      if (typeof document === 'undefined' || !resolved.primeUrl) return Promise.resolve()
      // Fast path: already primed and the cookie is still present.
      if (primed && readCookie(resolved.cookieName)) return Promise.resolve()
      if (inflight) return inflight
      const promise = fetch(resolved.primeUrl, { method: 'GET', credentials: 'include' })
        .then(() => {
          // The server sets the cookie via Set-Cookie; the body is irrelevant.
          primed = true
        })
        .catch(() => {
          // Swallow — the next write either succeeds (cookie was set) or 403s,
          // which triggers invalidate() + a single retry. Never propagate.
        })
        .finally(() => {
          inflight = null
        })
      inflight = promise
      return promise
    },
    invalidate(): void {
      primed = false
      inflight = null
    },
    isMismatch: (status, body) => resolved.mismatchMatcher(status, body),
  }
}

/**
 * @internal
 *
 * Decide whether a request is a cookie-authenticated state-changing write that
 * requires a CSRF token. True only when:
 * - the method mutates state (POST/PUT/PATCH/DELETE), AND
 * - `credentials: 'include'` (cookies travel with the request), AND
 * - no `Authorization: Bearer` header will be attached (Bearer auth is not a
 *   CSRF vector — the browser never sends it automatically).
 */
export function isCookieAuthWrite(params: {
  method: string
  credentials: RequestCredentials
  headers: Record<string, string>
  token: string | null
}): boolean {
  if (!STATE_CHANGING_METHODS.has(params.method.toUpperCase())) return false
  if (params.credentials !== 'include') return false
  const auth = getHeaderCI(params.headers, 'Authorization')
  // Caller-supplied Bearer → Bearer auth, skip CSRF.
  if (auth !== undefined) return !auth.toLowerCase().startsWith('bearer ')
  // No caller Authorization: a resolved token would be attached as Bearer.
  return params.token === null
}

/**
 * @internal
 *
 * Prime the CSRF cookie only if it is currently missing. Cheap no-op when a
 * token already exists.
 */
export async function primeCsrfIfMissing(csrf: CsrfManager): Promise<void> {
  if (!csrf.getToken()) await csrf.prime()
}

/**
 * @internal
 *
 * Return a new headers object with `X-CSRF-Token` attached from the current
 * cookie. Never overwrites a caller-supplied header (case-insensitive) and
 * returns the input unchanged when no token is available (e.g. SSR).
 */
export function attachCsrfHeader(
  csrf: CsrfManager,
  headers: Record<string, string>
): Record<string, string> {
  const token = csrf.getToken()
  if (!token) return headers
  if (hasHeaderCI(headers, csrf.config.headerName)) return headers
  return { ...headers, [csrf.config.headerName]: token }
}
