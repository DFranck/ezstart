/**
 * Clean up old authentication data to prevent conflicts with EZAuth
 */
export function cleanupOldAuth(): void {
  if (typeof window === 'undefined') return
  
  try {
    // Remove old EZ-Billing user store
    localStorage.removeItem('ez-billing-user')
    console.log('🧹 Cleaned up old authentication data')
  } catch (error) {
    console.warn('Failed to cleanup old auth data:', error)
  }
}