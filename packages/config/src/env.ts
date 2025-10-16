import { AppName, getWebUrl, getApiUrl, getCurrentEnvironment } from './urls.js'

/**
 * Get environment-aware URLs for an app
 *
 * @example
 * ```typescript
 * // In EZPay web app
 * const { webUrl, apiUrl } = getAppUrls('ezpay')
 * // Local: webUrl = 'http://localhost:5045', apiUrl = 'http://localhost:5040'
 * // Prod: webUrl = 'https://ezpay.ezstart.xyz', apiUrl = 'https://ezpay-api.up.railway.app'
 * ```
 */
export function getAppUrls(app: AppName) {
  const env = getCurrentEnvironment()

  return {
    webUrl: getWebUrl(app, env),
    apiUrl: URLS[app].api ? getApiUrl(app, env) : undefined,
    environment: env,
  }
}

/**
 * Check if running locally
 */
export function isLocal(): boolean {
  return getCurrentEnvironment() === 'local'
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production'
}

/**
 * Check if running in development (Vercel preview)
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development'
}

// Re-export for convenience
export { getCurrentEnvironment }

// Import URLS for use in this file
import { URLS } from './urls.js'
