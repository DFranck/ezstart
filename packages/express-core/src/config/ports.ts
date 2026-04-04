import { getPort, type AppName } from '@ezstart/config'
import { logger } from '@ezstart/logger/server'

/**
 * Get the port for an API service
 *
 * NEW (v2): Uses @ezstart/config as single source of truth
 * Falls back to process.env.PORT for override capability
 *
 * @param appName - The app name from @ezstart/config (e.g., 'ezauth', 'ezpay')
 * @returns Port number for the API
 *
 * @example
 * ```typescript
 * const PORT = getApiPort('ezauth') // 6110 from config
 * const PORT = getApiPort('ezpay') // 6130 from config
 * ```
 */
export function getApiPort(appName: AppName): number {
  // Allow override via env var (useful for testing/deployment)
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10)
  }

  // Get from @ezstart/config (single source of truth)
  try {
    return getPort(appName, 'api')
  } catch (error) {
    logger.error(
      `❌ Failed to get port for ${appName}:`,
      error instanceof Error ? error.message : 'Unknown error'
    )
    throw error
  }
}
