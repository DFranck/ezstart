/**
 * Sentry client (browser) init for Next.js.
 *
 * Loaded automatically by `@sentry/nextjs` on the client. **No-op when
 * `NEXT_PUBLIC_SENTRY_DSN` is unset** — the consumer can ship without Sentry
 * and enable it later by setting the DSN in the deployment env.
 *
 * @see ./instrumentation.ts (server-side hook)
 * @see ./next.config.js (withSentryConfig wrapper)
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_DEPLOY_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    // Session replay sampling: 0% normal sessions, 100% on errors.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
  })
}
