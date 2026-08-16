/**
 * @internal
 *
 * Shared request-building helpers used by `apiCall` and `apiStream`.
 *
 * Centralizes body payload encoding (FormData/URLSearchParams pass-through,
 * string pass-through, JSON stringify) and header composition (auth, accept,
 * content-type).
 */

/**
 * @internal
 *
 * Result of encoding a request body.
 *
 * - `payload`    : actual `BodyInit` to pass to `fetch`, or `undefined`.
 * - `isJsonBody` : true when the body will be JSON-stringified (callers should
 *                  set `Content-Type: application/json`).
 */
export type BuiltBody = {
  payload: BodyInit | undefined
  isJsonBody: boolean
}

/**
 * @internal
 *
 * Encode a body for `fetch`:
 * - `FormData`, `URLSearchParams`, `string` → pass through unchanged.
 * - `undefined` / `null`                    → no body.
 * - Anything else                           → `JSON.stringify`.
 */
export function buildBody(body: unknown): BuiltBody {
  if (body === undefined || body === null) {
    return { payload: undefined, isJsonBody: false }
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const isUrlEncoded = typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams
  const isString = typeof body === 'string'

  if (isFormData || isUrlEncoded) {
    return { payload: body as BodyInit, isJsonBody: false }
  }
  if (isString) {
    return { payload: body, isJsonBody: false }
  }

  return { payload: JSON.stringify(body), isJsonBody: true }
}

/**
 * @internal
 *
 * Options for `buildHeaders`.
 */
export type BuildHeadersOptions = {
  /** When true, add `Content-Type: application/json` (unless already set). */
  json?: boolean
  /**
   * When provided, add an `Accept` header (unless already set).
   *
   * When omitted but `json` is `true`, `Accept` defaults to
   * `application/json` (the SDK parses JSON responses by default — see
   * MED-6 in the Wave C audit).
   */
  accept?: string
}

/**
 * @internal
 *
 * Case-insensitive existence check for an HTTP header name. HTTP headers are
 * case-insensitive per RFC 7230 §3.2, so a caller passing `accept` (lowercase)
 * must shadow a default `Accept` injection — otherwise the request ends up
 * with two header entries that differ only by case, and behavior is
 * browser/runtime-dependent.
 *
 * Exported so other request-building helpers (e.g. the `Idempotency-Key`
 * resolution in `api-call.ts`) can apply the same RFC-compliant dedup rule.
 */
export function hasHeaderCI(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return true
  }
  return false
}

/**
 * @internal
 *
 * Case-insensitive lookup of an HTTP header value. Returns the first matching
 * entry's value, or `undefined` when absent. Companion to {@link hasHeaderCI}
 * for callers that need the value (e.g. detecting `Authorization: Bearer …`).
 */
export function getHeaderCI(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key]
  }
  return undefined
}

/**
 * @internal
 *
 * Resolve the `Idempotency-Key` header value from the per-call
 * `idempotencyKey` option:
 *
 * - `undefined` → no key (no header injected).
 * - `'auto'`    → generate an RFC 4122 v4 UUID via `crypto.randomUUID()`.
 *                  Throws when the runtime lacks `crypto.randomUUID` (very
 *                  old environments — Node < 19 without polyfill, legacy
 *                  browsers without secure context). The error is explicit
 *                  so callers can swap in an explicit UUID instead.
 * - `string`    → returned as-is. The SDK does NOT validate the format —
 *                  `@ezstart/api-core` rejects non-v4 UUIDs with HTTP 400.
 */
export function resolveIdempotencyKey(opt: string | 'auto' | undefined): string | undefined {
  if (opt === undefined) return undefined
  if (opt === 'auto') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    throw new Error(
      "[api-sdk] idempotencyKey: 'auto' requires `crypto.randomUUID()` which is unavailable in this runtime. " +
        'Provide an explicit UUID v4 string instead.'
    )
  }
  return opt
}

/**
 * @internal
 *
 * Compose fetch headers from user-provided headers + auth token + content
 * negotiation. Preserves caller-supplied values (never overwrites), with
 * case-insensitive matching so a caller passing `accept` (lowercase) is
 * honoured and the SDK does not inject a duplicate `Accept` (RFC 7230 §3.2).
 *
 * Defaulting rules:
 * - `Accept`        — set to `options.accept` when provided; otherwise to
 *                     `application/json` when `options.json === true`; never
 *                     overwrites a caller-supplied value (case-insensitive).
 * - `Content-Type`  — set to `application/json` when `options.json === true`;
 *                     never overwrites a caller-supplied value.
 * - `Authorization` — set to `Bearer <token>` when `token` is non-null AND
 *                     the caller did not already supply an `Authorization`
 *                     header (case-insensitive). This protects against a
 *                     silent token store override when a caller explicitly
 *                     forces a different auth header.
 */
export function buildHeaders(
  extra: Record<string, string>,
  token: string | null,
  options: BuildHeadersOptions = {}
): Record<string, string> {
  const final: Record<string, string> = { ...extra }

  // MED-6: default Accept to application/json when sending a JSON body and
  // the caller did not provide an explicit `accept` option — the SDK parses
  // JSON responses by default, so the request should advertise that.
  const accept = options.accept ?? (options.json ? 'application/json' : undefined)
  if (accept && !hasHeaderCI(final, 'Accept')) {
    final['Accept'] = accept
  }

  if (options.json && !hasHeaderCI(final, 'Content-Type')) {
    final['Content-Type'] = 'application/json'
  }

  if (token && !hasHeaderCI(final, 'Authorization')) {
    final['Authorization'] = `Bearer ${token}`
  }

  return final
}
