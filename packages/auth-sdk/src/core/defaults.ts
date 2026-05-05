/**
 * Hardcoded production default URLs (Stripe-pattern).
 *
 * The SDK ships with a canonical production API host so that consumer apps
 * deployed on `*.ezstart.xyz` (or any other host that targets the official
 * EZStart cloud) need to set ZERO env vars in production. Local dev /
 * staging / self-hosted callers override via `apiUrl` prop or via
 * `process.env.NEXT_PUBLIC_EZAUTH_API_URL`.
 *
 * Resolution precedence:
 *   1. explicit `apiUrl` prop (caller knows best)
 *   2. `process.env.NEXT_PUBLIC_EZAUTH_API_URL`  (dev / staging / custom)
 *   3. `DEFAULT_AUTH_API_URL`                    (shipped prod default)
 *
 * Mirrors Stripe.js, which ships with `https://api.stripe.com` baked in
 * and only allows overriding via `Stripe.setUrl()` or in tests.
 *
 * NOTE: this default is the canonical EZAuth host. A self-hosted EZAuth
 * deployment (different cloud, different domain) MUST pass `apiUrl`
 * explicitly — the default is intentionally a "single canonical
 * production host", not a smart-detect.
 */
export const DEFAULT_AUTH_API_URL = 'https://ezauth-api.ezstart.xyz'

/**
 * Hardcoded production default WEB URL — where consumers redirect users for
 * login / register / SSO callback. Mirrors `DEFAULT_AUTH_API_URL` precedence:
 *
 *   1. explicit `webUrl` prop (caller knows best)
 *   2. `/api/keys/config.webUrl` response (per-tenant override)
 *   3. `process.env.NEXT_PUBLIC_EZAUTH_WEB_URL`  (dev / staging / custom)
 *   4. `DEFAULT_AUTH_WEB_URL`                    (shipped prod default)
 *
 * Off-localhost fallback is the canonical EZAuth web host so a static
 * Vercel build with no env override doesn't trip the
 * `WEB_URL_LOCALHOST_TRAP_MESSAGE` guard at prerender time.
 */
export const DEFAULT_AUTH_WEB_URL = 'https://ezauth.ezstart.xyz'
