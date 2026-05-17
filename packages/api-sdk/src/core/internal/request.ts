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
 */
function hasHeaderCI(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return true
  }
  return false
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
