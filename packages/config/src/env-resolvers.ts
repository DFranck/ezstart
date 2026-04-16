/**
 * Generic env var resolvers.
 *
 * These helpers let shared env vars carry a small amount of dynamic shape so
 * the same root value can be consumed by every app:
 *
 *   MONGO_URL=mongodb+srv://.../{app}?...
 *     → getMongoUrl('ezbill')   // mongodb+srv://.../ezbill?...
 *
 *   Each environment (local, staging, production) has its own MONGO_URL
 *   pointing to a separate cluster. DB names are always just the app name.
 *
 *   SENTRY_DSN_EZAUTH=https://...
 *   SENTRY_DSN_EZBILL=https://...
 *     → getSentryDsn('ezauth')  // reads SENTRY_DSN_EZAUTH
 *
 * Conventions:
 *   - Root env vars are generic (no `EZXXX_` prefix). Per-app values that can
 *     be templated (MONGO_URL) use `{app}` / `{env}` placeholders.
 *   - When a value is genuinely unique per app (Sentry DSNs identify a
 *     distinct Sentry project each), we use an app-suffixed name so it stays
 *     self-documenting: `SENTRY_DSN_{APP_UPPER}`.
 *   - `JWT_SECRET` is shared across all apps by design (SSO tokens minted by
 *     ezauth must verify everywhere without re-keying).
 */

import type { AppName } from './urls.js'
import { getCurrentEnvironment } from './urls.js'

/**
 * Database environment suffix — ALWAYS empty.
 *
 * Each environment (local, staging, production) has its own MONGO_URL
 * pointing to a separate cluster/DB. The DB name is just the app name
 * (e.g. 'ezauth', 'ezbill') — no '-dev'/'-staging'/'-prod' suffix needed.
 */
function dbEnvSuffix(): string {
  return ''
}

/**
 * Uppercase an app name for env-var suffixing:
 *   'ezbill'          → 'EZBILL'
 *   'green-pulse'     → 'GREEN_PULSE'
 *   'gacha-analyzer'  → 'GACHA_ANALYZER'
 *   'asc-tcd'         → 'ASC_TCD'
 */
export function appToEnvSuffix(app: AppName): string {
  return app.toUpperCase().replace(/-/g, '_')
}

/**
 * Resolve the MongoDB connection string for the given app.
 *
 * Template placeholders:
 *   {app} → the app name (kebab-case preserved: 'green-pulse')
 *   {env} → 'dev' | 'staging' | 'prod'
 *
 * @throws if `MONGO_URL` is not set in the current environment.
 *
 * @example
 *   // MONGO_URL=mongodb+srv://.../{app}-{env}?...
 *   getMongoUrl('ezbill')
 *   // → mongodb+srv://.../ezbill-dev?... (in local)
 */
export function getMongoUrl(app: AppName): string {
  const tpl = process.env.MONGO_URL
  if (!tpl) {
    throw new Error(
      'MONGO_URL environment variable is required. ' +
        'Set it in the root .env.local / .env.staging / .env.production with ' +
        '{app} / {env} placeholders.'
    )
  }
  const suffix = dbEnvSuffix()
  const dbName = suffix ? `${app}-${suffix}` : app
  return tpl.replace(/\{app\}-\{env\}/g, dbName).replace(/\{app\}/g, app).replace(/\{env\}/g, suffix)
}

/**
 * Resolve the JWT signing secret.
 *
 * Same value across every app by design — SSO tokens minted by ezauth must
 * verify on every consumer API without re-keying.
 *
 * @throws if `JWT_SECRET` is not set.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
        'Set it in the root .env.local / .env.staging / .env.production.'
    )
  }
  return secret
}

/**
 * Resolve the Sentry DSN for the given app.
 *
 * Reads `SENTRY_DSN_{APP_UPPER}` (e.g. `SENTRY_DSN_EZAUTH`). Sentry DSNs are
 * per-project by design so we can't template them — instead we scope by
 * suffix. Falls back to a generic `SENTRY_DSN` if the app-specific one is
 * absent (convenient for one-off scripts).
 *
 * Returns `undefined` when nothing is configured — callers decide whether to
 * warn or proceed silently.
 */
export function getSentryDsn(app: AppName): string | undefined {
  const suffix = appToEnvSuffix(app)
  return process.env[`SENTRY_DSN_${suffix}`] ?? process.env.SENTRY_DSN
}
