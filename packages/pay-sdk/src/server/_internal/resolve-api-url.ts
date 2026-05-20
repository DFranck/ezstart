/**
 * Server-side `apiUrl` resolution helper — applies the same Stripe-style
 * precedence used by the client `<PayProvider>`:
 *
 *   1. explicit `apiUrl` argument (caller knows best)
 *   2. `process.env.NEXT_PUBLIC_EZPAY_API_URL` (dev / staging / self-hosted override)
 *   3. `getEzpayDefaultUrls().api`             (shipped prod default for *.ezstart.xyz)
 *
 * Used by every `getServer<X>()` SSR companion so consumers don't have to
 * thread `apiUrl` through every page when running against the canonical
 * EZPay cloud. Self-hosted callers still pass `apiUrl` explicitly to
 * override.
 *
 * Mirrors `packages/auth-sdk/src/server/_internal/resolve-api-url.ts`.
 *
 * @internal
 */

import { getEzpayDefaultUrls } from '../../core/defaults.js'

/**
 * Resolve the final pay API URL applying the Stripe-style precedence:
 *
 *   1. explicit `apiUrl` argument (caller knows best)
 *   2. `NEXT_PUBLIC_EZPAY_API_URL` (self-hosted / legacy override)
 *   3. `getEzpayDefaultUrls().api` — env-aware:
 *        - server-side: reads `DEPLOY_ENV` (staging → staging API, etc.)
 *        - client-side: reads `window.location.hostname` pattern
 *        - fallback: production (safe for external consumers)
 *
 * Returns the resolved string. Never throws.
 */
export function resolvePayApiUrl(explicit?: string | null): string {
  if (explicit && explicit.length > 0) return explicit
  // Next.js statically replaces `process.env.NEXT_PUBLIC_*` at build time.
  const fromEnv = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_EZPAY_API_URL : undefined
  if (fromEnv && fromEnv.length > 0) return fromEnv
  return getEzpayDefaultUrls().api
}
