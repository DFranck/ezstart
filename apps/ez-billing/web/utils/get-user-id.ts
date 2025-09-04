/**
 * Get userId from localStorage for EZ-Billing authentication
 */
export function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  
  try {
    const userStore = localStorage.getItem('ez-billing-user')
    if (userStore) {
      const parsed = JSON.parse(userStore)
      return parsed.state?.user?._id || undefined
    }
  } catch {
    return undefined
  }
  
  return undefined
}