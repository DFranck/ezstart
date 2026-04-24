import { config } from 'dotenv'

// Sentry is loaded lazily inside `initSentry`. Top-level `import '@sentry/node'`
// triggers OpenTelemetry HTTP/Express auto-instrumentation as a side effect —
// on Railway's managed Node runtime this causes every request carrying a
// non-empty `Origin` header to 500 out before Express sees it, regardless
// of the options passed to `Sentry.init`. Keeping the import inside the
// DSN-gated branch means OTEL stays dormant when SENTRY_DSN is unset (dev)
// and only activates after an explicit opt-in via `initSentry(appName)`.
//
// The public `Sentry` re-export at the bottom is a lazy getter too, so
// call-sites such as `Sentry.captureException` work the same way without
// eagerly triggering OTEL.
type SentryModule = typeof import('@sentry/node')
let loadedSentry: SentryModule | undefined

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

  // Lazy-load `@sentry/node` only now that we know a DSN is configured.
  // The import + its OpenTelemetry auto-instrumentation only kicks in for
  // APIs that explicitly opt in via initSentry().
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- sync lazy load to avoid top-level OTEL hook
  loadedSentry = require('@sentry/node') as SentryModule
  const Sentry = loadedSentry

  // Initialize Sentry with standard configuration.
  //
  // Performance monitoring is intentionally disabled (`tracesSampleRate: 0`,
  // no `nodeProfilingIntegration`) because the `@opentelemetry/instrumentation-
  // express` auto-wrap shipped with `@sentry/node` v10+ interferes with the
  // `cors` package's response-header write path on Railway's managed Node
  // runtime. Symptom on staging: every request carrying an `Origin` header
  // returned HTTP 500 with Express's default error HTML — zero CORS headers
  // — while the same build on localhost (where SENTRY_DSN is unset so this
  // branch was skipped) correctly reflected the origin. Keeping error
  // tracking but disabling tracing + profiling restores the expected
  // cross-origin behaviour. Re-enable tracing later once OTEL has a stable
  // Express wrapper that plays nicely with `cors`.
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    sendDefaultPii: true,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    // Disable ALL default integrations. `@sentry/node` v10+ auto-registers
    // `@opentelemetry/instrumentation-http` + `-express`, which (on Railway's
    // managed Node runtime) swallows incoming requests carrying an `Origin`
    // header and kicks them straight into Express's default 500 error
    // handler — never reaching our CORS middleware. Passing an empty
    // integrations array keeps Sentry alive for manual `captureException`
    // calls from our own code but skips the intrusive auto-wrappers.
    integrations: [],
    defaultIntegrations: false,
  })

  // Log successful initialization
  console.log(`✅ [Sentry] ${appName}: Initialized successfully`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   DSN configured: ${process.env.SENTRY_DSN?.substring(0, 30)}...`)

  return Sentry
}

/**
 * Lazy Sentry proxy — returns the loaded SDK when `initSentry()` has been
 * called, otherwise a no-op stub. Call-sites can use `Sentry.captureException`
 * without eagerly triggering the top-level import + OpenTelemetry hook.
 */
export const Sentry = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (loadedSentry) {
        return (loadedSentry as unknown as Record<string, unknown>)[prop]
      }
      // Stub: return a no-op function so the call-site doesn't crash.
      return (..._args: unknown[]) => undefined
    },
  }
) as SentryModule
