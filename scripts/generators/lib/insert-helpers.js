/**
 * Helpers for insert-app.js (reverse of extract-app.js).
 *
 * Responsibilities:
 *   - Detect standalone layout (multi-layer web+api+types vs single-layer)
 *   - Detect per-directory layer (web vs api) from telltale files
 *   - Compute env diff (standalone vars that differ from root.env.local)
 *   - Transform a standalone package.json into a monorepo per-app package.json
 *
 * Public API:
 *   - detectLayer(dir)                         -> 'web' | 'api' | 'types' | null
 *   - detectStandaloneLayout(standalonePath)   -> { layers: [{name, dir}...], root }
 *   - diffEnvAgainstRoot(standaloneEnv, rootEnv) -> { sharedMatches, perApp }
 *   - transformPackageJson(pkgJson, appName, layer) -> new pkgJson
 */

'use strict'

const fs = require('fs')
const path = require('path')

/**
 * Infer the layer (web / api / types) for a directory by inspecting its files.
 *
 * Heuristics:
 *   - `next.config.*`                 -> web
 *   - `next-env.d.ts`                 -> web
 *   - `src/app/` directory            -> web (Next.js App Router)
 *   - `src/index.ts` with express / server startup -> api
 *   - `src/server.ts`                 -> api
 *   - package.json `"main": "dist/...` + no next config -> api
 *   - package.json name ending in `/types` and no next config / no server -> types
 *
 * @param {string} dir - Directory to inspect.
 * @returns {'web' | 'api' | 'types' | null}
 */
function detectLayer(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null

  const has = relPath => fs.existsSync(path.join(dir, relPath))

  // Web signals (strongest)
  if (
    has('next.config.js') ||
    has('next.config.mjs') ||
    has('next.config.ts') ||
    has('next-env.d.ts') ||
    has(path.join('src', 'app'))
  ) {
    return 'web'
  }

  // API signals
  if (has(path.join('src', 'server.ts'))) return 'api'

  const indexTs = path.join(dir, 'src', 'index.ts')
  if (fs.existsSync(indexTs)) {
    try {
      const content = fs.readFileSync(indexTs, 'utf8')
      if (
        /express|createEzstartServer|startServer|listen\s*\(/i.test(content) ||
        /from\s+['"]@ezstart\/(api-core|express-core)['"]/.test(content)
      ) {
        return 'api'
      }
    } catch {
      /* ignore read errors */
    }
  }

  // Types-only fallback: has src/index.ts but no server signals, no next config
  // AND package.json name hints at types
  const pkgJsonPath = path.join(dir, 'package.json')
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
      const name = typeof pkg.name === 'string' ? pkg.name : ''
      if (/\/types$/.test(name) || /-types$/.test(name)) return 'types'
    } catch {
      /* ignore parse errors */
    }
  }

  return null
}

/**
 * Detect the layout of a standalone project produced by extract-app.js.
 *
 * Possible shapes:
 *   - multi-layer: standalone has sub-folders `web/`, `api/`, `types/` (or subset)
 *   - single-layer: standalone IS itself a web or api (no sub-layer folders)
 *
 * @param {string} standalonePath
 * @returns {{
 *   mode: 'multi' | 'single',
 *   layers: Array<{ name: 'web' | 'api' | 'types', dir: string }>,
 * }}
 */
function detectStandaloneLayout(standalonePath) {
  /** @type {Array<{name: 'web' | 'api' | 'types', dir: string}>} */
  const layers = []

  for (const candidate of ['web', 'api', 'types']) {
    const dir = path.join(standalonePath, candidate)
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const pkg = path.join(dir, 'package.json')
      if (fs.existsSync(pkg)) {
        // Respect detected layer but fall back to folder name if detection
        // is inconclusive (e.g. types/ without server signals).
        const detected = detectLayer(dir) || candidate
        layers.push({
          name: /** @type {'web' | 'api' | 'types'} */ (detected),
          dir,
        })
      }
    }
  }

  if (layers.length > 0) {
    return { mode: 'multi', layers }
  }

  // Single-layer: the standalonePath itself is the layer
  const layer = detectLayer(standalonePath)
  if (layer) {
    return { mode: 'single', layers: [{ name: layer, dir: standalonePath }] }
  }

  return { mode: 'single', layers: [] }
}

/**
 * Compare standalone env map to monorepo root env map.
 * Vars whose value matches root exactly are considered shared (no per-app write needed).
 * Vars that differ or don't exist at root are per-app overrides.
 *
 * @param {Map<string, string>} standaloneEnv
 * @param {Map<string, string>} rootEnv
 * @returns {{ sharedMatches: string[], perApp: Map<string, string> }}
 */
function diffEnvAgainstRoot(standaloneEnv, rootEnv) {
  /** @type {string[]} */
  const sharedMatches = []
  /** @type {Map<string, string>} */
  const perApp = new Map()

  for (const [key, value] of standaloneEnv) {
    if (rootEnv.has(key) && rootEnv.get(key) === value) {
      sharedMatches.push(key)
    } else {
      perApp.set(key, value)
    }
  }

  return { sharedMatches, perApp }
}

/**
 * Transform a standalone package.json into a monorepo-ready per-app package.json.
 *
 * Rules:
 *   - Replace `name` with monorepo convention:
 *       web   -> `web-<appName>`
 *       api   -> `api-<appName>`
 *       types -> `@<appName>/types`
 *   - Rewrite `@ezstart/*` deps to `"workspace:*"`
 *   - If `originalAppName` is provided, rewrite `@<originalAppName>/*` dep KEYS
 *     to `@<appName>/*` (e.g. `@green-pulse/types` -> `@test-imported/types`)
 *     so cross-layer references inside the imported app stay consistent.
 *   - Preserve everything else (scripts, version, other deps)
 *
 * @param {unknown} pkgJson
 * @param {string} appName
 * @param {'web' | 'api' | 'types'} layer
 * @param {{ originalAppName?: string | null }} [opts]
 * @returns {Record<string, unknown>}
 */
function transformPackageJson(pkgJson, appName, layer, opts) {
  const pkg =
    pkgJson && typeof pkgJson === 'object'
      ? { .../** @type {Record<string, unknown>} */ (pkgJson) }
      : {}
  const originalAppName =
    opts && typeof opts.originalAppName === 'string' ? opts.originalAppName : null

  // Name
  let name
  if (layer === 'web') name = `web-${appName}`
  else if (layer === 'api') name = `api-${appName}`
  else name = `@${appName}/types`
  pkg.name = name

  // Rewrite deps
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const existing = pkg[field]
    if (existing && typeof existing === 'object') {
      /** @type {Record<string, string>} */
      const rewritten = {}
      for (const [depName, depVersion] of Object.entries(
        /** @type {Record<string, string>} */ (existing)
      )) {
        let newKey = depName
        let newValue = depVersion

        // @ezstart/* -> workspace:*
        if (depName.startsWith('@ezstart/')) {
          newValue = 'workspace:*'
        }

        // @<originalAppName>/foo -> @<appName>/foo (rename cross-layer refs)
        if (originalAppName && depName.startsWith(`@${originalAppName}/`)) {
          newKey = `@${appName}/${depName.slice(originalAppName.length + 2)}`
          // Also ensure local cross-refs are workspace:*
          if (!newValue.startsWith('workspace:')) newValue = 'workspace:*'
        }

        rewritten[newKey] = newValue
      }
      pkg[field] = rewritten
    }
  }

  return pkg
}

/**
 * Infer the original app name from a standalone root package.json.
 * Extract-app.js writes `<app>-standalone` as the root name; strip the suffix.
 *
 * @param {string} standalonePath
 * @returns {string | null}
 */
function inferOriginalAppName(standalonePath) {
  const pkgPath = path.join(standalonePath, 'package.json')
  if (!fs.existsSync(pkgPath)) return null
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    const name = typeof pkg.name === 'string' ? pkg.name : ''
    const match = name.match(/^(.+)-standalone$/)
    if (match) return match[1]
    // Fallback: if name looks like a plain kebab-case slug, use it as-is.
    if (/^[a-z][a-z0-9-]*$/.test(name)) return name
    return null
  } catch {
    return null
  }
}

module.exports = {
  detectLayer,
  detectStandaloneLayout,
  diffEnvAgainstRoot,
  transformPackageJson,
  inferOriginalAppName,
}
