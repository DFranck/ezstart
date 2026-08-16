/**
 * Sentry client (browser) init — Next.js 15+ instrumentation pattern.
 *
 * The file name `instrumentation-client.ts` is a Next.js convention (sibling
 * of `instrumentation.ts`); the framework loads it automatically on the
 * client before any user code runs. Replaces the legacy
 * `sentry.client.config.ts` from Next.js < 15.
 *
 * **No-op when `NEXT_PUBLIC_SENTRY_DSN` is unset** — the consumer can ship
 * without Sentry and enable it later by setting the DSN in the deployment env.
 *
 * Auto-detection contract: Sentry takes precedence; if no Sentry DSN is set,
 * a Better Stack source token (`NEXT_PUBLIC_LOGTAIL_SOURCE_TOKEN`) can act as
 * a fallback for log shipping (wired separately via `@logtail/browser`).
 *
 * @see ./instrumentation.ts
 * @see ./next.config.js (withSentryConfig wrapper)
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
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

/**
 * Required export for Next.js 15+ navigation instrumentation. Sentry uses
 * this to capture client-side route transitions for performance tracing.
 *
 * Safe no-op when Sentry is not initialized.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#router-transitions-instrumentation
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
