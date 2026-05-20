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
