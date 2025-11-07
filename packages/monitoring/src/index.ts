/**
 * @ezstart/monitoring - Server-side exports
 *
 * This entry point provides server-only monitoring utilities.
 * Use this in APIs and backend services.
 *
 * For client-side monitoring (React components/hooks), use:
 * import { ... } from '@ezstart/monitoring/client'
 *
 * @example
 * ```typescript
 * import { MONITORED_SERVICES, HealthChecker } from '@ezstart/monitoring'
 *
 * const checker = new HealthChecker()
 * const result = await checker.check({
 *   name: 'EZAuth API',
 *   type: 'api',
 *   url: 'http://localhost:5010/api/health',
 *   timeout: 5000,
 *   interval: 30000,
 *   retries: 3,
 * })
 * ```
 */

// Types
export * from './types/index.js'

// Utilities
export * from './utils/index.js'

// Collectors
export * from './collectors/index.js'

// NOTE: Client exports (PlausibleAnalytics, usePerformance) are available at:
// import { ... } from '@ezstart/monitoring/client'
