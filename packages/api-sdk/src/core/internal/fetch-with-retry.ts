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
 * Default user-facing message returned when the network is unreachable
 * (server crashed, DNS failed, offline, CORS preflight blocked, etc.).
 *
 * Replaces the unhelpful raw browser strings such as `"Failed to fetch"`
 * (Chromium / Safari) or `"NetworkError when attempting to fetch resource"`
 * (Firefox) which surface verbatim into form `setError` calls otherwise.
 */
const NETWORK_UNAVAILABLE_MESSAGE =
  'Service unavailable. Please check your connection and try again.'

/**
 * @internal
 *
 * Detect the browser-native "fetch could not reach the server" error.
 *
 * Cross-engine signals:
 * - Chromium / Safari : `TypeError` with message `"Failed to fetch"`.
 * - Firefox           : `TypeError` with message `"NetworkError when ..."`.
 * - Node 18+ undici   : `TypeError` with `cause.code` in
 *   `{ 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET',
 *     'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT' }`.
 */
function isNetworkUnavailable(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false

  const message = err.message
  if (
    message === 'Failed to fetch' ||
    message === 'Load failed' ||
    message.startsWith('NetworkError') ||
    message.includes('fetch failed')
  ) {
    return true
  }

  const cause = (err as { cause?: { code?: unknown } }).cause
  const code = cause && typeof cause === 'object' ? cause.code : undefined
  if (typeof code === 'string') {
    return (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      code === 'ECONNRESET' ||
      code === 'UND_ERR_SOCKET' ||
      code === 'UND_ERR_CONNECT_TIMEOUT' ||
      code === 'NETWORK_ERROR'
    )
  }

  return false
}

/**
 * @internal
 *
 * Wrap `fetch` with a network-error catch that throws a typed `ApiError`.
 *
 * Two error codes are emitted depending on the failure shape:
 * - `NETWORK_UNAVAILABLE` — the server could not be reached at all
 *   (offline, DNS down, CORS preflight blocked, server crashed). Carries
 *   a stable, user-facing English message so consumers can switch on
 *   `err.code` to translate, while non-i18n callers still display
 *   something actionable instead of `"Failed to fetch"`.
 * - `NETWORK_ERROR` — every other fetch-time exception (typically
 *   `AbortError` from a cancelled `AbortSignal`). The original
 *   `err.message` is preserved.
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
    if (isNetworkUnavailable(err)) {
      const rawMessage = err instanceof Error ? err.message : 'Failed to fetch'
      resolved.logger.warn(`[${tag}] Service unreachable`, {
        url,
        method,
        error: rawMessage,
      })
      throw new ApiError(NETWORK_UNAVAILABLE_MESSAGE, {
        status: 0,
        code: 'NETWORK_UNAVAILABLE',
      })
    }

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
