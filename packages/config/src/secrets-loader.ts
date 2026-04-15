/**
 * Monorepo-level env vars loader — ROOT-ONLY + GENERIC (no prefix).
 *
 * All secrets live in a single file at the monorepo root, selected by
 * deployment environment:
 *
 *   - `.env.local`      → local dev  (DEPLOY_ENV=local or unset)
 *   - `.env.staging`    → staging    (DEPLOY_ENV=staging)
 *   - `.env.production` → production (DEPLOY_ENV=production or NODE_ENV=production)
 *
 * Every variable is loaded as-is into `process.env`. No prefix stripping, no
 * per-app filtering. Values that need to vary per app are templated or
 * resolved through helpers in `env-resolvers.ts` (see `getMongoUrl`, etc.).
 *
 * @see SECRETS.md — canonical documentation
 * @see env-resolvers.ts — helpers for generic vars (`getMongoUrl`, `getJwtSecret`, `getSentryDsn`)
 */

import * as dotenv from 'dotenv'
import path from 'path'
import { existsSync, readdirSync, readFileSync } from 'fs'

// NOTE: do NOT import @ezstart/logger here.
// This file is loaded by Next.js configs and Express bootstraps. Pulling in
// the logger drags Sentry's Node SDK (and therefore `async_hooks`) into the
// client bundle whenever it transitively appears in a "use client" import
// chain (e.g. via `@ezstart/config`). `console` is enough for boot-time
// diagnostics — these run once at process start, output goes to stdout.

export interface LoadEnvOptions {
  /** App name (for logs only; no filtering is applied). */
  app?: string
  /** API or web layer (for logs only). */
  layer?: 'api' | 'web'
  /**
   * Required env keys to validate after loading (generic runtime names,
   * e.g. `MONGO_URL`, `JWT_SECRET`).
   * Throws with a clear message if any are missing.
   */
  required?: readonly string[]
  /** Suppress info logs (useful for CLI scripts) */
  silent?: boolean
}

/**
 * Walk up from the starting directory until we find the monorepo root
 * (identified by `pnpm-workspace.yaml`).
 */
function findMonorepoRoot(startDir: string = process.cwd()): string {
  let dir = path.resolve(startDir)
  const { root } = path.parse(dir)

  while (true) {
    try {
      const entries = readdirSync(dir)
      if (entries.includes('pnpm-workspace.yaml')) {
        return dir
      }
    } catch {
      // Unreadable — bail
    }
    if (dir === root) {
      // Fallback: assume cwd if nothing found (prevents throwing in edge cases)
      return startDir
    }
    dir = path.dirname(dir)
  }
}

/**
 * Mask a secret value for safe logging.
 * Returns `****` for very short values, or `abcd***xyz` for longer ones.
 */
function mask(value: string | undefined): string {
  if (!value) return '(empty)'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

/**
 * Pick the root env file for the current deploy environment.
 *
 * Priority:
 *   1. DEPLOY_ENV=production  → .env.production
 *   2. DEPLOY_ENV=staging     → .env.staging
 *   3. DEPLOY_ENV=local       → .env.local
 *   4. NODE_ENV=production    → .env.production
 *   5. default                → .env.local
 */
function pickEnvFile(): string {
  const deploy = process.env.DEPLOY_ENV
  if (deploy === 'production') return '.env.production'
  if (deploy === 'staging') return '.env.staging'
  if (deploy === 'local') return '.env.local'
  if (process.env.NODE_ENV === 'production') return '.env.production'
  return '.env.local'
}

/**
 * Load env vars from the monorepo root. No prefix stripping, no filtering —
 * every key in the file is exported verbatim. Per-app customization is
 * achieved via templating and helpers (see `env-resolvers.ts`).
 *
 * App-local `.env.*` files are NOT read — the root file is the only source.
 * (`apps/<app>/api/.env.test` is a special case loaded directly by vitest.)
 *
 * @example
 * ```ts
 * loadSharedEnv({
 *   app: 'ezbill',
 *   layer: 'api',
 *   required: ['MONGO_URL', 'JWT_SECRET'],
 * })
 * ```
 */
export function loadSharedEnv(opts: LoadEnvOptions = {}): void {
  const envFile = pickEnvFile()

  const root = findMonorepoRoot()
  const rootEnv = path.join(root, envFile)

  let loadedCount = 0

  if (existsSync(rootEnv)) {
    // dotenv.parse gives us the raw KV pairs without mutating process.env yet,
    // so we can preserve the standard dotenv behaviour (shell-exported vars win).
    const parsed = dotenv.parse(readFileSync(rootEnv))

    for (const [key, val] of Object.entries(parsed)) {
      if (process.env[key] !== undefined) continue
      process.env[key] = val
      loadedCount++
    }
  }

  if (!opts.silent) {
    // eslint-disable-next-line no-console
    console.info(
      `🔐 [env] Loaded root ${envFile}${opts.app ? ` for ${opts.app}/${opts.layer ?? 'api'}` : ''}: ${loadedCount} vars`
    )
  }

  // Validate required vars (generic runtime names).
  if (opts.required && opts.required.length > 0) {
    const missing = opts.required.filter(k => !process.env[k])
    if (missing.length > 0) {
      const hints = missing.map(k => `   - ${k}`).join('\n')
      throw new Error(
        `❌ Missing required env vars${opts.app ? ` for ${opts.app}/${opts.layer ?? 'api'}` : ''}:\n` +
          hints +
          `\n\nSet them in ${rootEnv}.`
      )
    }
  }
}

/**
 * Return a masked snapshot of selected env keys. Safe to log.
 */
export function maskedEnv(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of keys) {
    out[k] = mask(process.env[k])
  }
  return out
}

export { findMonorepoRoot }
