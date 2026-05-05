/**
 * Hardcoded production default URLs (Stripe-pattern).
 *
 * The SDK ships with a canonical production API host so that consumer apps
 * deployed on `*.ezstart.xyz` (or any other host that targets the official
 * EZStart cloud) need to set ZERO env vars in production. Local dev /
 * staging / self-hosted callers override via `config.apiUrl` prop or via
 * `process.env.NEXT_PUBLIC_EZPAY_API_URL`.
 *
 * Resolution precedence:
 *   1. explicit `config.apiUrl` prop (caller knows best)
 *   2. `process.env.NEXT_PUBLIC_EZPAY_API_URL`  (dev / staging / custom)
 *   3. `DEFAULT_PAY_API_URL`                    (shipped prod default)
 *
 * Mirrors Stripe.js / Clerk SDK ergonomics: no env in production, opt-in
 * env override for local dev. A self-hosted EZPay deployment (different
 * cloud, different domain) MUST pass `apiUrl` explicitly — the default is
 * intentionally a "single canonical production host", not a smart-detect.
 */
export const DEFAULT_PAY_API_URL = 'https://ezpay-api.ezstart.xyz'
