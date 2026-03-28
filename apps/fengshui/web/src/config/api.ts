/**
 * FengShui-specific API wrapper that automatically uses @ezstart/fetch-client
 */
import { callApi as baseCallApi, type CallApiOptions } from '@ezstart/fetch-client'

export { parseApiError } from '@ezstart/fetch-client'
export type { ApiResponse, ApiError, HttpMethod } from '@ezstart/fetch-client'

/**
 * Wrapper around callApi that automatically sets appName to 'fengshui'
 */
export async function callApi<T = any>(
  endpoint: string,
  options: Omit<CallApiOptions, 'appName'> = {}
) {
  return baseCallApi<T>(endpoint, { ...options, appName: 'fengshui' })
}
