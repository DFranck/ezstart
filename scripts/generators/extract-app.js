/**
 * Extract an app from the monorepo into a standalone project.
 *
 * Usage:
 *   node scripts/generators/extract-app.js --name gacha-analyzer --output ../extracted/gacha-analyzer
 *   node scripts/generators/extract-app.js green-pulse /tmp/green-pulse-standalone   # positional shorthand
 *   node scripts/generators/extract-app.js --help
 *
 * The standalone project is self-contained: env vars referenced via
 * `process.env.<NAME>` in the app + transitive packages are extracted from
 * the monorepo's root `.env.local` + per-app `.env.local` files into a fresh
 * `.env.local` (with values) and `.env.example` (with empty placeholders).
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { ROOT_DIR, APPS_DIR, appExists } = require('./lib/utils')
const {
  collectEnvVarNames,
  parseEnvFile,
  mergeEnvSources,
  generateEnvFiles,
} = require('./lib/env-handler')

const PACKAGES_DIR = path.join(ROOT_DIR, 'packages')

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function printHelp() {
  console.info(`
extract-app — extract a monorepo app into a self-contained standalone project

Usage:
  node scripts/generators/extract-app.js --name <app> --output <dir> [flags]
  node scripts/generators/extract-app.js <app> <dir> [flags]

Flags:
  --name <app>      App name under apps/ (e.g. green-pulse)
  --output <dir>    Output directory (must NOT exist)
  --dry-run         Print plan without writing files
  --test            After extraction, run pnpm install + pnpm build
  --help, -h        Show this help

Behavior:
  - Copies app sub-projects (web, api, types) to the output root
  - Copies all transitive @ezstart/* package dependencies into packages/
  - Generates root package.json, tsconfig.json, pnpm-workspace.yaml, README.md
  - Generates self-contained .env.local + .env.example by grepping
    process.env.<NAME> usages and resolving against root + per-app .env.local
`)
}

function parseArgs() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp()
    process.exit(0)
  }

  let name = null
  let output = null
  let dryRun = false

  // Flag pairs
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      name = args[i + 1]
      i++
    } else if (args[i] === '--output' && args[i + 1]) {
      output = args[i + 1]
      i++
    } else if (args[i] === '--dry-run') {
      dryRun = true
    } else if (args[i] === '--test') {
      // handled in main()
    } else if (!args[i].startsWith('--')) {
      // Positional: first = name, second = output
      if (!name) name = args[i]
      else if (!output) output = args[i]
    }
  }

  if (!name || !output) {
    console.error('Error: missing required args')
    printHelp()
    process.exit(1)
  }

  return { name, output: path.resolve(output), dryRun }
}

// ---------------------------------------------------------------------------
// Dependency resolution
// ---------------------------------------------------------------------------

/** Map a workspace dep name to its folder inside packages/ */
function resolvePackageDir(depName) {
  // @ezstart/ui -> ui, @ezstart/express-core -> express-core
  // @gacha-analyzer/types -> lives inside apps/<app>/types, not packages
  const match = depName.match(/^@ezstart\/(.+)$/)
  if (!match) return null
  const folder = match[1]
  const candidate = path.join(PACKAGES_DIR, folder)
  if (fs.existsSync(candidate)) return candidate
  return null
}

/** Read workspace:* deps from a package.json path */
function readWorkspaceDeps(pkgJsonPath) {
  if (!fs.existsSync(pkgJsonPath)) return []
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
  const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  return Object.keys(all).filter(k => all[k] === 'workspace:*')
}

/**
 * Recursively collect all packages/* dependencies needed by the app.
 * Returns a Set of folder names (e.g. "ui", "config", "auth-sdk").
 */
function collectPackageDeps(appName) {
  const appDir = path.join(APPS_DIR, appName)
  const needed = new Set()
  const visited = new Set()

  const queue = []

  // Seed from app sub-projects
  for (const sub of ['web', 'api', 'types']) {
    const pkgJson = path.join(appDir, sub, 'package.json')
    const deps = readWorkspaceDeps(pkgJson)
    deps.forEach(d => queue.push(d))
  }

  while (queue.length > 0) {
    const dep = queue.shift()
    if (visited.has(dep)) continue
    visited.add(dep)

    const pkgDir = resolvePackageDir(dep)
    if (!pkgDir) continue // app-local type package, skip

    const folderName = path.basename(pkgDir)
    needed.add(folderName)

    // recurse into that package's own workspace deps
    const childDeps = readWorkspaceDeps(path.join(pkgDir, 'package.json'))
    childDeps.forEach(d => queue.push(d))
  }

  return needed
}

// ---------------------------------------------------------------------------
// Copy helpers
// ---------------------------------------------------------------------------

const COPY_SKIP = new Set([
  'node_modules',
  '.next',
  'dist',
  '.turbo',
  '.env',
  '.env.local',
  '.env.staging',
  '.env.production',
  '.env.test',
  'tsconfig.tsbuildinfo',
])

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (COPY_SKIP.has(entry.name)) continue

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function copyFileIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
    return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function detectSubProjects(appDir) {
  const subs = []
  for (const name of ['web', 'api', 'types']) {
    if (fs.existsSync(path.join(appDir, name, 'package.json'))) {
      subs.push(name)
    }
  }
  return subs
}

function generateWorkspaceYaml(subProjects) {
  const entries = subProjects.map(s => `  - "${s}"`).join('\n')
  return `packages:\n  - "packages/*"\n${entries}\n`
}

function generateRootPackageJson(appName, subProjects) {
  const scripts = {}

  // Dev scripts
  const devParts = []
  if (subProjects.includes('types')) devParts.push('pnpm --filter @' + appName + '/types dev')
  if (subProjects.includes('api')) devParts.push('pnpm --filter api-' + appName + ' dev')
  if (subProjects.includes('web')) devParts.push('pnpm --filter web-' + appName + ' dev')

  if (devParts.length === 1) {
    scripts.dev = devParts[0]
  } else {
    scripts.dev = 'turbo run dev --concurrency=10'
  }

  // Build
  scripts.build = 'turbo run build'
  scripts.typecheck = 'turbo run typecheck'
  scripts.lint = 'turbo run lint'

  return (
    JSON.stringify(
      {
        name: appName + '-standalone',
        version: '0.1.0',
        private: true,
        scripts,
        devDependencies: {
          turbo: '^2.4.2',
        },
        packageManager: 'pnpm@10.12.2',
      },
      null,
      2
    ) + '\n'
  )
}

function generateRootTsconfig(appName, subProjects, packageFolders) {
  const refs = []

  // Packages first
  for (const folder of [...packageFolders].sort()) {
    const tsconfigPath = path.join(PACKAGES_DIR, folder, 'tsconfig.json')
    if (fs.existsSync(tsconfigPath)) {
      refs.push({ path: './packages/' + folder })
    }
  }

  // App sub-projects
  for (const sub of subProjects) {
    refs.push({ path: './' + sub })
  }

  return (
    JSON.stringify(
      {
        compilerOptions: {
          composite: true,
          declaration: true,
          noEmit: true,
        },
        files: [],
        references: refs,
      },
      null,
      2
    ) + '\n'
  )
}

function generateReadme(appName, subProjects, packageFolders) {
  const lines = [
    '# ' + appName + ' (standalone)',
    '',
    'Extracted from the @ezstart monorepo.',
    '',
    '## Setup',
    '',
    '```bash',
    'pnpm install',
    '```',
    '',
    '## Development',
    '',
    '```bash',
    'pnpm dev',
    '```',
    '',
    '## Build',
    '',
    '```bash',
    'pnpm build',
    '```',
    '',
    '## Structure',
    '',
  ]

  for (const sub of subProjects) {
    lines.push('- `' + sub + '/` — ' + sub.charAt(0).toUpperCase() + sub.slice(1) + ' application')
  }
  lines.push('- `packages/` — Shared workspace packages:')
  for (const pkg of [...packageFolders].sort()) {
    lines.push('  - `' + pkg + '`')
  }
  lines.push('')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { name, output, dryRun } = parseArgs()

  // Validate app exists
  if (!appExists(name)) {
    console.error(`Error: App "${name}" not found in apps/`)
    console.error('Available apps: ' + fs.readdirSync(APPS_DIR).join(', '))
    process.exit(1)
  }

  // Validate output does not exist
  if (!dryRun && fs.existsSync(output)) {
    console.error(`Error: Output directory already exists: ${output}`)
    console.error('Remove it first or choose a different path.')
    process.exit(1)
  }

  const appDir = path.join(APPS_DIR, name)
  const subProjects = detectSubProjects(appDir)

  console.info(`\nExtracting app "${name}" to ${output}${dryRun ? ' (DRY RUN)' : ''}\n`)
  console.info(`Sub-projects: ${subProjects.join(', ')}`)

  // 1. Resolve dependency tree
  const packageDeps = collectPackageDeps(name)
  // Always include typescript-config and eslint-config
  packageDeps.add('typescript-config')
  packageDeps.add('eslint-config')

  console.info(`Required packages (${packageDeps.size}): ${[...packageDeps].sort().join(', ')}\n`)

  if (dryRun) {
    console.info('Dry run complete — no files written.')
    return
  }

  // 2. Create output directory
  fs.mkdirSync(output, { recursive: true })

  const summary = { files: 0, dirs: 0 }

  function countCopied(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory()) {
        summary.dirs++
        countCopied(path.join(dir, e.name))
      } else {
        summary.files++
      }
    }
  }

  // 3. Copy app sub-projects to root of output
  for (const sub of subProjects) {
    const src = path.join(appDir, sub)
    const dest = path.join(output, sub)
    console.info(`  Copying apps/${name}/${sub}/ -> ${sub}/`)
    copyDirSync(src, dest)
  }

  // 4. Copy required packages
  const pkgOutDir = path.join(output, 'packages')
  fs.mkdirSync(pkgOutDir, { recursive: true })
  for (const folder of [...packageDeps].sort()) {
    const src = path.join(PACKAGES_DIR, folder)
    const dest = path.join(pkgOutDir, folder)
    if (fs.existsSync(src)) {
      console.info(`  Copying packages/${folder}/`)
      copyDirSync(src, dest)
    } else {
      console.warn(`  Warning: packages/${folder} not found, skipping`)
    }
  }

  // 5. Copy root configs
  const rootConfigs = ['prettier.config.js', 'turbo.json', '.gitignore']
  for (const file of rootConfigs) {
    if (copyFileIfExists(path.join(ROOT_DIR, file), path.join(output, file))) {
      console.info(`  Copying ${file}`)
    }
  }

  // 6. Generate pnpm-workspace.yaml
  const wsYaml = generateWorkspaceYaml(subProjects)
  fs.writeFileSync(path.join(output, 'pnpm-workspace.yaml'), wsYaml)
  console.info('  Generated pnpm-workspace.yaml')

  // 7. Generate root package.json
  const rootPkg = generateRootPackageJson(name, subProjects)
  fs.writeFileSync(path.join(output, 'package.json'), rootPkg)
  console.info('  Generated package.json')

  // 8. Generate root tsconfig.json
  const rootTsconfig = generateRootTsconfig(name, subProjects, packageDeps)
  fs.writeFileSync(path.join(output, 'tsconfig.json'), rootTsconfig)
  console.info('  Generated tsconfig.json')

  // 9. Generate README.md
  const readme = generateReadme(name, subProjects, packageDeps)
  fs.writeFileSync(path.join(output, 'README.md'), readme)
  console.info('  Generated README.md')

  // 10. Generate self-contained env files (.env.local + .env.example)
  const envResult = extractEnvFiles({ name, output, appDir, packageDeps })
  console.info(
    `  Generated .env.local + .env.example (${envResult.resolved.length} resolved, ${envResult.missing.length} missing)`
  )
  if (envResult.missing.length > 0) {
    console.warn(`    Missing vars (set manually in .env.local): ${envResult.missing.join(', ')}`)
  }

  // Summary
  countCopied(output)
  console.info('\n========================================')
  console.info('  Extraction complete!')
  console.info(`  Output: ${output}`)
  console.info(`  Dirs:  ${summary.dirs}`)
  console.info(`  Files: ${summary.files}`)
  console.info(`  Packages: ${[...packageDeps].sort().join(', ')}`)
  console.info(
    `  Env vars: ${envResult.resolved.length} resolved, ${envResult.missing.length} missing`
  )
  console.info('========================================\n')
  console.info('Next steps:')
  console.info('  cd ' + output)
  console.info('  pnpm install')
  console.info('  pnpm dev')
  console.info('')

  // Optional --test flag: verify extraction by running install + build
  if (process.argv.includes('--test')) {
    console.info('Running post-extraction test...\n')
    try {
      console.info('  pnpm install...')
      execSync('pnpm install', { cwd: output, stdio: 'inherit' })
      console.info('\n  pnpm build...')
      execSync('pnpm build', { cwd: output, stdio: 'inherit' })
      console.info('\n[OK] Extraction test passed!')
    } catch {
      console.error('\n[FAIL] Extraction test failed!')
      process.exit(1)
    }
  }
}

// ---------------------------------------------------------------------------
// Env extraction
// ---------------------------------------------------------------------------

/**
 * Build a self-contained `.env.local` + `.env.example` for the standalone repo.
 *
 * Strategy:
 *   1. Grep `process.env.<NAME>` across:
 *      - apps/<name>/{web,api,types}/src
 *      - every transitive package's src/ (so we catch vars consumed indirectly,
 *        e.g. JWT_SECRET via @ezstart/api-core)
 *   2. Read root .env.local + per-app .env.local (api + web layers)
 *   3. Merge with per-app override > root, write .env.local with values
 *   4. Write .env.example with empty values for the same key set
 *
 * @param {{ name: string, output: string, appDir: string, packageDeps: Set<string> }} args
 * @returns {{ resolved: string[], missing: string[] }}
 */
function extractEnvFiles({ name, output, appDir, packageDeps }) {
  // 1. Build the set of source roots to scan
  const sourceRoots = []
  for (const sub of ['web', 'api', 'types']) {
    const sub_src = path.join(appDir, sub, 'src')
    if (fs.existsSync(sub_src)) sourceRoots.push(sub_src)
    // Also include config files at app sub root (next.config.js etc.)
    if (fs.existsSync(path.join(appDir, sub))) sourceRoots.push(path.join(appDir, sub))
  }
  for (const folder of packageDeps) {
    const pkgSrc = path.join(PACKAGES_DIR, folder, 'src')
    if (fs.existsSync(pkgSrc)) sourceRoots.push(pkgSrc)
  }

  const usedNames = collectEnvVarNames(sourceRoots)

  // 2. Load env sources (root + per-app)
  const rootEnv = parseEnvFile(path.join(ROOT_DIR, '.env.local'))
  const apiEnv = parseEnvFile(path.join(appDir, 'api', '.env.local'))
  const webEnv = parseEnvFile(path.join(appDir, 'web', '.env.local'))
  const typesEnv = parseEnvFile(path.join(appDir, 'types', '.env.local'))
  const merged = mergeEnvSources(rootEnv, [apiEnv, webEnv, typesEnv])

  // 3. Generate files
  const header = `# ${name}-standalone — environment configuration\n# This standalone repo has NO root .env fallback. All vars must live here.`
  return generateEnvFiles(output, usedNames, merged, { header })
}

main()
