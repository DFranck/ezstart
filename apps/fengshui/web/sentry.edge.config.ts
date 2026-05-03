/**
 * Sentry edge runtime init for Next.js.
 *
 * Loaded by `instrumentation.ts` when `process.env.NEXT_RUNTIME === 'edge'`
 * (middleware + edge route handlers). **No-op when `SENTRY_DSN` is unset**.
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
    serverName: 'fengshui-web-edge',
    tracesSampleRate: 0.1,
  })
}
