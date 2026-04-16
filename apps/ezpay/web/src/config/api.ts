import { apiCall, apiQuery, ApiError, parseApiError } from '@ezstart/api-sdk'
import type { ApiCallOptions } from '@ezstart/api-sdk'

/**
 * Pre-bound API primitives for ezpay.
 *
 * Consumers should prefer the React Query helpers from `payQuery` when possible
 * (automatic cache, invalidation). Use `callApi` directly only for imperative
 * calls outside a React component (e.g. inside useMutation).
 */
export { ApiError, parseApiError }

/** React Query helper bound to the ezpay API. */
export const payQuery = apiQuery('ezpay')

/**
 * Imperative ezpay call — equivalent to `apiCall(endpoint, { appName: 'ezpay', ... })`.
 * Use inside `useMutation` / event handlers where React Query helpers are not ergonomic.
 */
export function callApi<T = unknown>(
  endpoint: string,
  options: Omit<ApiCallOptions, 'appName'> = {}
): Promise<T> {
  return apiCall<T>(endpoint, { ...options, appName: 'ezpay' })
}
