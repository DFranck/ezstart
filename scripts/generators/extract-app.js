/**
 * Extract an app from the monorepo into a standalone project.
 *
 * Usage:
 *   node scripts/generators/extract-app.js --name gacha-analyzer --output ../extracted/gacha-analyzer
 */

const fs = require('fs')
const path = require('path')
const { ROOT_DIR, APPS_DIR, appExists } = require('./lib/utils')

const PACKAGES_DIR = path.join(ROOT_DIR, 'packages')

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  let name = null
  let output = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) name = args[i + 1]
    if (args[i] === '--output' && args[i + 1]) output = args[i + 1]
  }

  if (!name || !output) {
    console.error('Usage: node extract-app.js --name <app-name> --output <dir>')
    process.exit(1)
  }

  return { name, output: path.resolve(output) }
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

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    // Skip node_modules, .next, dist, .turbo, .env.local
    if (['node_modules', '.next', 'dist', '.turbo', '.env.local', '.env'].includes(entry.name)) {
      continue
    }

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

  return JSON.stringify(
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

  return JSON.stringify(
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
  const { name, output } = parseArgs()

  // Validate app exists
  if (!appExists(name)) {
    console.error(`Error: App "${name}" not found in apps/`)
    console.error('Available apps: ' + fs.readdirSync(APPS_DIR).join(', '))
    process.exit(1)
  }

  // Validate output does not exist
  if (fs.existsSync(output)) {
    console.error(`Error: Output directory already exists: ${output}`)
    console.error('Remove it first or choose a different path.')
    process.exit(1)
  }

  const appDir = path.join(APPS_DIR, name)
  const subProjects = detectSubProjects(appDir)

  console.log(`\nExtracting app "${name}" to ${output}\n`)
  console.log(`Sub-projects: ${subProjects.join(', ')}`)

  // 1. Resolve dependency tree
  const packageDeps = collectPackageDeps(name)
  // Always include typescript-config and eslint-config
  packageDeps.add('typescript-config')
  packageDeps.add('eslint-config')

  console.log(`Required packages (${packageDeps.size}): ${[...packageDeps].sort().join(', ')}\n`)

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
    console.log(`  Copying apps/${name}/${sub}/ -> ${sub}/`)
    copyDirSync(src, dest)
  }

  // 4. Copy required packages
  const pkgOutDir = path.join(output, 'packages')
  fs.mkdirSync(pkgOutDir, { recursive: true })
  for (const folder of [...packageDeps].sort()) {
    const src = path.join(PACKAGES_DIR, folder)
    const dest = path.join(pkgOutDir, folder)
    if (fs.existsSync(src)) {
      console.log(`  Copying packages/${folder}/`)
      copyDirSync(src, dest)
    } else {
      console.warn(`  Warning: packages/${folder} not found, skipping`)
    }
  }

  // 5. Copy root configs
  const rootConfigs = ['prettier.config.js', 'turbo.json', '.gitignore']
  for (const file of rootConfigs) {
    if (copyFileIfExists(path.join(ROOT_DIR, file), path.join(output, file))) {
      console.log(`  Copying ${file}`)
    }
  }

  // 6. Generate pnpm-workspace.yaml
  const wsYaml = generateWorkspaceYaml(subProjects)
  fs.writeFileSync(path.join(output, 'pnpm-workspace.yaml'), wsYaml)
  console.log('  Generated pnpm-workspace.yaml')

  // 7. Generate root package.json
  const rootPkg = generateRootPackageJson(name, subProjects)
  fs.writeFileSync(path.join(output, 'package.json'), rootPkg)
  console.log('  Generated package.json')

  // 8. Generate root tsconfig.json
  const rootTsconfig = generateRootTsconfig(name, subProjects, packageDeps)
  fs.writeFileSync(path.join(output, 'tsconfig.json'), rootTsconfig)
  console.log('  Generated tsconfig.json')

  // 9. Generate README.md
  const readme = generateReadme(name, subProjects, packageDeps)
  fs.writeFileSync(path.join(output, 'README.md'), readme)
  console.log('  Generated README.md')

  // Summary
  countCopied(output)
  console.log('\n========================================')
  console.log('  Extraction complete!')
  console.log(`  Output: ${output}`)
  console.log(`  Dirs:  ${summary.dirs}`)
  console.log(`  Files: ${summary.files}`)
  console.log(`  Packages: ${[...packageDeps].sort().join(', ')}`)
  console.log('========================================\n')
  console.log('Next steps:')
  console.log('  cd ' + output)
  console.log('  pnpm install')
  console.log('  pnpm dev')
  console.log('')
}

main()
