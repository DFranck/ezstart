/**
 * Shared client context + response helpers for the auth client method groups.
 *
 * The `CoreAuthClient` class (in `../auth-client.ts`) owns the mutable config
 * (apiUrl / appName / redirectUri / apiKey) and exposes it to the
 * domain-grouped method modules (`./methods/*.ts`) through a {@link ClientContext}.
 * This keeps each method group small and side-effect free while preserving the
 * exact public surface of the class.
 *
 * @internal — not part of the package's public API surface.
 */

/**
 * Options for {@link ClientContext.cookieWrite} — mirrors the subset of
 * `RequestInit` cookie-auth writes need (method, body, optional extra
 * headers, optional AbortSignal).
 *
 * @internal
 */
export interface CookieWriteInit {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: BodyInit | null
  /** Extra headers merged on top of `baseHeaders()` + the auto-injected CSRF + content-type. */
  headers?: Record<string, string>
  /** Optional AbortSignal forwarded to `fetch`. */
  signal?: AbortSignal
  /**
   * Optional override of the default `Content-Type: application/json`.
   * Pass `null` to omit the header entirely (e.g. for multipart form-data
   * where the browser sets the boundary itself).
   */
  contentType?: string | null
}

/**
 * Mutable client context shared by every method group. Backed by the
 * `CoreAuthClient` instance so that `setApiUrl` / `setAppName` /
 * `setRedirectUri` mutations are observed live by in-flight method calls.
 *
 * @internal
 */
export interface ClientContext {
  /** Current auth API base URL (e.g. `https://api.example.com/api/auth`). */
  readonly apiUrl: string
  /** Current app name sent in auth requests. */
  readonly appName: string
  /** Current OAuth redirect URI, if configured. */
  readonly redirectUri: string | undefined
  /** Build base headers, injecting `X-API-Key` when an API key is configured. */
  baseHeaders(extra?: Record<string, string>): Record<string, string>
  /**
   * Prime the CSRF cookie via `GET /login-cookie/csrf`. Called by the
   * `useCsrfPrime` lifecycle hook on Provider mount + after refresh, and
   * implicitly by {@link ClientContext.cookieWrite} when no token is cached.
   *
   * SSR-safe (no-op when `document` is unavailable).
   */
  primeCsrf(): Promise<void>
  /**
   * Get the cached CSRF token, primed cookie value. Returns `undefined`
   * when not yet primed or when running server-side.
   */
  getCsrfToken(): string | undefined
  /**
   * Discard the cached CSRF state. Called automatically by
   * {@link ClientContext.cookieWrite} on a 403 mismatch so the retry uses
   * a freshly minted token.
   */
  invalidateCsrfToken(): void
  /**
   * Centralized helper for cookie-auth state-changing writes (POST / PUT /
   * PATCH / DELETE that rely on the `ezauth_token` httpOnly cookie rather
   * than `Authorization: Bearer`).
   *
   * Behavior:
   *  - Sets `credentials: 'include'` so cookies travel cross-origin.
   *  - Injects `X-CSRF-Token` from the cached cookie (priming on miss).
   *  - Defaults `Content-Type: application/json` unless overridden.
   *  - On `403` with a CSRF mismatch message, invalidates the cache,
   *    re-primes, and retries ONCE. Subsequent 403s propagate to the caller.
   *
   * Bearer-auth writes do NOT need this helper — when the caller passes
   * `Authorization: Bearer …` in `extra`, the server's `verifyCookieCsrf`
   * middleware short-circuits and skips the double-submit check.
   */
  cookieWrite(path: string, init: CookieWriteInit): Promise<Response>
}

/**
 * Unwrap API envelope `{ data: T }` → `T`, or return the flat response.
 *
 * The wire shape is `Record<string, unknown>` because we receive raw JSON,
 * but the caller has already typed the expected payload via the generic.
 * `Record<string, unknown>` and a typed object overlap structurally, so we
 * cast through the generic itself rather than the unsafe `unknown` bridge.
 *
 * @internal
 */
export function unwrapEnvelope<T>(body: Record<string, unknown>): T {
  if ('data' in body && body.data !== undefined) {
    return body.data as T
  }
  return body as T
}

/**
 * Parse an error from a response body.
 *
 * @internal
 */
export function parseError(body: Record<string, unknown>, fallback: string): string {
  // Handle structured envelope: { error: { message: "..." } }
  if (body.error && typeof body.error === 'object') {
    const errObj = body.error as Record<string, unknown>
    if (typeof errObj.message === 'string') return errObj.message
  }
  // Handle flat error string: { error: "..." }
  if (typeof body.error === 'string') return body.error
  // Handle nested data.error
  if (typeof (body.data as Record<string, unknown>)?.error === 'string') {
    return (body.data as Record<string, unknown>).error as string
  }
  // Handle top-level message
  if (typeof body.message === 'string') return body.message
  return fallback
}

/**
 * Extract the machine-readable error `code` from a response body, when the
 * API returns the structured envelope `{ error: { message, code } }` (the
 * `@ezstart/api-core` `sendError()` shape, also used by the SDK's own
 * `requireEmailVerified` server gate). Falls back to a top-level `code`.
 *
 * Returns `undefined` when no code is present so callers can pass it straight
 * to `new AuthError(message, status, parseErrorCode(...))` — a code-less
 * `AuthError` keeps its existing behaviour.
 *
 * Surfacing the code lets consumers `switch` on it (e.g.
 * `isEmailVerificationRequiredError(err)`) instead of brittle message
 * string-matching. cf. standard-sdk-dx.md §4 (error codes standardized).
 *
 * @internal
 */
export function parseErrorCode(body: Record<string, unknown>): string | undefined {
  // Structured envelope: { error: { message, code } }
  if (body.error && typeof body.error === 'object') {
    const errObj = body.error as Record<string, unknown>
    if (typeof errObj.code === 'string') return errObj.code
  }
  // Top-level code: { success: false, code: "..." }
  if (typeof body.code === 'string') return body.code
  return undefined
}

/**
 * Heuristic — does a 403 response body look like a CSRF mismatch? The
 * `@ezstart/api-core` `createCsrfMiddleware` emits `'CSRF token mismatch'`
 * verbatim (cf. `packages/api-core/src/core/middleware/csrf.ts`). Match on
 * the substring so future tweaks to the message wording stay compatible.
 *
 * @internal
 */
export function isCsrfMismatch(status: number, body: Record<string, unknown>): boolean {
  if (status !== 403) return false
  const message = parseError(body, '').toLowerCase()
  return message.includes('csrf')
}
