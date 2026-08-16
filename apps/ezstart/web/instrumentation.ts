/**
 * Next.js instrumentation hook — entry point for runtime initialization.
 *
 * Called once per server instance (Node + Edge) on cold start. We use it to
 * load the Sentry server / edge configs lazily so they don't bloat the
 * bundle for the runtime that doesn't need them.
 *
 * The CLIENT-side counterpart is `instrumentation-client.ts` (Next.js 15+
 * convention, sibling of this file) — replaces the legacy
 * `sentry.client.config.ts`.
 *
 * @see ./instrumentation-client.ts
 * @see ./sentry.server.config.ts
 * @see ./sentry.edge.config.ts
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

import * as Sentry from '@sentry/nextjs'

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Sentry capture for unhandled errors during request processing on the
 * server. Required export per Next.js 15+ convention.
 *
 * Safe no-op when Sentry is not initialized (gated by `SENTRY_DSN` inside
 * `sentry.server.config.ts`).
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#onrequesterror-optional
 */
export const onRequestError = Sentry.captureRequestError
