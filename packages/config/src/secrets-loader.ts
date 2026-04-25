/**
 * Monorepo-level env vars loader — HYBRID (root + per-app).
 *
 * Two-layer load:
 *   1. ROOT shared vars   → `<repo>/.env.{env}`           (must-be-identical: JWT_SECRET, MONGO_URL, DEPLOY_ENV)
 *   2. Per-app overrides  → `apps/<app>/<layer>/.env.{env}` (app-specific vars; values override root if duplicate)
 *
 * Files per environment:
 *   - `.env.local`      → local dev  (DEPLOY_ENV=local or unset)
 *   - `.env.staging`    → staging    (DEPLOY_ENV=staging)
 *   - `.env.production` → production (DEPLOY_ENV=production or NODE_ENV=production)
 *
 * Per-app file is consulted only when both `app` and `layer` are passed
 * (typically by `instrument.mts` for APIs). Web apps are loaded by
 * `@ezstart/next-config/withSharedEnv` which passes the same shape.
 *
 * @see SECRETS.md — canonical documentation
 * @see env-resolvers.ts — helpers (`getMongoUrl`, `getJwtSecret`)
 */

import * as dotenv from 'dotenv'
import path from 'path'
import { existsSync, readdirSync, readFileSync } from 'fs'

// NOTE: do NOT import @ezstart/logger here.
// This file is loaded by Next.js configs and Express bootstraps. `console` is
// enough for boot-time diagnostics — these run once at process start, output
// goes to stdout.

export interface LoadEnvOptions {
  /** App name — used to locate `apps/<app>/<layer>/.env.{env}`. */
  app?: string
  /** API or web layer — used to locate `apps/<app>/<layer>/.env.{env}`. */
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
 * Pick the env file basename for the current deploy environment.
 *
 * Priority:
 *   1. DEPLOY_ENV=production  → .env.production
 *   2. DEPLOY_ENV=staging     → .env.staging
 *   3. DEPLOY_ENV=local       → .env.local
 *   4. NODE_ENV=production    → .env.production
 *   5. default                → .env.local
 */
function pickEnvFileBasename(): string {
  const deploy = process.env.DEPLOY_ENV
  if (deploy === 'production') return '.env.production'
  if (deploy === 'staging') return '.env.staging'
  if (deploy === 'local') return '.env.local'
  if (process.env.NODE_ENV === 'production') return '.env.production'
  return '.env.local'
}

/**
 * Load KV pairs from a single dotenv file, with override semantics.
 *
 * - When `override=false` (default): existing `process.env[k]` wins.
 *   This is the standard dotenv behaviour — shell-exported vars beat file vars.
 * - When `override=true`: the file value replaces whatever is already set.
 *   This is used for per-app files so they can override shared root values.
 *
 * Returns the number of keys actually written.
 */
function loadDotenvFile(absPath: string, override: boolean): number {
  if (!existsSync(absPath)) return 0
  const parsed = dotenv.parse(readFileSync(absPath))
  let count = 0
  for (const [key, val] of Object.entries(parsed)) {
    if (!override && process.env[key] !== undefined) continue
    process.env[key] = val
    count++
  }
  return count
}

/**
 * Load env vars in two layers:
 *   1. Root `<repo>/.env.{env}` — shared vars, never overrides existing process.env (shell wins)
 *   2. Per-app `apps/<app>/<layer>/.env.{env}` — overrides root value if same key
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
  const envFile = pickEnvFileBasename()
  const root = findMonorepoRoot()

  // 1. Root shared vars (no override of shell-set vars)
  const rootEnv = path.join(root, envFile)
  const rootCount = loadDotenvFile(rootEnv, false)

  // 2. Per-app overrides (override root if duplicate; still respects shell vars
  //    that were set BEFORE this call — they are already in process.env).
  let appCount = 0
  let appEnvPath: string | undefined
  if (opts.app && opts.layer) {
    appEnvPath = path.join(root, 'apps', opts.app, opts.layer, envFile)
    appCount = loadDotenvFile(appEnvPath, true)
  }

  if (!opts.silent) {
    const appLabel = opts.app ? ` for ${opts.app}/${opts.layer ?? '?'}` : ''
    // eslint-disable-next-line no-console
    console.info(
      `🔐 [env] Loaded ${envFile}${appLabel}: root ${rootCount} vars, per-app ${appCount} vars`
    )
  }

  // Validate required vars (after both layers are loaded).
  if (opts.required && opts.required.length > 0) {
    const missing = opts.required.filter(k => !process.env[k])
    if (missing.length > 0) {
      const hints = missing.map(k => `   - ${k}`).join('\n')
      const sources = appEnvPath
        ? `\n\nSet them in ${rootEnv} (shared) or ${appEnvPath} (per-app).`
        : `\n\nSet them in ${rootEnv}.`
      throw new Error(
        `❌ Missing required env vars${opts.app ? ` for ${opts.app}/${opts.layer ?? 'api'}` : ''}:\n` +
          hints +
          sources
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
