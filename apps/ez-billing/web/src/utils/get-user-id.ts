/**
 * Get userId from EZAuth authentication storage
 */
export function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  
  try {
    const authData = localStorage.getItem('ezauth-storage')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed.state?.user?._id || undefined
    }
  } catch {
    return undefined
  }
  
  return undefined
}