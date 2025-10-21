import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { config } from 'dotenv'

/**
 * Initialize Sentry for error tracking and monitoring
 *
 * @param appName - Name of the application (e.g., 'EZAuth API')
 * @returns Sentry instance or undefined if DSN not configured
 *
 * @example
 * ```typescript
 * // In instrument.mts
 * import { initSentry } from '@ezstart/logger/sentry'
 * export const Sentry = initSentry('EZAuth API')
 * ```
 *
 * Environment variables required:
 * - SENTRY_DSN: Sentry Data Source Name (get from https://sentry.io)
 * - NODE_ENV: Environment (development/production)
 */
export function initSentry(appName: string) {
  // Load environment variables first (prioritize .env.local)
  config({ path: '.env.local' })

  // Skip if DSN not provided
  if (!process.env.SENTRY_DSN) {
    console.log(`⚠️  [Sentry] ${appName}: DSN not provided, skipping initialization`)
    return undefined
  }

  // Initialize Sentry with standard configuration
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Send IP address and user info for better error tracking
    sendDefaultPii: true,

    // Performance monitoring
    tracesSampleRate: 1.0, // 100% of traces (adjust for production if needed)
    profilesSampleRate: 1.0, // 100% of profiles

    // Integrations
    integrations: [
      nodeProfilingIntegration(),
    ],
  })

  // Log successful initialization
  console.log(`✅ [Sentry] ${appName}: Initialized successfully`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   DSN configured: ${process.env.SENTRY_DSN?.substring(0, 30)}...`)

  return Sentry
}

/**
 * Export Sentry for direct usage (captureException, captureMessage, etc.)
 */
export { Sentry }
