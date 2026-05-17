import { createApiCall } from './api-call.js'
import { resolveConfig, type ResolvedConfig } from './internal/config.js'
import { createRefreshHelper, type RefreshHelper } from './internal/refresh.js'
import { createApiQuery } from '../react/react-query.js'
import { createApiStream } from './stream.js'
import type { ApiCallOptions, ApiClientConfig, StreamCallbacks } from './types.js'

/**
 * Public surface of an API client built with `createApiClient`.
 */
export type ApiClient = {
  /** Perform a JSON HTTP call. */
  apiCall: <T = unknown>(endpoint: string, options?: ApiCallOptions) => Promise<T>
  /** Stream a Server-Sent Events response. */
  apiStream: (endpoint: string, options: ApiCallOptions & StreamCallbacks) => Promise<void>
  /** Build a React Query namespace bound to a (string) `appName`. */
  apiQuery: ReturnType<typeof createApiQuery>
  /** Resolved configuration (read-only). */
  readonly config: ResolvedConfig
  /**
   * Internal: reset the in-flight refresh promise. Exposed for tests.
   *
   * @internal
   */
  __resetRefresh(): void
}

/**
 * Build an HTTP client tailored to a project.
 *
 * The returned client exposes three bound primitives — `apiCall`, `apiStream`
 * and `apiQuery` — that share the same configuration (base URL resolver, token
 * store, refresh policy, envelope handling, logger).
 *
 * @example
 * ```ts
 * const client = createApiClient({
 *   baseUrl: 'https://api.example.com',
 *   tokenStore: {
 *     getAccessToken: () => localStorage.getItem('token'),
 *   },
 *   envelope: { unwrap: false, throwOnFailureEnvelope: false },
 * })
 *
 * const user = await client.apiCall<User>('/users/me')
 * ```
 */
export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const resolved = resolveConfig(config)
  const refreshHelper: RefreshHelper = createRefreshHelper(resolved.refresh, resolved.tokenStore, {
    credentials: resolved.credentials,
    logger: resolved.logger,
  })

  const apiCall = createApiCall(resolved, refreshHelper)
  const apiStream = createApiStream(resolved, refreshHelper)
  const apiQuery = createApiQuery(apiCall)

  return {
    apiCall,
    apiStream,
    apiQuery,
    config: resolved,
    __resetRefresh(): void {
      refreshHelper.reset()
    },
  }
}
