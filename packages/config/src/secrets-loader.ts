/**
 * Monorepo-level env vars loader.
 *
 * Loads secrets in this order (later overrides earlier):
 *   1. Root `.env.{NODE_ENV}` (e.g. `.env.local` in dev, `.env.production` in prod)
 *   2. App-specific `apps/{app}/{layer}/.env.{NODE_ENV}` (per-app overrides)
 *
 * Shared secrets (API keys, SDKs, infra tokens) live at the monorepo root.
 * App-specific secrets (MONGO_URL, JWT_SECRET, OAuth callbacks) stay in the
 * app-local file.
 *
 * @see DEPLOY.md — "Secrets architecture"
 */

import * as dotenv from 'dotenv'
import path from 'path'
import { existsSync, readdirSync } from 'fs'
import { logger } from '@ezstart/logger/server'

export interface LoadEnvOptions {
  /** App name (e.g. 'ezbill'). Omit to only load root shared env. */
  app?: string
  /** API or web layer. Required if `app` is set. */
  layer?: 'api' | 'web'
  /**
   * Required env keys to validate after loading.
   * Throws with a clear message if any are missing.
   */
  required?: string[]
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
 * Load env vars from monorepo root first, then app-specific overrides.
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
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local'

  const root = findMonorepoRoot()
  const rootEnv = path.join(root, envFile)

  const loaded: string[] = []

  // 1. Root shared env (optional — graceful if missing for backward compat)
  if (existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv })
    loaded.push(`root:${envFile}`)
  }

  // 2. App override (wins over root)
  if (opts.app && opts.layer) {
    const appEnv = path.join(root, 'apps', opts.app, opts.layer, envFile)
    if (existsSync(appEnv)) {
      dotenv.config({ path: appEnv, override: true })
      loaded.push(`${opts.app}/${opts.layer}:${envFile}`)
    }
  }

  if (!opts.silent && loaded.length > 0) {
    logger.info(`🔐 [env] Loaded: ${loaded.join(' → ')}`)
  }

  // 3. Validate required vars
  if (opts.required && opts.required.length > 0) {
    const missing = opts.required.filter(k => !process.env[k])
    if (missing.length > 0) {
      const target = opts.app && opts.layer ? `apps/${opts.app}/${opts.layer}/${envFile}` : envFile
      throw new Error(
        `❌ Missing required env vars${opts.app ? ` for ${opts.app}/${opts.layer}` : ''}:\n` +
          missing.map(k => `   - ${k}`).join('\n') +
          `\n\nSet them in ${rootEnv} (shared) or ${target} (app-specific).`
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
