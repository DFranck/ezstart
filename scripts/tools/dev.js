/**
 * Dynamic dev launcher — replaces all dev:x scripts
 *
 * Usage:
 *   node scripts/tools/dev.js ga          # gacha-analyzer + ezauth
 *   node scripts/tools/dev.js bill        # ezbill + ezauth
 *   node scripts/tools/dev.js --list      # list available apps
 *   node scripts/tools/dev.js all         # all apps
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const APPS_DIR = path.join(ROOT, 'apps')

// ---------------------------------------------------------------------------
// Shortcut → appName mapping (derived from existing dev:x scripts)
// ---------------------------------------------------------------------------
const SHORTCUTS = {
  ez: 'ezstart',
  bill: 'ezbill',
  pay: 'ezpay',
  fs: 'fengshui',
  gp: 'green-pulse',
  ga: 'gacha-analyzer',
  asc: 'asc-tcd',
  all: '__all__',
}

// SDK → app dependency mapping (auto-detected from package.json)
const SDK_TO_APP = {
  '@ezstart/auth-sdk': 'ezauth',
  '@ezstart/pay-sdk': 'ezpay',
  '@ezstart/ai-sdk': 'ezstart', // AI endpoints centralized on ezstart-api
}

// Extra dependencies not detected via SDK (e.g. CRM needs payment API)
const EXTRA_DEPS = {
  ezstart: ['ezpay'],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllAppDirs() {
  return fs.readdirSync(APPS_DIR).filter(name => {
    const stat = fs.statSync(path.join(APPS_DIR, name))
    return stat.isDirectory()
  })
}

function hasSubPackage(appName, sub) {
  return fs.existsSync(path.join(APPS_DIR, appName, sub, 'package.json'))
}

function readPkg(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

/**
 * Detect which other apps are required by reading the web package.json deps.
 * e.g. @ezstart/auth-sdk → needs ezauth running
 */
function detectDependencies(appName) {
  const webPkg = path.join(APPS_DIR, appName, 'web', 'package.json')
  if (!fs.existsSync(webPkg)) return []

  const pkg = readPkg(webPkg)
  const deps = Object.keys(pkg.dependencies || {})
  const needed = new Set()

  for (const dep of deps) {
    const mapped = SDK_TO_APP[dep]
    if (mapped && mapped !== appName) {
      needed.add(mapped)
    }
  }

  // Add extra deps not detectable via SDK
  const extras = EXTRA_DEPS[appName] || []
  for (const extra of extras) {
    if (extra !== appName) needed.add(extra)
  }

  return [...needed]
}

/**
 * Build turbo filters for a single app (web + api + types if they exist).
 */
function filtersForApp(appName) {
  const filters = []

  if (hasSubPackage(appName, 'web')) {
    filters.push(`--filter=web-${appName}...`)
  }
  if (hasSubPackage(appName, 'api')) {
    filters.push(`--filter=api-${appName}...`)
  }
  if (hasSubPackage(appName, 'types')) {
    // Read actual package name from types/package.json
    const typesPkg = readPkg(path.join(APPS_DIR, appName, 'types', 'package.json'))
    filters.push(`--filter=${typesPkg.name}...`)
  }

  return filters
}

/**
 * Collect all .next directories that need to be cleaned.
 */
function getNextDirs(appNames) {
  const dirs = []
  for (const app of appNames) {
    const nextDir = path.join(APPS_DIR, app, 'web', '.next')
    if (fs.existsSync(path.join(APPS_DIR, app, 'web'))) {
      dirs.push(nextDir)
    }
  }
  return dirs
}

function printList() {
  const apps = getAllAppDirs()
  console.log('\nAvailable apps:\n')

  // Build reverse shortcut map
  const reverseShortcuts = {}
  for (const [shortcut, appName] of Object.entries(SHORTCUTS)) {
    if (appName === '__all__') continue
    reverseShortcuts[appName] = shortcut
  }

  for (const app of apps) {
    const shortcut = reverseShortcuts[app]
    const hasWeb = hasSubPackage(app, 'web')
    const hasApi = hasSubPackage(app, 'api')
    const parts = [hasWeb ? 'web' : null, hasApi ? 'api' : null].filter(Boolean).join('+')
    const deps = detectDependencies(app)
    const depsStr = deps.length ? ` (+ ${deps.join(', ')})` : ''
    const shortcutStr = shortcut ? ` (${shortcut})` : ''

    console.log(`  ${app}${shortcutStr}  [${parts}]${depsStr}`)
  }

  console.log('\n  all  — launch everything\n')
}

function printUsage() {
  console.log('Usage: node scripts/tools/dev.js <app|shortcut> [app2...]')
  console.log('       node scripts/tools/dev.js --list')
  console.log('\nExamples:')
  console.log('  node scripts/tools/dev.js ga')
  console.log('  node scripts/tools/dev.js bill')
  console.log('  node scripts/tools/dev.js gacha-analyzer ezpay')
  console.log('  node scripts/tools/dev.js --list')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  if (args.includes('--list') || args.includes('-l')) {
    printList()
    process.exit(0)
  }

  const allAppDirs = getAllAppDirs()

  // Resolve args to app names
  const requestedApps = new Set()

  for (const arg of args) {
    const resolved = SHORTCUTS[arg] || arg

    if (resolved === '__all__') {
      allAppDirs.forEach(a => requestedApps.add(a))
      break
    }

    if (!allAppDirs.includes(resolved)) {
      console.error(`Unknown app: "${arg}"`)
      console.error(`Run with --list to see available apps.`)
      process.exit(1)
    }

    requestedApps.add(resolved)
  }

  // Add dependencies
  const allApps = new Set(requestedApps)
  for (const app of requestedApps) {
    const deps = detectDependencies(app)
    deps.forEach(d => allApps.add(d))
  }

  // Build filters
  const filters = []
  for (const app of allApps) {
    filters.push(...filtersForApp(app))
  }

  if (filters.length === 0) {
    console.error('No turbo filters generated. Check app structure.')
    process.exit(1)
  }

  // Kill dev ports before starting servers (avoids EADDRINUSE)
  console.log('\nKilling dev ports...')
  try {
    execSync('pnpm kill:ports', { cwd: ROOT, stdio: 'inherit' })
  } catch (err) {
    console.warn(`kill:ports failed but continuing: ${err.message}`)
  }

  // Clean .next directories
  const nextDirs = getNextDirs([...allApps])
  for (const dir of nextDirs) {
    if (fs.existsSync(dir)) {
      console.log(`Cleaning ${path.relative(ROOT, dir)}`)
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }

  // Build and run turbo command
  // Concurrency must be > number of persistent tasks.
  // Turbo runs transitive deps too, so actual task count exceeds filters.length.
  // Use 2x multiplier with a floor of 50 to stay future-proof.
  const concurrency = Math.max(filters.length * 2, 50)
  const cmd = ['turbo', 'run', 'dev', ...filters, `--concurrency=${concurrency}`]

  console.log(`\nLaunching: ${[...allApps].join(', ')}`)
  console.log(`> ${cmd.join(' ')}\n`)

  const child = spawn(cmd[0], cmd.slice(1), {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  })

  child.on('exit', code => {
    process.exit(code || 0)
  })
}

main()
