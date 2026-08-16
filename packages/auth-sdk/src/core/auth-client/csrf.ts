/**
 * CSRF token helper — fetches + caches the double-submit CSRF token used by
 * cookie-auth state-changing requests.
 *
 * The server (`@ezstart/api-core` `createCsrfMiddleware`) implements the OWASP
 * double-submit pattern: a non-httpOnly `csrf-token` cookie is paired with an
 * `X-CSRF-Token` request header. The CSRF cookie is set by
 * `GET /api/auth/login-cookie/csrf` (idempotent priming endpoint). This helper:
 *
 *  1. Primes the CSRF cookie on demand (`prime()`).
 *  2. Reads the current token from `document.cookie` cheaply (`getToken()`).
 *  3. De-duplicates concurrent prime calls (in-flight promise sharing).
 *  4. Invalidates the cache on 403 so a stale token triggers a re-prime
 *     instead of looping (`invalidate()`).
 *  5. Stays SSR-safe — `getToken()` returns `undefined` when `document` is
 *     unavailable, and `prime()` no-ops server-side.
 *
 * Phase 1 of SDK-CSRF-TOKEN-ALWAYS-001 — server-side middleware lives in
 * `apps/ezauth/api/src/middleware/csrf.ts` and the priming endpoint in
 * `apps/ezauth/api/src/routes/auth/login-cookie.ts`.
 *
 * @internal — composed by `CoreAuthClient`, not exported from the package.
 */

const CSRF_COOKIE_NAME = 'csrf-token'

/**
 * Subset of {@link ClientContext} the CSRF helper consumes. Kept minimal so
 * the helper does not pull the full context type and so that tests can
 * construct a tiny stub without faking the whole client surface.
 *
 * @internal
 */
export interface CsrfHelperContext {
  /** Current auth API base URL (e.g. `https://api.example.com/api/auth`). */
  readonly apiUrl: string
  /** Build base headers, injecting `X-API-Key` when an API key is configured. */
  baseHeaders(extra?: Record<string, string>): Record<string, string>
}

/**
 * Helper API returned by {@link createCsrfHelper}.
 *
 * @internal
 */
export interface CsrfHelper {
  /**
   * Fetch the CSRF token from the priming endpoint, setting the
   * non-httpOnly cookie that the server will subsequently validate against
   * the `X-CSRF-Token` header on writes.
   *
   * Concurrent calls share a single in-flight promise so a `<AuthProvider>`
   * mount + a parallel write both trigger only one network round-trip.
   *
   * No-op when `document` is unavailable (SSR).
   */
  prime(): Promise<void>
  /**
   * Read the current CSRF token from the `csrf-token` cookie. Returns
   * `undefined` when no cookie is set (caller should call `prime()` first)
   * or when running server-side.
   */
  getToken(): string | undefined
  /**
   * Discard the cached token (in-flight promise + memoized value). Called
   * after a 403 response so the next attempt re-fetches a fresh token
   * instead of looping forever on a stale one.
   */
  invalidate(): void
}

/**
 * Read a cookie value by name from `document.cookie`. Returns `undefined`
 * when the cookie is missing or when running server-side.
 */
function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const raw = document.cookie
  if (!raw) return undefined
  // `document.cookie` is `"k1=v1; k2=v2; ..."`. Match the named cookie with
  // a leading boundary so prefix-similar names (`csrf-token-other`) don't
  // collide. Decode percent-encoded values (the cookie payload is hex so
  // this is a defensive no-op for our specific format).
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
 * Build a CSRF helper bound to a {@link CsrfHelperContext}. The helper is
 * stateful (in-flight dedup + cached primed flag) but the state is scoped to
 * the closure — every `createCsrfHelper(ctx)` returns an independent helper.
 *
 * @internal
 */
export function createCsrfHelper(ctx: CsrfHelperContext): CsrfHelper {
  let inflight: Promise<void> | null = null
  let primed = false

  return {
    prime(): Promise<void> {
      // SSR: nothing to set, return immediately. Callers must re-prime
      // client-side on mount via the lifecycle hook.
      if (typeof document === 'undefined') return Promise.resolve()
      // Already-resolved + cookie still present → skip the round-trip. This
      // is a fast path; on 403 the caller invalidates and we re-fetch.
      if (primed && readCookie(CSRF_COOKIE_NAME)) return Promise.resolve()
      if (inflight) return inflight

      const promise = fetch(`${ctx.apiUrl}/login-cookie/csrf`, {
        method: 'GET',
        headers: ctx.baseHeaders(),
        credentials: 'include',
      })
        .then(() => {
          // Server sets the cookie via Set-Cookie; we don't need the body.
          primed = true
        })
        .catch(() => {
          // Swallow — caller's next write will either succeed (cookie was
          // actually set) or 403, which triggers `invalidate()` + retry.
          // Throwing here would propagate into every cookie-auth write.
        })
        .finally(() => {
          inflight = null
        })
      inflight = promise
      return promise
    },
    getToken(): string | undefined {
      return readCookie(CSRF_COOKIE_NAME)
    },
    invalidate(): void {
      primed = false
      inflight = null
    },
  }
}
