import { ApiError } from '../api-error.js'
import type { ResolvedConfig } from './config.js'
import type { RefreshHelper } from './refresh.js'

/**
 * @internal
 *
 * Options for `fetchWithRetry`. The caller provides a `buildInit` factory so
 * that both `apiCall` and `apiStream` can supply their own RequestInit builder.
 */
export type FetchWithRetryOptions = {
  url: string
  method: string
  buildInit: (token: string | null) => RequestInit
  token: string | null
  skipRefresh: boolean
  skipAuth: boolean
  resolved: ResolvedConfig
  refreshHelper: RefreshHelper
  /** Label used in log messages (e.g. "apiCall", "apiStream"). */
  tag: string
}

/**
 * @internal
 *
 * Execute a fetch. On a 401 eligible for refresh, refresh the token
 * (single-flight) and retry once. Returns the final `Response`.
 */
export async function fetchWithRetry(opts: FetchWithRetryOptions): Promise<Response> {
  const { url, method, buildInit, token, resolved, refreshHelper, tag } = opts

  let res = await safeFetch(url, buildInit(token), resolved, method, tag)

  if (canAutoRefresh(res.status, opts)) {
    const newToken = await refreshHelper.refresh()
    if (newToken) {
      resolved.logger.debug(`[${tag}] Token refreshed, retrying request`, { url, method })
      res = await safeFetch(url, buildInit(newToken), resolved, method, tag)
    }
  }

  return res
}

/**
 * @internal
 *
 * Wrap `fetch` with a network-error catch that throws a typed `ApiError`.
 */
async function safeFetch(
  url: string,
  init: RequestInit,
  resolved: ResolvedConfig,
  method: string,
  tag: string
): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network request failed'
    resolved.logger.warn(`[${tag}] Network error`, { url, method, error: message })
    throw new ApiError(message, { status: 0, code: 'NETWORK_ERROR' })
  }
}

/**
 * @internal
 *
 * Determine whether the response is eligible for an automatic token refresh.
 */
function canAutoRefresh(status: number, opts: FetchWithRetryOptions): boolean {
  return (
    status === 401 &&
    !opts.skipRefresh &&
    !opts.skipAuth &&
    opts.token !== null &&
    Boolean(opts.resolved.refresh) &&
    Boolean(opts.resolved.tokenStore?.getRefreshToken)
  )
}
