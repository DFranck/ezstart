/**
 * @ezstart/api-sdk
 *
 * Unified HTTP client.
 *
 * Two consumption paths:
 *
 * 1. **Monorepo consumers** — import the bound primitives directly. They are
 *    pre-configured for @ezstart (URL resolution, token store, refresh).
 *
 *    ```ts
 *    import { apiCall, apiQuery } from '@ezstart/api-sdk'
 *    const user = await apiCall<User>('/me', { appName: 'myapp' })
 *    ```
 *
 * 2. **External projects** — build your own client via the agnostic factory.
 *
 *    ```ts
 *    import { createApiClient } from '@ezstart/api-sdk'
 *    const client = createApiClient({
 *      baseUrl: 'https://api.example.com',
 *      tokenStore: { getAccessToken: () => localStorage.getItem('token') },
 *    })
 *    ```
 *
 * Features:
 * - Throws typed `ApiError` instead of returning `{ ok: false }`.
 * - Automatically parses error bodies via `parseApiError`.
 * - Optionally unwraps `{ success, data, meta }` envelopes.
 * - Handles refresh-on-401 (single-flight, one retry) when configured.
 * - React Query helpers and SSE stream support share the same configuration.
 * - `fetchExternal` provides an explicit escape hatch for 3rd-party APIs.
 */

import { ApiError } from './core/api-error.js'
import { parseApiError, parseApiErrorCode } from './core/parse-api-error.js'

// ---------------------------------------------------------------------------
// Core — framework-agnostic primitives
// ---------------------------------------------------------------------------
export { createApiCall } from './core/api-call.js'
export { ApiError } from './core/api-error.js'
export { createApiClient } from './core/create-client.js'
export type { ApiClient } from './core/create-client.js'
export { parseApiError, parseApiErrorCode, parseRetryAfter } from './core/parse-api-error.js'
export { createApiStream } from './core/stream.js'
export type {
  ApiCallOptions,
  ApiClientConfig,
  ApiErrorPayload,
  ApiMeta,
  BaseUrlResolver,
  ClientLogger,
  EnvelopeConfig,
  HttpMethod,
  QueryParams,
  QueryValue,
  RefreshConfig,
  ResponseType,
  StreamCallbacks,
  TokenStore,
} from './core/types.js'

// ---------------------------------------------------------------------------
// React — React Query hooks + types (requires @tanstack/react-query peer dep)
// ---------------------------------------------------------------------------
export { createApiQuery, type BoundApiCall } from './react/react-query.js'
export type {
  PaginatedResponse,
  UseApiInfiniteQueryOptions,
  UseApiMutationOptions,
  UseApiQueryOptions,
} from './react/react-query.js'

// Public maintenance status hook (platform-wide, no auth required).
// Pairs with `<MaintenanceBanner>` from `@ezstart/ui/components`.
export { useMaintenanceStatus } from './react/use-maintenance-status.js'
export type {
  MaintenanceStatus,
  UseMaintenanceStatusOptions,
} from './react/use-maintenance-status.js'

// ---------------------------------------------------------------------------
// Pre-configured @ezstart client (main consumption path for monorepo)
// ---------------------------------------------------------------------------
export {
  apiCall,
  apiStream,
  apiQuery,
  ezstartClient,
  __resetRefreshPromiseForTests,
} from './ezstart-client.js'

// ---------------------------------------------------------------------------
// Wire contracts re-exports (@ezstart/api-contracts — source of truth).
// ---------------------------------------------------------------------------
// Re-exposed here so SDK consumers have a single import site for both the
// transport (SDK) and the wire shape (contracts). Importing the same symbols
// directly from `@ezstart/api-contracts` is equivalent.

export type {
  ApiResponse,
  ErrorPayload,
  ErrorResponse,
  PaginationMeta,
  PaginationQuery,
  SuccessResponse,
} from '@ezstart/api-contracts'
export {
  ErrorCode,
  isErrorResponse,
  isSuccessResponse,
  PaginationQuerySchema,
} from '@ezstart/api-contracts'

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
