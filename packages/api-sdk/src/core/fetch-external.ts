/**
 * @ezstart/api-sdk/core — fetchExternal
 *
 * Explicit escape hatch for calling third-party HTTP APIs (GitHub, npm,
 * HaveIBeenPwned, etc.). Lives in `core/` so server-side consumers can import
 * it from `@ezstart/api-sdk/core` WITHOUT pulling the root entry point, which
 * statically re-exports React Query (a `react`/`@tanstack/react-query` peer
 * dep). Importing from the root in a server context risks
 * `ERR_MODULE_NOT_FOUND` on a `--frozen-lockfile` install that omits the
 * React peers (e.g. an API service on Railway).
 *
 * Depends only on the framework-agnostic primitives already in `core/`
 * (`ApiError`, `parseApiError`, `parseApiErrorCode`) — zero React.
 */

import { ApiError } from './api-error.js'
import { parseApiError, parseApiErrorCode } from './parse-api-error.js'

/**
 * Explicit helper for calling third-party HTTP APIs (GitHub, npm, etc.).
 *
 * Unlike `apiCall`:
 * - does NOT inject auth tokens,
 * - does NOT resolve URLs via `@ezstart/config`,
 * - does NOT unwrap `{ success, data }` envelopes.
 *
 * It is the supported alternative to raw `fetch()` — a future lint rule
 * will forbid raw `fetch` outside `packages/api-sdk` to prevent bypass.
 *
 * @throws {ApiError} on non-2xx responses or network failures.
 *
 * @example
 * ```ts
 * import { fetchExternal } from '@ezstart/api-sdk/core'
 *
 * const repo = await fetchExternal<GitHubRepo>('https://api.github.com/repos/vercel/next.js')
 * ```
 */
export async function fetchExternal<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network request failed'
    throw new ApiError(message, { status: 0, code: 'NETWORK_ERROR' })
  }

  const text = await res.text()
  let parsed: unknown = null
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  if (!res.ok) {
    const message = parseApiError(parsed) ?? `External request failed with status ${res.status}`
    throw new ApiError(message, {
      status: res.status,
      code: parseApiErrorCode(parsed),
      data: parsed,
    })
  }

  return parsed as T
}
