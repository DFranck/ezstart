import { callApi, type ApiResponse, type CallApiOptions } from '@ezstart/ui/utils'

/**
 * EZ-Billing specific API caller that automatically includes user authentication
 */
export async function callBillingApi<T = any>(
  endpoint: string,
  options: Omit<CallApiOptions, 'userId'> = {}
): Promise<ApiResponse<T>> {
  // Get userId from localStorage for authentication header
  let userId: string | null = null
  if (typeof window !== 'undefined') {
    try {
      const userStore = localStorage.getItem('ez-billing-user')
      if (userStore) {
        const parsed = JSON.parse(userStore)
        userId = parsed.state?.user?._id || null
      }
    } catch {
      userId = null
    }
  }

  return callApi<T>(endpoint, {
    ...options,
    userId: userId || undefined,
  })
}
