/**
 * Env-aware default URLs for the canonical EZPay deployment (mirrors auth-sdk
 * `detectAuthEnvironment()` + `getEzauthDefaultUrls()` pattern).
 *
 * Resolution precedence (per `apiUrl` slot in PayProvider):
 *
 *   1. explicit `config.apiUrl` prop            (caller knows best)
 *   2. `process.env.NEXT_PUBLIC_EZPAY_API_URL`  (dev / staging / self-hosted override)
 *   3. `getEzpayDefaultUrls().api`              (env-aware: staging → staging URL, etc.)
 *
 * **Agnostic packaging** — this file duplicates logic from
 * `packages/config/src/urls.ts` because `@ezstart/pay-sdk` must not import
 * `@ezstart/config` (agnostic packaging rule, cf. standard.md §1). Keep in sync
 * when staging/production URLs change.
 *
 * **Self-hosted callers** (different cloud, different domain) override via
 * the `apiUrl` prop or via `NEXT_PUBLIC_EZPAY_API_URL`. The defaults here are
 * intentionally the canonical EZStart deployment, not a smart-detect for
 * arbitrary infra.
 */

export type PayEnvironment = 'production' | 'staging' | 'local'

/**
 * URL table for the canonical EZPay deployment in each environment.
 * Mirrors `packages/config/src/urls.ts` `URLS.ezpay`.
 */
export const EZPAY_URLS_BY_ENV: Record<PayEnvironment, { api: string; web: string }> = {
  production: {
    api: 'https://ezpay-api.ezstart.xyz',
    web: 'https://ezpay.ezstart.xyz',
  },
  staging: {
    api: 'https://ezpay-api-staging.up.railway.app',
    web: 'https://ezpay-git-staging-ezstart.vercel.app',
  },
  local: {
    api: 'http://localhost:6130',
    web: 'http://localhost:6131',
  },
}

/**
 * Detect the current EZStart environment for pay-sdk URL resolution.
 * Mirrors `detectAuthEnvironment()` from `packages/auth-sdk/src/core/defaults.ts`.
 *
 * Priority:
 *   1. `process.env.DEPLOY_ENV`                 (Railway + Vercel server-side canonical signal)
 *   2. `VERCEL_ENV=preview` + `staging` branch  (Vercel preview auto-detection)
 *   3. `NEXT_PHASE=phase-production-build`       (Next.js build prerender → safe prod default)
 *   4. `NODE_ENV=production` + no window         (server-side production runtime)
 *   5. `window.location.hostname` patterns       (client-side env detection)
 *   6. `'production'`                            (safe fallback for external consumers)
 */
export function detectPayEnvironment(): PayEnvironment {
  if (typeof process !== 'undefined' && process.env) {
    const deployEnv = process.env.DEPLOY_ENV
    if (deployEnv === 'staging') return 'staging'
    if (deployEnv === 'production') return 'production'
    if (deployEnv === 'local' || deployEnv === 'development') return 'local'

    if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'staging') {
      return 'staging'
    }

    // Next.js build prerender — some workers ship a JSDOM-like `window`
    // polyfill with `hostname === 'localhost'` that would trip the localhost
    // check below. Short-circuit to production so prerender uses safe canonical URLs.
    if (process.env.NEXT_PHASE === 'phase-production-build') return 'production'

    // Server-side production runtime (Railway prod, Node serverless, etc.)
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return 'production'
    }
  }

  // Client-side hostname pattern match — only reached in a real browser context.
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
      return 'local'
    }

    // Vercel preview of the staging branch: `*-git-staging-*.vercel.app`
    if (host.includes('-git-staging-') && host.endsWith('.vercel.app')) {
      return 'staging'
    }

    if (host.startsWith('staging.') || host.startsWith('staging-')) {
      return 'staging'
    }
  }

  // Safe fallback — external consumers + ambiguous contexts.
  return 'production'
}

/**
 * Return the env-aware default URLs for the canonical EZPay deployment.
 * Self-hosted callers override via `config.apiUrl` or `NEXT_PUBLIC_EZPAY_API_URL`.
 */
export function getEzpayDefaultUrls(): { api: string; web: string } {
  return EZPAY_URLS_BY_ENV[detectPayEnvironment()]
}

/**
 * Backwards-compat constant — preserved so existing imports don't break.
 * New code should call `getEzpayDefaultUrls().api` instead, which auto-resolves
 * the right URL for the current environment.
 *
 * @deprecated Use `getEzpayDefaultUrls().api` for env-aware resolution.
 */
export const DEFAULT_PAY_API_URL = EZPAY_URLS_BY_ENV.production.api
