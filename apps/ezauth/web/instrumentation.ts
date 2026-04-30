/**
 * Next.js instrumentation hook — entry point for runtime initialization.
 *
 * Called once per server instance (Node + Edge) on cold start. We use it to
 * load the Sentry server / edge configs lazily so they don't bloat the
 * bundle for the runtime that doesn't need them.
 *
 * @see ./sentry.server.config.ts
 * @see ./sentry.edge.config.ts
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
