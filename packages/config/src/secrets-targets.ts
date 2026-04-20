/**
 * Declarative targeting map for secrets push/pull/audit.
 *
 * For every var name used in `.env.{local,staging,production}`, declares:
 *  - which apps consume it (for push → which Railway services / Vercel projects)
 *  - which layer (api / web / both)
 *  - whether it is templated (`{app}`/`{env}` interpolation) or suffixed
 *    (read via `getSentryDsn(app)` → `SENTRY_DSN_{APP_UPPER}`)
 *  - whether it is a `NEXT_PUBLIC_*` var (exposed to the browser bundle)
 *  - `webOverrides` for the rare case where a var normally API-only must
 *    also be pushed to a specific web project (e.g. `fengshui` which has
 *    no separate API and runs DB queries in Next route handlers).
 *
 * Consumed by scripts in `scripts/secrets-*.ts` to sync root env files
 * with Railway + Vercel dashboards.
 */

import type { AppName } from './urls.js'

export type VarTarget = {
  /** '*' = every app listed in urls.ts / this app list specifically */
  apps: '*' | readonly AppName[]
  /** Runtime layer(s) that need the var */
  layer: 'api' | 'web' | 'both'
  /** `{app}`/`{env}` placeholder substitution via getMongoUrl() etc. */
  template?: boolean
  /** `SENTRY_DSN_EZAUTH` pattern — push to each app under its suffixed name */
  suffixed?: boolean
  /** NEXT_PUBLIC_* — exposed to the browser bundle (Vercel only) */
  client?: boolean
  /** Exceptional web targets that also need this API-only var (e.g. fengshui) */
  webOverrides?: readonly AppName[]
}

export const VAR_TARGETS = {
  // ── Shared (every app) ──
  JWT_SECRET: { apps: '*', layer: 'api' },
  MONGO_URL: { apps: '*', layer: 'api', template: true, webOverrides: ['fengshui'] },

  // ── Sentry runtime (per-app suffixed) ──
  SENTRY_DSN: { apps: '*', layer: 'api', suffixed: true },

  // ── Sentry build-time (source maps upload) ──
  SENTRY_AUTH_TOKEN: { apps: '*', layer: 'both' },
  SENTRY_ORG_SLUG: { apps: '*', layer: 'both' },

  // ── EZAuth (OAuth + cookies + email) ──
  OAUTH_STATE_SECRET: { apps: ['ezauth'], layer: 'api' },
  OAUTH_ENCRYPTION_KEY: { apps: ['ezauth'], layer: 'api' },
  GOOGLE_CLIENT_ID: { apps: ['ezauth'], layer: 'api' },
  GOOGLE_CLIENT_SECRET: { apps: ['ezauth'], layer: 'api' },
  GOOGLE_CALLBACK_URL: { apps: ['ezauth'], layer: 'api' },
  SSO_ALLOWED_REDIRECTS: { apps: ['ezauth'], layer: 'api' },
  ACCESS_TOKEN_EXPIRES_IN: { apps: ['ezauth'], layer: 'api' },
  COOKIE_DOMAIN: { apps: ['ezauth'], layer: 'api' },
  REQUIRE_VERIFIED_EMAIL_FOR_SSO: { apps: ['ezauth'], layer: 'api' },
  EMAIL_FROM: { apps: ['ezauth'], layer: 'api' },

  // ── Email ──
  RESEND_API_KEY: { apps: ['ezauth', 'ezbill', 'ezstart'], layer: 'api' },
  RESEND_FULL_ACCESS_API_KEY: { apps: ['ezstart'], layer: 'api' },

  // ── EZPay (Stripe) ──
  STRIPE_SECRET_KEY: { apps: ['ezpay', 'ezstart'], layer: 'api' },
  STRIPE_WEBHOOK_SECRET: { apps: ['ezpay'], layer: 'api' },
  STRIPE_CONNECT_WEBHOOK_SECRET: { apps: ['ezpay'], layer: 'api' },
  STRIPE_PUBLISHABLE_KEY: { apps: ['ezpay'], layer: 'api' },
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: { apps: ['ezpay'], layer: 'web', client: true },

  // ── EZBill ──
  // EXCHANGE_RATE_API_KEY → IGNORED_VARS (exchangerate.host requires a key
  // now — pending migration to Frankfurter zero-key API + extraction as
  // `@ezstart/exchange-rate` shared SDK, cf. BACKLOG EB-060)
  RUN_EXCHANGE_RATES_ON_START: { apps: ['ezbill'], layer: 'api' },

  // ── AI providers (multi-app) ──
  OPENAI_API_KEY: { apps: ['ezstart'], layer: 'api' },
  OPENAI_ADMIN_KEY: { apps: ['ezstart'], layer: 'api' },
  ANTHROPIC_API_KEY: { apps: ['ezstart'], layer: 'api' },
  ANTHROPIC_ADMIN_KEY: { apps: ['ezstart'], layer: 'api' },
  GEMINI_API_KEY: {
    apps: ['ezstart', 'ezbill', 'gacha-analyzer', 'green-pulse', 'fengshui'],
    layer: 'api',
  },

  // ── EZStart monitoring (Atlas + CI tokens + health) ──
  MONGODB_ATLAS_PUBLIC_KEY: { apps: ['ezstart'], layer: 'api' },
  MONGODB_ATLAS_PRIVATE_KEY: { apps: ['ezstart'], layer: 'api' },
  MONGODB_ATLAS_PROJECT_ID: { apps: ['ezstart'], layer: 'api' },
  GITHUB_TOKEN: { apps: ['ezstart'], layer: 'api' },
  GITHUB_USERNAME: { apps: ['ezstart'], layer: 'api' },
  VERCEL_TOKEN: { apps: ['ezstart'], layer: 'api' },
  VERCEL_TEAM_ID: { apps: ['ezstart'], layer: 'api' },
  RAILWAY_TOKEN: { apps: ['ezstart'], layer: 'api' },
  HEALTH_CHECK_INTERVAL: { apps: ['ezstart'], layer: 'api' },
  HEALTH_CHECK_TIMEOUT: { apps: ['ezstart'], layer: 'api' },
  HEALTH_CHECK_RETRIES: { apps: ['ezstart'], layer: 'api' },

  // ── Logger verbosity (consumed by every API via @ezstart/logger/server) ──
  LOG_LEVEL: { apps: '*', layer: 'api' },

  // ── EZAuth publishable key (per-app — DIFFERENT value per web app) ──
  // Every web app has its own NEXT_PUBLIC_EZAUTH_KEY pointing to a distinct
  // publishable key registered in the EZAuth admin dashboard.
  NEXT_PUBLIC_EZAUTH_KEY: { apps: '*', layer: 'web', client: true },

  // ── GreenPulse web rewrites ──
  NEXT_PUBLIC_API_URL: { apps: ['green-pulse', 'gacha-analyzer'], layer: 'web', client: true },

  // ── Cross-domain JWT verify (apps NOT on *.ezstart.xyz) ──
  NEXT_PUBLIC_EZAUTH_JWT_PUBLIC_KEY: {
    apps: ['gacha-analyzer'],
    layer: 'web',
    client: true,
  },
} as const satisfies Record<string, VarTarget>

export type VarName = keyof typeof VAR_TARGETS

/**
 * Vars intentionally kept OUT of VAR_TARGETS (not pushed to cloud).
 *
 * - `ALERT_*` — ezstart monitoring alerting, feature codée mais pas câblée,
 *   laissée désactivée volontairement (pas de SMTP / Slack configuré).
 * - `ALLOW_PROD_MIGRATION` — safety flag manuel, set ponctuellement pour
 *   exécuter `migrate-roles.ts` en prod, jamais persistant.
 * - `PAYMENT_PROVIDER` — dev/test toggle pour forcer le mode console de
 *   Stripe, set seulement en `.env.local`.
 * - `ESG_*` + `WEBHOOK_SIGNING_SECRET` — green-pulse ESG SaaS provider pas
 *   wired, code stub avec fallback `''`. À réactiver quand un provider
 *   réel sera intégré (cf. BACKLOG GP-040/041/045/059, Plan 2).
 */
export const IGNORED_VARS: readonly string[] = [
  'ALERT_EMAIL_ENABLED',
  'ALERT_EMAIL_FROM',
  'ALERT_EMAIL_TO',
  'ALERT_SMTP_HOST',
  'ALERT_SMTP_PORT',
  'ALERT_SMTP_USER',
  'ALERT_SMTP_PASS',
  'ALERT_SLACK_ENABLED',
  'ALERT_SLACK_WEBHOOK',
  'ALLOW_PROD_MIGRATION',
  'PAYMENT_PROVIDER',
  'ESG_CLIENT_ID',
  'ESG_CLIENT_SECRET',
  'ESG_BASE_URL',
  'WEBHOOK_SIGNING_SECRET',
  'EXCHANGE_RATE_API_KEY',
]

/**
 * Resolve the concrete list of apps for a target (`*` → all apps in the
 * monorepo that have the matching layer).
 *
 * When `withWebOverrides=true` and the target is API-only, the `webOverrides`
 * list is merged in (used by push/audit to know fengshui/web needs MONGO_URL).
 */
export function resolveTargetApps(
  name: VarName,
  allApps: readonly AppName[],
  options: { layer: 'api' | 'web'; withWebOverrides?: boolean } = { layer: 'api' }
): readonly AppName[] {
  const t: VarTarget = VAR_TARGETS[name]
  const base = t.apps === '*' ? allApps : t.apps
  const layerMatches = t.layer === 'both' || t.layer === options.layer

  if (layerMatches) return base

  if (
    options.layer === 'web' &&
    options.withWebOverrides &&
    t.webOverrides &&
    t.webOverrides.length > 0
  ) {
    const overrides = t.webOverrides
    return base.filter(app => overrides.includes(app))
  }

  return []
}
