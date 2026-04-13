/**
 * Monorepo-level env vars loader — ROOT-ONLY + PREFIXED ARCHITECTURE.
 *
 * All secrets live in a single file at the monorepo root:
 *   - `.env.local`      in development (NODE_ENV !== 'production')
 *   - `.env.production` in production
 *
 * Two kinds of vars are supported:
 *
 *   1. SHARED (no prefix) — loaded as-is, visible to every app.
 *      Example: `OPENAI_API_KEY`, `RESEND_API_KEY`, `GITHUB_TOKEN`.
 *
 *   2. PER-APP (`{APP}_VARNAME`) — stripped of prefix at runtime, but ONLY
 *      for the app currently booting. Vars for OTHER apps are ignored so
 *      they never leak into the wrong process.
 *      Example: `EZAUTH_MONGO_URL` → becomes `MONGO_URL` for the EZAuth API.
 *
 * `NEXT_PUBLIC_*` vars are NEVER prefixed (Next.js convention requires the
 * literal `NEXT_PUBLIC_` prefix to be readable from the client bundle).
 *
 * @see DEPLOY.md — "Secrets architecture"
 * @see SECRETS.md
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

/**
 * Known app prefixes. Vars starting with `{PREFIX}_` are treated as per-app.
 * - If the prefix matches the booting app, the stripped key is exported.
 * - If it matches a DIFFERENT app, the var is ignored (not leaked).
 * - If no known prefix matches, the var is treated as SHARED.
 *
 * Keep this list in sync with `apps/*` folder names (uppercased, `-` → `_`).
 */
export const KNOWN_APP_PREFIXES = [
  'EZAUTH',
  'EZBILL',
  'EZPAY',
  'EZSTART',
  'GREENPULSE',
  'GACHA_ANALYZER',
  'FENGSHUI',
  'ASC_TCD',
] as const

export type KnownAppPrefix = (typeof KNOWN_APP_PREFIXES)[number]

/**
 * Map an app folder name (kebab-case) to its env var prefix (UPPER_SNAKE).
 *   'green-pulse'    → 'GREENPULSE'
 *   'gacha-analyzer' → 'GACHA_ANALYZER'
 *   'ezauth'         → 'EZAUTH'
 */
export function appToPrefix(app: string): string {
  // Special cases: compact names we decided to keep unsegmented.
  if (app === 'green-pulse') return 'GREENPULSE'
  return app.toUpperCase().replace(/-/g, '_')
}

export interface LoadEnvOptions {
  /** App name (e.g. 'ezbill'). Omit to only load shared env. */
  app?: string
  /** API or web layer. Optional. */
  layer?: 'api' | 'web'
  /**
   * Required env keys to validate after loading (UNPREFIXED — use the
   * runtime name, e.g. `MONGO_URL`, not `EZAUTH_MONGO_URL`).
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
 * Given the booting app prefix, classify a key:
 *   - 'shared'  → no known prefix matched, export as-is
 *   - 'self'    → key starts with `{myPrefix}_`, strip and export
 *   - 'foreign' → key starts with a different known prefix, IGNORE
 */
function classifyKey(
  key: string,
  myPrefix: string | null
): { kind: 'shared' | 'self' | 'foreign'; exportedKey: string } {
  // NEXT_PUBLIC_* are never prefixed — always shared (Next convention).
  if (key.startsWith('NEXT_PUBLIC_')) return { kind: 'shared', exportedKey: key }

  for (const prefix of KNOWN_APP_PREFIXES) {
    if (key.startsWith(`${prefix}_`)) {
      if (myPrefix && prefix === myPrefix) {
        return { kind: 'self', exportedKey: key.slice(prefix.length + 1) }
      }
      return { kind: 'foreign', exportedKey: key }
    }
  }
  return { kind: 'shared', exportedKey: key }
}

/**
 * Load env vars from the monorepo root, applying prefix stripping for the
 * booting app. Root file is the ONLY source — app-local `.env.local` files
 * are ignored by design (see SECRETS.md).
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

  const myPrefix = opts.app ? appToPrefix(opts.app) : null

  let sharedCount = 0
  let selfCount = 0
  let foreignCount = 0

  if (existsSync(rootEnv)) {
    // dotenv.parse gives us the raw KV pairs without mutating process.env yet.
    const parsed = dotenv.parse(readFileSync(rootEnv))

    for (const [rawKey, rawVal] of Object.entries(parsed)) {
      const { kind, exportedKey } = classifyKey(rawKey, myPrefix)

      if (kind === 'foreign') {
        foreignCount++
        continue
      }

      // Don't override already-set env vars (mirrors dotenv default behaviour:
      // shell-exported vars win over .env files).
      if (process.env[exportedKey] !== undefined) continue

      process.env[exportedKey] = rawVal

      if (kind === 'self') selfCount++
      else sharedCount++
    }
  }

  if (!opts.silent) {
    // eslint-disable-next-line no-console
    console.info(
      `🔐 [env] Loaded from root ${envFile}${opts.app ? ` for ${opts.app}` : ''}: ` +
        `${sharedCount} shared, ${selfCount} app-specific` +
        (foreignCount > 0 ? `, ${foreignCount} skipped (other apps)` : '')
    )
  }

  // Validate required vars (unprefixed — runtime names).
  if (opts.required && opts.required.length > 0) {
    const missing = opts.required.filter(k => !process.env[k])
    if (missing.length > 0) {
      const prefixedHints = myPrefix
        ? missing.map(k => `   - ${k}   (root: ${myPrefix}_${k})`).join('\n')
        : missing.map(k => `   - ${k}`).join('\n')
      throw new Error(
        `❌ Missing required env vars${opts.app ? ` for ${opts.app}/${opts.layer ?? 'api'}` : ''}:\n` +
          prefixedHints +
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
