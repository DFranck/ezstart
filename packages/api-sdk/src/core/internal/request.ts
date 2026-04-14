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
  /** When provided, add an `Accept` header (unless already set). */
  accept?: string
}

/**
 * @internal
 *
 * Compose fetch headers from user-provided headers + auth token + content
 * negotiation. Preserves caller-supplied values (never overwrites).
 */
export function buildHeaders(
  extra: Record<string, string>,
  token: string | null,
  options: BuildHeadersOptions = {}
): Record<string, string> {
  const final: Record<string, string> = { ...extra }

  if (options.accept && !final['Accept']) {
    final['Accept'] = options.accept
  }

  if (options.json && !final['Content-Type']) {
    final['Content-Type'] = 'application/json'
  }

  if (token) {
    final['Authorization'] = `Bearer ${token}`
  }

  return final
}
