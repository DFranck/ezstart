import { apiCall, apiQuery, ApiError, parseApiError } from '@ezstart/api-sdk'
import type { ApiCallOptions } from '@ezstart/api-sdk'

/**
 * Pre-bound API primitives for ezauth.
 *
 * Consumers should prefer the React Query helpers from `ezauthQuery` when possible
 * (automatic cache, invalidation, infinite scroll). Use `callApi` directly only
 * for imperative calls outside a React component (e.g. inside useMutation).
 */
export { runWithFeedback } from '@ezstart/ui/utils'
export { ApiError, parseApiError }

/** React Query helper bound to the ezauth API. */
export const ezauthQuery = apiQuery('ezauth')

/**
 * Imperative ezauth call — equivalent to `apiCall(endpoint, { appName: 'ezauth', ... })`.
 * Use inside `useMutation` / event handlers where React Query helpers are not ergonomic.
 */
export function callApi<T = unknown>(
  endpoint: string,
  options: Omit<ApiCallOptions, 'appName'> = {}
): Promise<T> {
  return apiCall<T>(endpoint, { ...options, appName: 'ezauth' })
}
