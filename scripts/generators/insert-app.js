/**
 * insert-app.js — Import a standalone project back into the monorepo.
 *
 * Reverse operation of extract-app.js. Takes a self-contained standalone
 * produced by extract-app.js (or a similar single-layer project) and places
 * it under `apps/<app-name>/` with the correct monorepo wiring.
 *
 * For SCAFFOLDING a brand new (empty) app, use `scaffold-app.js` instead.
 *
 * Usage:
 *   node scripts/generators/insert-app.js <standalone-path> <app-name> [flags]
 *   node scripts/generators/insert-app.js --path <dir> --name <app> [flags]
 *
 * Flags:
 *   --dry-run         Print the plan without copying anything.
 *   --force           Overwrite apps/<app-name>/ if it already exists.
 *   --layer <auto|web|api>
 *                     For single-layer standalones, force the layer instead
 *                     of auto-detecting.
 *   --help, -h        Show this help.
 *
 * Behavior:
 *   - Detects multi-layer (web/ + api/ + types/) vs single-layer standalones.
 *   - Copies each layer to apps/<app-name>/<layer>/ (minus build artifacts
 *     and envs — envs are re-integrated separately).
 *   - Rewrites per-layer package.json: `@ezstart/*` deps become `workspace:*`,
 *     and `name` is normalized to the monorepo convention.
 *   - Diffs the standalone `.env.local` against the monorepo root `.env.local`:
 *     matching vars are treated as shared (no duplication), differing vars go
 *     into apps/<app-name>/<layer>/.env.local.
 *   - Emits a .env.example alongside each per-app .env.local (same keys,
 *     empty values).
 *
 * NOT done here (intentional):
 *   - Port registration in packages/config/src/urls.ts (do it manually or run
 *     scaffold-app.js first to reserve ports — the standalone may want custom
 *     ports anyway).
 *   - Root tsconfig references.
 *   - Root package.json dev scripts.
 *   Reason: insert-app is meant for re-importing a project that was round-
 *   tripped through extract, where wiring decisions are project-specific.
 *   The script prints what remains to be wired.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const { ROOT_DIR, APPS_DIR } = require('./lib/utils')
const { parseEnvFile } = require('./lib/env-handler')
const {
  detectStandaloneLayout,
  diffEnvAgainstRoot,
  transformPackageJson,
  inferOriginalAppName,
} = require('./lib/insert-helpers')

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  console.info(`
insert-app — import a standalone project back into the monorepo (reverse of extract-app)

Usage:
  node scripts/generators/insert-app.js <standalone-path> <app-name> [flags]
  node scripts/generators/insert-app.js --path <dir> --name <app> [flags]

Flags:
  --dry-run                 Print the plan without writing files.
  --force                   Overwrite apps/<app-name>/ if it exists.
  --layer <auto|web|api>    Force layer for a single-layer standalone (default: auto).
  --help, -h                Show this help.

Examples:
  node scripts/generators/insert-app.js /tmp/green-pulse-standalone test-imported
  node scripts/generators/insert-app.js --path ../my-app --name my-app --dry-run
`)
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  /** @type {string | null} */
  let standalonePath = null
  /** @type {string | null} */
  let name = null
  let dryRun = false
  let force = false
  /** @type {'auto' | 'web' | 'api'} */
  let layer = 'auto'

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--path' && argv[i + 1]) {
      standalonePath = argv[++i]
    } else if (arg === '--name' && argv[i + 1]) {
      name = argv[++i]
    } else if (arg === '--layer' && argv[i + 1]) {
      const v = argv[++i]
      if (v !== 'auto' && v !== 'web' && v !== 'api') {
        console.error(`Error: --layer must be one of auto|web|api (got ${v})`)
        process.exit(1)
      }
      layer = v
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--force') {
      force = true
    } else if (!arg.startsWith('--')) {
      if (!standalonePath) standalonePath = arg
      else if (!name) name = arg
    }
  }

  if (!standalonePath || !name) {
    console.error('Error: missing required arguments')
    printHelp()
    process.exit(1)
  }

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(`Error: app name "${name}" is not a valid kebab-case slug`)
    process.exit(1)
  }

  return {
    standalonePath: path.resolve(standalonePath),
    name,
    dryRun,
    force,
    layer,
  }
}

// ---------------------------------------------------------------------------
// Copy helpers
// ---------------------------------------------------------------------------

const COPY_SKIP = new Set([
  'node_modules',
  '.next',
  'dist',
  '.turbo',
  '.cache',
  'coverage',
  '.git',
  'tsconfig.tsbuildinfo',
  // Envs handled separately
  '.env',
  '.env.local',
  '.env.staging',
  '.env.production',
  '.env.test',
])

/**
 * @param {string} src
 * @param {string} dest
 * @returns {{ files: number, dirs: number }}
 */
function copyDirSync(src, dest) {
  const stats = { files: 0, dirs: 0 }
  fs.mkdirSync(dest, { recursive: true })
  stats.dirs++
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    if (COPY_SKIP.has(entry.name)) continue
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      const sub = copyDirSync(srcPath, destPath)
      stats.files += sub.files
      stats.dirs += sub.dirs
    } else {
      fs.copyFileSync(srcPath, destPath)
      stats.files++
    }
  }
  return stats
}

/**
 * Remove a directory recursively. No-op if it doesn't exist.
 * @param {string} dir
 */
function rmDirSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------------------
// Per-layer processing
// ---------------------------------------------------------------------------

/**
 * Copy a single layer from the standalone into apps/<appName>/<layer>/.
 * Rewrites package.json along the way.
 *
 * @param {{
 *   srcDir: string,
 *   destDir: string,
 *   appName: string,
 *   layer: 'web' | 'api' | 'types',
 *   originalAppName: string | null,
 *   dryRun: boolean,
 * }} args
 * @returns {{ files: number, dirs: number }}
 */
function processLayer({ srcDir, destDir, appName, layer, originalAppName, dryRun }) {
  if (dryRun) {
    console.info(`  [DRY] Would copy ${srcDir} -> ${destDir}`)
    return { files: 0, dirs: 0 }
  }

  const stats = copyDirSync(srcDir, destDir)

  // Rewrite package.json
  const pkgPath = path.join(destDir, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      const rewritten = transformPackageJson(raw, appName, layer, { originalAppName })
      fs.writeFileSync(pkgPath, JSON.stringify(rewritten, null, 2) + '\n')
    } catch (err) {
      console.warn(`  Warning: failed to rewrite ${pkgPath}: ${String(err)}`)
    }
  }

  return stats
}

// ---------------------------------------------------------------------------
// Env re-integration
// ---------------------------------------------------------------------------

/**
 * Write a per-app .env.local (only vars not already shared at root) plus a
 * matching .env.example template.
 *
 * @param {{
 *   layerDir: string,
 *   perAppVars: Map<string, string>,
 *   appName: string,
 *   layer: 'web' | 'api' | 'types',
 *   dryRun: boolean,
 * }} args
 * @returns {{ written: boolean, count: number }}
 */
function writePerAppEnv({ layerDir, perAppVars, appName, layer, dryRun }) {
  if (perAppVars.size === 0) {
    return { written: false, count: 0 }
  }

  if (dryRun) {
    return { written: false, count: perAppVars.size }
  }

  const sortedKeys = [...perAppVars.keys()].sort()

  const localLines = [
    `# ${appName} ${layer} — per-app env (imported by insert-app.js)`,
    `# Vars shared with the monorepo root .env.local are NOT listed here.`,
    '',
  ]
  const exampleLines = [`# ${appName} ${layer} — per-app env template (committed)`, '']

  for (const key of sortedKeys) {
    const value = perAppVars.get(key) || ''
    const needsQuote = /[\s#'"\\$`]/.test(value)
    const written = needsQuote ? `"${value.replace(/"/g, '\\"')}"` : value
    localLines.push(`${key}=${written}`)
    exampleLines.push(`${key}=`)
  }
  localLines.push('')
  exampleLines.push('')

  fs.writeFileSync(path.join(layerDir, '.env.local'), localLines.join('\n'))
  fs.writeFileSync(path.join(layerDir, '.env.example'), exampleLines.join('\n'))

  return { written: true, count: perAppVars.size }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const {
    standalonePath,
    name,
    dryRun,
    force,
    layer: layerOverride,
  } = parseArgs(process.argv.slice(2))

  // Validate standalone exists
  if (!fs.existsSync(standalonePath) || !fs.statSync(standalonePath).isDirectory()) {
    console.error(`Error: standalone path not found or not a directory: ${standalonePath}`)
    process.exit(1)
  }

  // Validate target
  const appDir = path.join(APPS_DIR, name)
  if (fs.existsSync(appDir)) {
    if (!force) {
      console.error(`Error: apps/${name}/ already exists. Use --force to overwrite.`)
      process.exit(1)
    }
    if (!dryRun) {
      console.info(`  --force: removing existing apps/${name}/`)
      rmDirSync(appDir)
    } else {
      console.info(`  [DRY] Would remove existing apps/${name}/`)
    }
  }

  // Detect layout
  const layout = detectStandaloneLayout(standalonePath)
  if (layout.layers.length === 0) {
    console.error(`Error: could not detect any web/api/types layer in ${standalonePath}`)
    console.error('  - Multi-layer expected: subfolders web/, api/, types/')
    console.error('  - Single-layer expected: next.config.*, src/app/, src/server.ts, etc.')
    process.exit(1)
  }

  // Apply --layer override in single-layer mode
  if (layout.mode === 'single' && layerOverride !== 'auto') {
    layout.layers[0].name = layerOverride
  }

  // Try to infer original app name (so we can rewrite cross-layer @<old>/* refs)
  const originalAppName = inferOriginalAppName(standalonePath)

  console.info(
    `\nInserting standalone "${standalonePath}" as app "${name}"${dryRun ? ' (DRY RUN)' : ''}\n`
  )
  console.info(`Layout: ${layout.mode}`)
  if (originalAppName && originalAppName !== name) {
    console.info(
      `Original app name detected: "${originalAppName}" → rewriting local workspace refs`
    )
  }
  for (const l of layout.layers) {
    console.info(`  - ${l.name}: ${l.dir}`)
  }

  // Process each layer
  let totalFiles = 0
  let totalDirs = 0
  const envReport = []

  const rootEnvPath = path.join(ROOT_DIR, '.env.local')
  const rootEnv = parseEnvFile(rootEnvPath)

  for (const l of layout.layers) {
    const destDir = path.join(appDir, l.name)
    console.info(`\n  Processing ${l.name}/ ...`)

    const stats = processLayer({
      srcDir: l.dir,
      destDir,
      appName: name,
      layer: l.name,
      originalAppName,
      dryRun,
    })
    totalFiles += stats.files
    totalDirs += stats.dirs

    // Env re-integration: parse standalone .env.local at the layer OR project root
    /** @type {Map<string, string>} */
    const standaloneEnv = new Map()

    // Multi-layer: envs at project root AND per-layer (extract-app emits at root only)
    if (layout.mode === 'multi') {
      const rootStandaloneEnv = parseEnvFile(path.join(standalonePath, '.env.local'))
      for (const [k, v] of rootStandaloneEnv) standaloneEnv.set(k, v)
      const layerEnv = parseEnvFile(path.join(l.dir, '.env.local'))
      for (const [k, v] of layerEnv) standaloneEnv.set(k, v)
    } else {
      const singleEnv = parseEnvFile(path.join(l.dir, '.env.local'))
      for (const [k, v] of singleEnv) standaloneEnv.set(k, v)
    }

    const { sharedMatches, perApp } = diffEnvAgainstRoot(standaloneEnv, rootEnv)
    const result = writePerAppEnv({
      layerDir: destDir,
      perAppVars: perApp,
      appName: name,
      layer: l.name,
      dryRun,
    })

    envReport.push({
      layer: l.name,
      total: standaloneEnv.size,
      shared: sharedMatches.length,
      perApp: perApp.size,
      written: result.written,
    })
  }

  // Summary
  console.info('\n========================================')
  console.info(`  ${dryRun ? 'Dry run complete (no files written)' : 'Insert complete!'}`)
  console.info(`  Target: apps/${name}/`)
  if (!dryRun) {
    console.info(`  Files: ${totalFiles}`)
    console.info(`  Dirs:  ${totalDirs}`)
  }
  for (const r of envReport) {
    console.info(
      `  Env [${r.layer}]: ${r.total} vars → ${r.shared} shared (root), ${r.perApp} per-app${
        r.written ? ' (written)' : ''
      }`
    )
  }
  console.info('========================================\n')

  if (!dryRun) {
    console.info('Next steps (manual — by design):')
    console.info('  1. Register ports for this app in packages/config/src/urls.ts')
    console.info('  2. Add tsconfig references in the root tsconfig.json')
    console.info('  3. Add a `dev:<shortcut>` script in the root package.json if needed')
    console.info('  4. Run: pnpm install')
    console.info(`  5. Run: pnpm --filter web-${name} typecheck (or api-${name})`)
    console.info('  6. Review apps/' + name + '/<layer>/.env.local — rotate secrets!')
    console.info('')

    // Attempt a minimal validation: pnpm install
    if (process.argv.includes('--validate')) {
      console.info('Validating with `pnpm install`...')
      try {
        execSync('pnpm install', { cwd: ROOT_DIR, stdio: 'inherit' })
        console.info('\n[OK] pnpm install passed')
      } catch {
        console.error('\n[FAIL] pnpm install failed — review the output above')
        process.exit(1)
      }
    }
  }
}

main()
