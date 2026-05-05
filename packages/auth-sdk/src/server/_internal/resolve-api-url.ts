/**
 * Server-side `apiUrl` resolution helper — applies the same Stripe-style
 * precedence used by the client `<AuthProvider>`:
 *
 *   1. explicit `apiUrl` argument (caller knows best)
 *   2. `process.env.NEXT_PUBLIC_EZAUTH_API_URL` (dev / staging / self-hosted override)
 *   3. `DEFAULT_AUTH_API_URL`                   (shipped prod default for *.ezstart.xyz)
 *
 * Used by every `getServer<X>()` SSR companion so consumers don't have to
 * thread `apiUrl` through every page when running against the canonical
 * EZAuth cloud. Self-hosted callers still pass `apiUrl` explicitly to
 * override.
 *
 * @internal
 */

import { DEFAULT_AUTH_API_URL } from '../../core/defaults.js'

/**
 * Resolve the final auth API URL applying the Stripe-style precedence.
 *
 * Returns the resolved string. Never throws — when no signal is available
 * the hardcoded production default kicks in.
 */
export function resolveAuthApiUrl(explicit?: string | null): string {
  if (explicit && explicit.length > 0) return explicit
  // Next.js statically replaces `process.env.NEXT_PUBLIC_*` at build time —
  // safe to read directly here even though this module is server-only,
  // because consumer apps that pre-build their server bundles will inline
  // the value at build time. Server-rendered Next.js apps also have
  // `process.env` available at runtime.
  const fromEnv = process.env.NEXT_PUBLIC_EZAUTH_API_URL
  if (fromEnv && fromEnv.length > 0) return fromEnv
  return DEFAULT_AUTH_API_URL
}
