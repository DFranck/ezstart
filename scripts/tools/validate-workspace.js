/**
 * Workspace Validator
 * Checks monorepo consistency between apps/, packages/, tsconfig.json, package.json scripts, and config URLs.
 *
 * Usage: node scripts/tools/validate-workspace.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')

// ─── Helpers ────────────────────────────────────────────────────────

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  // Strip JSON comments (// at start of line or after whitespace) and trailing commas
  const stripped = raw
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,(\s*\/\/.*$)/gm, ',')
    .replace(/(\s)\/\/\s.*$/gm, '$1')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(stripped)
}

function getDirs(dirPath) {
  if (!fs.existsSync(dirPath)) return []
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

// ─── Data sources ───────────────────────────────────────────────────

// 1. Actual folders
const appDirs = getDirs(path.join(ROOT, 'apps'))
const pkgDirs = getDirs(path.join(ROOT, 'packages'))

// 2. tsconfig.json references
const tsconfig = readJson(path.join(ROOT, 'tsconfig.json'))
const tsconfigPaths = tsconfig.references.map((r) => r.path.replace('./', ''))

function isTsconfigReferenced(folder, type) {
  const prefix = type === 'app' ? `apps/${folder}` : `packages/${folder}`
  return tsconfigPaths.some((p) => p === prefix || p.startsWith(prefix + '/'))
}

// 3. package.json dev scripts
const pkg = readJson(path.join(ROOT, 'package.json'))
const devScripts = Object.entries(pkg.scripts || {})
  .filter(([k]) => k.startsWith('dev:') && k !== 'dev:types' && k !== 'dev:all' && k !== 'dev:status')
  .map(([k, v]) => ({ name: k, value: v }))

function hasDevScript(appFolder) {
  const patterns = [appFolder, appFolder.replace(/-/g, '')]
  return devScripts.some(({ value }) => {
    return patterns.some((p) => value.includes(`apps/${appFolder}`) || value.includes(`filter=web-${appFolder}`) || value.includes(`filter=api-${appFolder}`))
  })
}

function getDevScriptName(appFolder) {
  const match = devScripts.find(({ value }) => {
    return value.includes(`apps/${appFolder}`) || value.includes(`filter=web-${appFolder}`) || value.includes(`filter=api-${appFolder}`)
  })
  return match ? match.name : null
}

// 4. Config AppNames from urls.ts
const urlsPath = path.join(ROOT, 'packages', 'config', 'src', 'urls.ts')
const urlsContent = fs.readFileSync(urlsPath, 'utf-8')

// Extract AppName union members
const appNameMatch = urlsContent.match(/export type AppName\s*=\s*([\s\S]*?)(?:\n\n|\nexport)/)
const configAppNames = appNameMatch
  ? appNameMatch[1]
      .split('|')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean)
  : []

function hasConfigEntry(appFolder) {
  return configAppNames.includes(appFolder)
}

// ─── Validation ─────────────────────────────────────────────────────

const OK = '\x1b[32m✓\x1b[0m'
const FAIL = '\x1b[31m✗\x1b[0m'
const WARN = '\x1b[33m⚠\x1b[0m'

let hasErrors = false

function check(label, ok) {
  return ok ? `${label}: OK` : `${label}: MISSING`
}

console.log('\n=== Workspace Validation ===\n')

// ─── Apps ───────────────────────────────────────────────────────────

console.log('--- apps/ ---')
for (const app of appDirs.sort()) {
  const tsOk = isTsconfigReferenced(app, 'app')
  const devOk = hasDevScript(app)
  const cfgOk = hasConfigEntry(app)

  const allOk = tsOk && devOk && cfgOk
  const icon = allOk ? OK : FAIL

  const parts = [check('tsconfig', tsOk), check('dev script', devOk), check('config', cfgOk)]

  if (!allOk) hasErrors = true

  const devName = getDevScriptName(app)
  const devInfo = devName ? ` (${devName})` : ''

  console.log(`${icon} apps/${app} — ${parts.join(', ')}${!devOk ? '' : devInfo}`)
}

// ─── Packages ───────────────────────────────────────────────────────

console.log('\n--- packages/ ---')
for (const pkg of pkgDirs.sort()) {
  const tsOk = isTsconfigReferenced(pkg, 'package')
  const icon = tsOk ? OK : WARN

  console.log(`${icon} packages/${pkg} — ${check('tsconfig', tsOk)}`)
}

// ─── Config AppNames without matching app folder ────────────────────

const orphanConfigs = configAppNames.filter((name) => !appDirs.includes(name))
if (orphanConfigs.length > 0) {
  console.log('\n--- Config entries without matching apps/ folder ---')
  for (const name of orphanConfigs) {
    console.log(`${WARN} config AppName "${name}" — no apps/${name}/ folder`)
  }
}

// ─── tsconfig references pointing to non-existent paths ─────────────

const staleRefs = tsconfigPaths.filter((p) => {
  const fullPath = path.join(ROOT, p)
  return !fs.existsSync(fullPath)
})
if (staleRefs.length > 0) {
  console.log('\n--- Stale tsconfig references ---')
  for (const ref of staleRefs) {
    console.log(`${FAIL} tsconfig reference "${ref}" — folder does not exist`)
  }
  hasErrors = true
}

console.log('')
if (hasErrors) {
  console.log('\x1b[31mWorkspace has inconsistencies.\x1b[0m')
  process.exit(1)
} else {
  console.log('\x1b[32mWorkspace is consistent.\x1b[0m')
}
