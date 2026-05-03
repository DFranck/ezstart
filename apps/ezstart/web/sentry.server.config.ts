/**
 * Sentry server-side init for Next.js (Node runtime).
 *
 * Loaded by `instrumentation.ts` when `process.env.NEXT_RUNTIME === 'nodejs'`.
 * **No-op when `SENTRY_DSN` is unset** — the consumer can ship without Sentry
 * and enable it later by setting the DSN in the deployment env.
 *
 * NOTE: this is the Next.js server runtime (RSC + route handlers). Standalone
 * Express APIs initialize Sentry separately via `@sentry/node-core` +
 * `initSentry()` from `@ezstart/api-core`.
 *
 * @see ./instrumentation.ts
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.DEPLOY_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA,
    serverName: 'ezstart-web',
    tracesSampleRate: 0.1,
  })
}
