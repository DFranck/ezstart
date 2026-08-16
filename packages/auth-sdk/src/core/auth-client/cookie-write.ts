/**
 * `cookieWrite` — centralized cookie-auth write helper used by every
 * state-changing method that relies on the `ezauth_token` httpOnly cookie
 * (logout, refresh, profile, account, oauth-disconnect, etc.).
 *
 * Responsibilities:
 *  - Set `credentials: 'include'` so the cookie travels cross-origin.
 *  - Default `Content-Type: application/json` unless overridden.
 *  - Inject the double-submit `X-CSRF-Token` header (priming the cookie on
 *    cache miss). Phase 1 of SDK-CSRF-TOKEN-ALWAYS-001.
 *  - Retry ONCE on a CSRF mismatch 403 (invalidate cache + re-prime).
 *
 * Bearer-auth callers pass `Authorization: Bearer …` in `init.headers` —
 * the server's `verifyCookieCsrf` middleware short-circuits on Bearer auth,
 * so the (still-attached) CSRF header is harmless overhead.
 *
 * Extracted from `auth-client.ts` to keep that file under the 400-line
 * limit (cf. `standard.md` §3).
 *
 * @internal — composed by `CoreAuthClient`, not exported from the package.
 */

import { type CookieWriteInit, isCsrfMismatch } from './context.js'
import type { CsrfHelper } from './csrf.js'

/**
 * Subset of {@link CoreAuthClient} the helper needs — passed in instead of
 * the class itself so tests can construct a tiny stub.
 *
 * @internal
 */
export interface CookieWriteDeps {
  /** Current API base URL (live getter — observe `setApiUrl` mutations). */
  readonly apiUrl: string
  /** Build the base headers (already injects `X-API-Key` when configured). */
  baseHeaders(extra?: Record<string, string>): Record<string, string>
  /** CSRF token helper (cache + prime + invalidate). */
  csrf: CsrfHelper
}

/**
 * Run a cookie-auth state-changing write. See module docblock for the full
 * behaviour contract.
 *
 * @internal
 */
export async function cookieWrite(
  deps: CookieWriteDeps,
  path: string,
  init: CookieWriteInit
): Promise<Response> {
  const url = `${deps.apiUrl}${path}`

  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {}
    // Default Content-Type unless overridden (pass `null` to omit).
    if (init.contentType === undefined) {
      headers['Content-Type'] = 'application/json'
    } else if (init.contentType !== null) {
      headers['Content-Type'] = init.contentType
    }
    const token = deps.csrf.getToken()
    if (token) {
      headers['X-CSRF-Token'] = token
    }
    Object.assign(headers, init.headers ?? {})
    return deps.baseHeaders(headers)
  }

  // Prime on first use if we don't yet have a token. Awaited synchronously
  // because the server enforces the double-submit check on every write —
  // sending an empty header would race the cookie set and produce a 403.
  if (!deps.csrf.getToken()) {
    await deps.csrf.prime()
  }

  const doFetch = (): Promise<Response> =>
    fetch(url, {
      method: init.method,
      headers: buildHeaders(),
      credentials: 'include',
      body: init.body ?? null,
      signal: init.signal,
    })

  const first = await doFetch()
  if (first.status !== 403) return first

  // Peek at the body to confirm this is a CSRF mismatch, then retry once
  // with a fresh token. We clone the response so the caller still gets a
  // readable body when the retry also fails. Skip the peek (and the retry)
  // when the Response shim has no `clone` — that's the case in unit-test
  // stubs that return a 403 for an unrelated reason (email verification,
  // etc.), and reading the original body would lock it before the caller
  // reaches `await response.json()`.
  if (typeof first.clone !== 'function') return first
  const cloned = first.clone()
  let body: Record<string, unknown> = {}
  try {
    body = (await cloned.json()) as Record<string, unknown>
  } catch {
    // Non-JSON body → not a CSRF response, propagate as-is.
    return first
  }
  if (!isCsrfMismatch(first.status, body)) return first

  deps.csrf.invalidate()
  await deps.csrf.prime()
  return doFetch()
}
