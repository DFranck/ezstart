import { createNextConfig } from '@ezstart/next-config/compose'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig = createNextConfig({
  pwa: true,
  i18n: true,
  i18nRequestPath: './src/i18n.ts',
  extend: {
    transpilePackages: [],
    eslint: {
      ignoreDuringBuilds: true,
    },
    // Include SDK README in the serverless function bundle so /docs page can read it at runtime
    outputFileTracingIncludes: {
      '/**/docs/**': ['../../../packages/auth-sdk/README.md'],
    },
  },
})

// Wrap with Sentry — handles source maps upload at build time when
// `SENTRY_AUTH_TOKEN` is set. **Safe when no token / no DSN** — source map
// upload is skipped (see `disableSourceMapUpload` below) and the runtime
// configs (instrumentation-client.ts + sentry.{server,edge}.config.ts) are
// no-ops without `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`.
//
// Update `org` + `project` placeholders below with the real Sentry org/project
// slugs after creating them in https://sentry.io.
export default withSentryConfig(nextConfig, {
  org: 'ezstart', // PLACEHOLDER — replace with real Sentry org slug
  project: 'ezauth-web', // PLACEHOLDER — replace with real Sentry project slug
  silent: true, // suppress source-map upload logs
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Skip source map upload when no auth token (dev / preview without Sentry).
  disableSourceMapUpload: !process.env.SENTRY_AUTH_TOKEN,
  // Disable Sentry tunnel route (we don't need it; ad-blocker bypass not a P0).
  tunnelRoute: undefined,
})
