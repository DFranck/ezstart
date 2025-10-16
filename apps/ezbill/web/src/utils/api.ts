/**
 * EZBill-specific API wrapper that automatically uses @ezstart/config
 */
import { callApi as baseCallApi, type CallApiOptions } from '@ezstart/ui/utils'

// Re-export other utils unchanged
export { runWithFeedback } from '@ezstart/ui/utils'
export type { ApiResponse, ApiError, HttpMethod } from '@ezstart/ui/utils'

/**
 * Wrapper around callApi that automatically sets appName to 'ezbill'
 */
export async function callApi<T = any>(
  endpoint: string,
  options: Omit<CallApiOptions, 'appName'> = {}
) {
  return baseCallApi<T>(endpoint, { ...options, appName: 'ezbill' })
}
