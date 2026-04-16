import type { QueryParams } from '../types.js'

/**
 * @internal
 *
 * Detect absolute URLs (`http://`, `https://`).
 */
export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * @internal
 *
 * Normalize an endpoint path against a configurable prefix.
 *
 * - Empty `prefix` → endpoint is returned with a leading `/`, no further mangling.
 * - Endpoint already starting with `prefix/` → returned untouched.
 * - Otherwise: `prefix + (endpoint with leading slash)`.
 *
 * Examples (prefix `/api`):
 * - `/api/users` → `/api/users`
 * - `/users`     → `/api/users`
 * - `users`      → `/api/users`
 *
 * Examples (prefix `''`):
 * - `/users`     → `/users`
 * - `users`      → `/users`
 */
export function normalizeEndpoint(endpoint: string, prefix: string): string {
  const withSlash = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  if (prefix.length === 0) return withSlash
  if (withSlash === prefix || withSlash.startsWith(`${prefix}/`)) return withSlash
  return `${prefix}${withSlash}`
}

/**
 * @internal
 *
 * Append query params to a URL (skips `undefined`/`null`).
 */
export function appendQuery(url: string, query?: QueryParams): string {
  if (!query || Object.keys(query).length === 0) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    params.append(key, String(value))
  }
  const qs = params.toString()
  if (qs.length === 0) return url
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`
}

/**
 * @internal
 *
 * Build a fully-qualified URL from a (possibly absolute) endpoint, an optional
 * base URL, a path prefix, and optional query params.
 *
 * - If `endpoint` is absolute (http/https), it is used as-is (no prefix, no base).
 * - Else, requires `baseUrl` to be a non-empty string.
 */
export function buildUrl(
  baseUrl: string | null,
  endpoint: string,
  prefix: string,
  query?: QueryParams
): string {
  if (isAbsoluteUrl(endpoint)) return appendQuery(endpoint, query)

  if (baseUrl === null || baseUrl.length === 0) {
    throw new Error(
      `[api-sdk] No baseUrl resolved and endpoint "${endpoint}" is not absolute. ` +
        `Either configure baseUrl on createApiClient or pass an absolute URL.`
    )
  }

  const normalized = normalizeEndpoint(endpoint, prefix)
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return appendQuery(`${base}${normalized}`, query)
}
