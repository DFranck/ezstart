/**
 * Observability barrel — re-exports for `@ezstart/api-core`.
 *
 * Currently exposes Sentry init + manual capture helpers. Future helpers
 * (status page, deep health hooks, metrics) land here.
 *
 * @see ./sentry-init.ts
 * @see ../../.claude/rules/standard-saas-observability.md
 */

export { captureException, initSentry, type InitSentryOptions } from './sentry-init.js'
