import { logger } from '@ezstart/logger'

/**
 * Clean up old authentication data to prevent conflicts with EZAuth
 */
export function cleanupOldAuth(): void {
  if (typeof window === 'undefined') return

  try {
    // Remove old auth data (renamed from ez-billing to ezbill)
    localStorage.removeItem('ez-billing-user')
    localStorage.removeItem('ezbill-user')
    logger.debug('Cleaned up old authentication data')
  } catch (error) {
    logger.warn('Failed to cleanup old auth data:', error)
  }
}
