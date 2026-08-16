/**
 * Env-aware default URLs for the canonical EZAuth deployment (Stripe-pattern
 * with multi-env awareness).
 *
 * **Why env-aware** : Stripe ships with `https://api.stripe.com` only because
 * they have a single public env. We have 3 well-known envs (production,
 * staging, local) with stable URL patterns, so we ship a per-env table and
 * pick the right entry based on `DEPLOY_ENV` / hostname / `NODE_ENV`.
 * Result : zero env var required in any of the canonical EZAuth deployments.
 *
 * Resolution precedence (per URL slot):
 *
 *   1. explicit prop                                  (caller knows best)
 *   2. `/api/keys/config.<field>` response            (per-tenant override
 *                                                      — only for `webUrl`,
 *                                                      and only in
 *                                                      publishable-key mode)
 *   3. `process.env.NEXT_PUBLIC_EZAUTH_*_URL`         (custom self-hosted
 *                                                      override)
 *   4. `EZAUTH_URLS_BY_ENV[detectEnv()]`              (env-aware default)
 *
 * **Agnostic packaging** — this file is duplicated logic from
 * `packages/config/src/urls.ts` (the monorepo source of truth) because
 * `@ezstart/auth-sdk` is a publishable npm package and MUST NOT depend on
 * `@ezstart/config` (cf. `.claude/rules/standard.md` §1). Keep the two in
 * sync when staging URLs change.
 *
 * **Self-hosted callers** (different cloud, different domain) override via
 * the `apiUrl` / `webUrl` props or via the env vars. The defaults here are
 * intentionally the canonical EZStart deployment, not a smart-detect.
 */

import type { AuthEnvironment } from './types.js'

/**
 * URL table for the canonical EZAuth deployment in each environment.
 *
 * Mirrors `packages/config/src/urls.ts` `URLS.ezauth` — kept inline because
 * the SDK can't import `@ezstart/config` (agnostic packaging rule).
 */
export const EZAUTH_URLS_BY_ENV: Record<AuthEnvironment, { api: string; web: string }> = {
  production: {
    api: 'https://ezauth-api.ezstart.xyz',
    web: 'https://ezauth.ezstart.xyz',
  },
  staging: {
    api: 'https://ezauth-api-staging.up.railway.app',
    web: 'https://ezauth-git-staging-ezstart.vercel.app',
  },
  local: {
    api: 'http://localhost:6110',
    web: 'http://localhost:6111',
  },
}

/**
 * Detect the current EZStart environment.
 *
 * Priority order :
 *   1. Server-side `DEPLOY_ENV` env var (canonical signal — set on every
 *      Railway service + Vercel project)
 *   2. Server-side Vercel preview of the `staging` branch
 *      (`VERCEL_GIT_COMMIT_REF === 'staging'`)
 *   3. Server-side `NODE_ENV === 'production'` → `'production'`
 *   4. Client-side hostname detection (PROD subdomain match → `'production'`,
 *      `*-git-staging-*.vercel.app` → `'staging'`, localhost → `'local'`)
 *   5. Default → `'production'` (safe fallback for static builds and
 *      external customers — they get pointed at the canonical prod URLs)
 *
 * The default chosen for unknown environments is `'production'` (NOT
 * `'local'`) because :
 *   - External customers using `npm install @ezstart/auth-sdk` get prod URLs
 *     out of the box (the desired behavior).
 *   - Static Next.js prerender (no `window`, no `process.env.DEPLOY_ENV`)
 *     doesn't trip the localhost trap.
 */
export function detectAuthEnvironment(): AuthEnvironment {
  // Server-side signals (Node / Edge / build) — these are the AUTHORITATIVE
  // signals when present. Any consumer running our `pnpm env:push:*` toolchain
  // has DEPLOY_ENV set in every environment, so this branch wins in the
  // canonical EZStart deployment.
  if (typeof process !== 'undefined' && process.env) {
    const deployEnv = process.env.DEPLOY_ENV
    if (deployEnv === 'staging') return 'staging'
    if (deployEnv === 'production') return 'production'
    if (deployEnv === 'local' || deployEnv === 'development') return 'local'

    if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'staging') {
      return 'staging'
    }

    // CRITICAL : Next.js build prerender phase. When `NEXT_PHASE` is
    // `'phase-production-build'`, we're inside a Vercel build worker.
    // Some Next.js workers ship a JSDOM-like `window` polyfill with
    // `hostname === 'localhost'`, which would trip the client-side
    // localhost detection below and break the build with a misleading
    // "webUrl resolves to localhost" CONFIG_ERROR. Short-circuit to
    // 'production' so prerender uses safe canonical URLs.
    if (process.env.NEXT_PHASE === 'phase-production-build') return 'production'

    // Server-side production runtime (Railway prod, Node serverless, etc.)
    // — `NODE_ENV === 'production'` AND no browser `window` means we're in
    // a real Node.js server context, never localhost. Browsers running a
    // real prod build still set `NODE_ENV='production'` but `typeof window`
    // is defined → we then fall through to the hostname check.
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return 'production'
    }
  }

  // Client-side : hostname pattern match. Reached only when running in a
  // real browser context with `NODE_ENV !== 'production'` (typically dev).
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
      return 'local'
    }

    // Vercel preview of the staging branch : `*-git-staging-*.vercel.app`
    if (host.includes('-git-staging-') && host.endsWith('.vercel.app')) {
      return 'staging'
    }

    if (host.startsWith('staging.') || host.startsWith('staging-')) {
      return 'staging'
    }
  }

  // Safe fallback — external customers + ambiguous contexts land here.
  return 'production'
}

/**
 * Return the env-aware default URLs for the canonical EZAuth deployment.
 * Self-hosted callers override via props or env vars.
 */
export function getEzauthDefaultUrls(): { api: string; web: string } {
  return EZAUTH_URLS_BY_ENV[detectAuthEnvironment()]
}

/**
 * Backwards-compat constants — preserved so existing imports don't break.
 * New code should call `getEzauthDefaultUrls()` instead, which auto-resolves
 * the right URL for the current env.
 *
 * These resolve at MODULE LOAD time, NOT at consumer call time, so they
 * always point to PRODUCTION when imported during a Vercel build (no
 * `window`, `NODE_ENV='production'`). Use `getEzauthDefaultUrls()` for
 * client-side code that needs runtime hostname detection.
 *
 * @deprecated Use `getEzauthDefaultUrls()` for env-aware resolution.
 */
export const DEFAULT_AUTH_API_URL = EZAUTH_URLS_BY_ENV.production.api
export const DEFAULT_AUTH_WEB_URL = EZAUTH_URLS_BY_ENV.production.web
