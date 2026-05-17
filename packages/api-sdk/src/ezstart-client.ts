/**
 * Pre-configured API client for the @ezstart monorepo.
 *
 * Wires the agnostic `createApiClient` factory with monorepo-specific
 * concerns:
 * - Base URL resolution via `@ezstart/config` (`getApiUrl(appName)`).
 * - Access/refresh token persistence in `localStorage['ezauth-storage']`
 *   (the Zustand store key used by `@ezstart/auth-sdk`).
 * - Refresh endpoint pointing at the EZAuth API.
 * - Logging through `@ezstart/logger`.
 *
 * Consumers in the monorepo should import `apiCall` / `apiStream` /
 * `apiQuery` from `@ezstart/api-sdk` directly — they map to this client.
 */

import { getApiUrl, type AppName } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger'
import { createApiClient } from './core/create-client.js'
import type { ApiCallOptions, StreamCallbacks } from './core/types.js'

const STORAGE_KEY = 'ezauth-storage'

// ---------------------------------------------------------------------------
// Deprecation runtime warnings (cf. standard-ui.md §10 + standard-sdk-dx §10)
// ---------------------------------------------------------------------------
// The monorepo wrapper (`apiCall` / `apiQuery` / `apiStream`) is deprecated in
// favour of the agnostic `createApiClient` factory from `@ezstart/api-sdk/core`.
// It is preserved for backwards-compat with the 75+ monorepo files that still
// import it; deletion + Provider-DI migration is tracked as Wave D. Until then,
// every consumer call surfaces a one-time-per-session warn so we measure usage
// before pulling the trigger.

// Module-level dedup set — each deprecated export warns ONE TIME per session.
const _warnedDeprecations = new Set<string>()

/**
 * Emit a deprecation warning for a wrapper export, once per session.
 * Goes through `@ezstart/logger` (the wrapper's existing dep) so the
 * warning is consistent with the SDK's logging surface.
 *
 * @internal
 */
function _warnWrapperDeprecation(exportName: string, replacement: string): void {
  if (_warnedDeprecations.has(exportName)) return
  _warnedDeprecations.add(exportName)
  try {
    logger.warn(
      `[api-sdk] '${exportName}' from '@ezstart/api-sdk' is deprecated. ` +
        `Use ${replacement} instead. The legacy wrapper will be removed in a future major. ` +
        `See https://github.com/DFranck/ezstart/tree/master/packages/api-sdk#migration`
    )
  } catch {
    // logger.warn must never throw — defensive (cf. standard-sdk-dx §11bis.2)
  }
}

type StoredState = {
  accessToken?: string
  refreshToken?: string
}

function readStoredState(): StoredState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: unknown } | null
    if (!parsed || typeof parsed !== 'object') return null
    const state = (parsed as { state?: unknown }).state
    if (!state || typeof state !== 'object') return null
    return state as StoredState
  } catch {
    return null
  }
}

function getAccessToken(): string | null {
  const state = readStoredState()
  const t = state?.accessToken
  return typeof t === 'string' && t.length > 0 ? t : null
}

function getRefreshToken(): string | null {
  const state = readStoredState()
  const t = state?.refreshToken
  return typeof t === 'string' && t.length > 0 ? t : null
}

function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } | null
    if (parsed && parsed.state && typeof parsed.state === 'object') {
      parsed.state.accessToken = tokens.accessToken
      parsed.state.refreshToken = tokens.refreshToken
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    }
  } catch {
    // best-effort persistence
  }
}

/**
 * The pre-configured @ezstart API client.
 *
 * @deprecated The `ezstartClient` instance name is preserved for backwards
 * compatibility — but new code should call `createApiClient(...)` directly
 * from `@ezstart/api-sdk/core` and pass an explicit `baseUrl`. The brand-named
 * singleton will be removed in v1.0.0 in favour of consumer-controlled clients.
 */
export const ezstartClient = createApiClient({
  baseUrl: appName => getApiUrl((appName ?? 'ezstart') as AppName),
  tokenStore: {
    getAccessToken,
    getRefreshToken,
    setTokens,
  },
  refresh: {
    endpoint: `${getApiUrl('ezauth')}/api/auth/refresh`,
  },
  envelope: { unwrap: true, throwOnFailureEnvelope: true },
  pathPrefix: '/api',
  credentials: 'include',
  logger,
})

/**
 * Bound `apiCall` that routes through the @ezstart configuration.
 *
 * @deprecated Use `createApiClient({ baseUrl, ... }).apiCall` from
 * `@ezstart/api-sdk/core` (or the root entry) instead. This wrapper requires
 * the monorepo-only `@ezstart/config` + `@ezstart/logger` peer dependencies
 * and will be removed once the Provider-DI refactor lands. Consumer code
 * outside the monorepo should never reach this export — install
 * `@ezstart/api-sdk` + `@ezstart/api-contracts` only and build your own
 * client.
 */
export function apiCall<T = unknown>(endpoint: string, options?: ApiCallOptions): Promise<T> {
  _warnWrapperDeprecation('apiCall', 'createApiClient(...).apiCall')
  return ezstartClient.apiCall<T>(endpoint, options)
}

/**
 * Bound `apiStream` that routes through the @ezstart configuration.
 *
 * @deprecated Use `createApiClient({ baseUrl, ... }).apiStream` from
 * `@ezstart/api-sdk/core` (or the root entry) instead. Same removal plan as
 * {@link apiCall}.
 */
export function apiStream(
  endpoint: string,
  options: ApiCallOptions & StreamCallbacks
): Promise<void> {
  _warnWrapperDeprecation('apiStream', 'createApiClient(...).apiStream')
  return ezstartClient.apiStream(endpoint, options)
}

/**
 * Bound `apiQuery(appName)` that routes through the @ezstart configuration.
 *
 * @deprecated Use `createApiClient({ baseUrl, ... }).apiQuery` from
 * `@ezstart/api-sdk/core` (or the root entry) instead. Same removal plan as
 * {@link apiCall}.
 */
export function apiQuery(
  appName: Parameters<typeof ezstartClient.apiQuery>[0]
): ReturnType<typeof ezstartClient.apiQuery> {
  _warnWrapperDeprecation('apiQuery', 'createApiClient(...).apiQuery')
  return ezstartClient.apiQuery(appName)
}

/**
 * Reset the module-level refresh inflight promise (test-only).
 *
 * @deprecated Use the new factory pattern: `const client = createApiClient(...)`
 * then `client.refreshHelper.reset()` (or whatever the public surface
 * exposes — see {@link RefreshHelper.reset} in `core/internal/refresh.ts`).
 * This legacy helper exists only for backwards-compatibility with tests
 * that still target the deprecated `ezstart-client.ts` wrapper, which
 * is scheduled for removal in Wave C Lot 3.
 *
 * @internal
 */
export function __resetRefreshPromiseForTests(): void {
  ezstartClient.__resetRefresh()
}
