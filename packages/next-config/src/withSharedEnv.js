import dotenv from 'dotenv'
import { existsSync, readdirSync } from 'fs'
import path from 'path'

/**
 * Walk up from cwd until we find pnpm-workspace.yaml (monorepo root).
 * Pure JS — we can't import the TS loader from .mjs Next config easily.
 */
function findMonorepoRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir)
  const { root } = path.parse(dir)
  while (true) {
    try {
      const entries = readdirSync(dir)
      if (entries.includes('pnpm-workspace.yaml')) return dir
    } catch {
      // ignore
    }
    if (dir === root) return startDir
    dir = path.dirname(dir)
  }
}

/**
 * Load root-level shared env BEFORE Next.js boots.
 * Must be called inside next.config.js (top-level, sync).
 *
 * Next.js loads `apps/{app}/web/.env.local` automatically, so app-specific
 * overrides keep working natively. This wrapper only adds the root layer.
 *
 * @param {string} [app] - optional app name (for logging)
 */
export function loadSharedEnv(app) {
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local'
  const root = findMonorepoRoot()
  const rootEnv = path.join(root, envFile)

  if (existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv })
    // eslint-disable-next-line no-console
    console.log(`🔐 [next] Loaded shared env from ${rootEnv}${app ? ` (app: ${app})` : ''}`)
  }
}

/**
 * Wrap a Next.js config (object or factory) so that root-level shared env
 * gets loaded before Next reads it.
 *
 * @example
 *   // next.config.js
 *   import { withSharedEnv } from '@ezstart/next-config/withSharedEnv'
 *   import { createNextConfig } from '@ezstart/next-config/compose'
 *   export default withSharedEnv('ezbill')(createNextConfig({ ... }))
 *
 * @param {string} [app]
 * @returns {(cfg: import('next').NextConfig) => import('next').NextConfig}
 */
export function withSharedEnv(app) {
  return nextConfig => {
    loadSharedEnv(app)
    return nextConfig
  }
}

export default withSharedEnv
