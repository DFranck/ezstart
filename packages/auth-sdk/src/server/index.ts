/**
 * `@ezstart/auth-sdk/server/features` — server-only feature gate helpers.
 *
 * This barrel collocates feature-gating utilities that run on the server
 * (inside API route handlers, background jobs, etc.). They are pure and
 * framework-agnostic so they can be composed into Express middleware, Next.js
 * route handlers, or plain Node scripts alike.
 *
 * Imported via the primary server export:
 *
 * ```ts
 * import { hasFeature } from '@ezstart/auth-sdk/server'
 * ```
 */

export { hasFeature } from './features.js'
export type { HasFeatureInput, HasFeatureApp, HasFeatureUser } from './features.js'
