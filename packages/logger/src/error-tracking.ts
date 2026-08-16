/**
 * Error tracking provider auto-detection.
 *
 * Pure detection helper — does NOT initialize any SDK. Returns which provider
 * (if any) is configured via env vars so callers can route accordingly:
 *
 * - **Sentry** : standard industry tool, dashboard riche, free 5k events/mo.
 *   Activated by `NEXT_PUBLIC_SENTRY_DSN` (browser) and/or `SENTRY_DSN`
 *   (server). The actual `Sentry.init` happens in:
 *     - `apps/<app>/web/instrumentation-client.ts` (browser, Next.js 15+)
 *     - `apps/<app>/web/sentry.server.config.ts` (server runtime)
 *     - `packages/api-core/src/observability/sentry-init.ts` (Express APIs)
 *
 * - **Better Stack (Logtail)** : structured log pipeline, Pino-friendly,
 *   $24/mo unlimited. Activated by `NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN`
 *   (browser) and/or `LOGTAIL_SOURCE_TOKEN` (server). Wires up via
 *   `@logtail/browser` (client) or a `pino` transport (server).
 *
 * - **Neither** : returns `null`. Logger falls back to console / Pino default
 *   stdout. Acceptable in dev, dangerous in prod (silent errors).
 *
 * Sentry takes precedence over Better Stack when both are set — they aren't
 * mutually exclusive (Better Stack ingests logs, Sentry captures
 * stack-traced exceptions) but the helper returns a single string so
 * callers can pick a primary signal channel.
 *
 * @example Server-side (API or Next.js server runtime)
 * ```ts
 * import { detectErrorTracker } from '@ezstart/logger'
 *
 * const provider = detectErrorTracker()
 * if (provider === 'sentry') {
 *   // Sentry was init'd elsewhere; do nothing here.
 * } else if (provider === 'logtail') {
 *   // Wire pino transport -> @logtail/node
 * } else {
 *   // No tracker — log to stdout and hope for the best.
 * }
 * ```
 *
 * @example Browser-side (Next.js Client Component / instrumentation-client)
 * ```ts
 * import { detectErrorTracker } from '@ezstart/logger/client'
 *
 * if (detectErrorTracker() === null && process.env.NODE_ENV === 'production') {
 *   console.warn('No error tracker configured — production errors are silent')
 * }
 * ```
 *
 * @public
 */
export type ErrorTrackerProvider = 'sentry' | 'logtail' | null

/**
 * Detect which error tracker is configured via env vars.
 *
 * Reads `process.env` synchronously — safe to call at module load.
 * Returns the **first** match in priority order (Sentry > Logtail > none).
 *
 * Browser-safe: the `NEXT_PUBLIC_*` variants are inlined by the bundler
 * at build time; the server-only variants are only available in Node.
 *
 * @public
 */
export function detectErrorTracker(): ErrorTrackerProvider {
  // Sentry — server (SENTRY_DSN) or browser (NEXT_PUBLIC_SENTRY_DSN)
  const sentryDsn =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
      : undefined
  if (sentryDsn) return 'sentry'

  // Better Stack (Logtail) — server (LOGTAIL_SOURCE_TOKEN) or browser
  // (NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN)
  const logtailToken =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN || process.env.LOGTAIL_SOURCE_TOKEN
      : undefined
  if (logtailToken) return 'logtail'

  return null
}
