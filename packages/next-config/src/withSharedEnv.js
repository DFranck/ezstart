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

function pickEnvFileBasename() {
  const deploy = process.env.DEPLOY_ENV
  if (deploy === 'production') return '.env.production'
  if (deploy === 'staging') return '.env.staging'
  if (deploy === 'local') return '.env.local'
  if (process.env.NODE_ENV === 'production') return '.env.production'
  return '.env.local'
}

/**
 * Load a single dotenv file. When `override=true`, file values replace any
 * existing process.env value; when `override=false`, existing wins (shell
 * vars beat file vars).
 */
function loadFile(absPath, override) {
  if (!existsSync(absPath)) return 0
  // dotenv.config respects existing process.env by default; passing override
  // emulates the same behaviour we want for per-app files.
  const result = dotenv.config({ path: absPath, override: override === true })
  return result.parsed ? Object.keys(result.parsed).length : 0
}

/**
 * Load root-level shared env BEFORE Next.js boots, then load the app's
 * own `apps/<app>/web/.env.{env}` to override per-app values.
 *
 * Note: Next.js will ALSO auto-load `apps/<app>/web/.env.local` on its own,
 * but doing it here too ensures the values are present in process.env before
 * `next.config.js` runs — important for code that reads env in the config
 * factory itself (e.g. PWA, withBundleAnalyzer).
 *
 * @param {string} [app] - app name for locating per-app file
 */
export function loadSharedEnv(app) {
  const envFile = pickEnvFileBasename()
  const root = findMonorepoRoot()

  // 1. Root shared vars (no override — shell wins)
  const rootEnv = path.join(root, envFile)
  const rootCount = loadFile(rootEnv, false)

  // 2. Per-app overrides
  let appCount = 0
  if (app) {
    const appEnv = path.join(root, 'apps', app, 'web', envFile)
    appCount = loadFile(appEnv, true)
  }

  // eslint-disable-next-line no-console
  console.log(
    `🔐 [next] Loaded ${envFile}${app ? ` for ${app}/web` : ''}: root ${rootCount} vars, per-app ${appCount} vars`
  )
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
