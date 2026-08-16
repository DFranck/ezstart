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
 * Conventions:
 *   - Root env vars are generic (no `EZXXX_` prefix). Per-app values that can
 *     be templated (MONGO_URL) use `{app}` / `{env}` placeholders.
 *   - `JWT_SECRET` is shared across all apps by design (SSO tokens minted by
 *     ezauth must verify everywhere without re-keying).
 */

import type { AppName } from './urls.js'

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
        'Set it in apps/<app>/<api|web>/.env.{local,staging,production} with ' +
        '{app} / {env} placeholders. Per-app cascade is canonical (no root .env layer).'
    )
  }
  const suffix = dbEnvSuffix()
  const dbName = suffix ? `${app}-${suffix}` : app
  return tpl
    .replace(/\{app\}-\{env\}/g, dbName)
    .replace(/\{app\}/g, app)
    .replace(/\{env\}/g, suffix)
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
        'Set it in apps/<app>/<api|web>/.env.{local,staging,production}. ' +
        'Per-app cascade is canonical (no root .env layer); the value MUST be ' +
        'identical across every app for SSO interop.'
    )
  }
  return secret
}
