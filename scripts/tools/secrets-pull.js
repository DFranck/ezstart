#!/usr/bin/env node
/**
 * Pull secrets from Vercel projects + Railway services → write to root
 * .env.production.
 *
 * Usage:
 *   pnpm secrets:pull                    # fetch all, write .env.production
 *   pnpm secrets:pull -- --dry-run       # show what would be written (masked)
 *   pnpm secrets:pull -- --vercel-only   # only Vercel
 *   pnpm secrets:pull -- --railway-only  # only Railway
 *   pnpm secrets:pull -- --merge         # merge with existing (don't drop local-only keys)
 *
 * Heuristic shared vs app-specific:
 *   - A var identical in 2+ services/projects → shared → written to root
 *   - A var present in only 1 target → app-specific → flagged, NOT written
 *   - A var with different values across targets → conflict → flagged, NOT written
 */

const fs = require('fs')
const path = require('path')
const {
  fetchVercelEnv,
  fetchRailwayEnv,
  buildVarIndex,
  classifyVar,
  mask,
  renderEnvFile,
  parseEnvFile,
} = require('./lib/secrets-fetch')

const ROOT = path.resolve(__dirname, '..', '..')
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const vercelOnly = args.includes('--vercel-only')
const railwayOnly = args.includes('--railway-only')
const mergeMode = args.includes('--merge')

const targetFile = path.join(ROOT, '.env.production')

console.log(
  isDryRun
    ? '\n🔍 DRY RUN — no file will be written\n'
    : '\n⬇️  Pulling secrets → root .env.production\n'
)

// ── Fetch ────────────────────────────────────────────────────────────────
const log = msg => console.log(msg)

let vercel = {}
let railway = {}

if (!railwayOnly) {
  console.log('── VERCEL ──')
  vercel = fetchVercelEnv({ cwd: ROOT, log })
  console.log('')
}
if (!vercelOnly) {
  console.log('── RAILWAY ──')
  railway = fetchRailwayEnv({ cwd: ROOT, log })
  console.log('')
}

// ── Analyse ──────────────────────────────────────────────────────────────
const index = buildVarIndex({ vercel, railway })

const shared = {} // key → value (to write)
const conflicts = [] // { key, occurrences }
const appSpecific = [] // { key, source, value }

for (const [key, occurrences] of Object.entries(index)) {
  const { isShared, isConflict, consensusValue, sources } = classifyVar(occurrences)

  if (isConflict) {
    conflicts.push({ key, occurrences })
    continue
  }
  if (isShared) {
    shared[key] = consensusValue
  } else {
    appSpecific.push({ key, source: sources[0], value: occurrences[sources[0]] })
  }
}

// ── Merge mode : keep local-only keys ────────────────────────────────────
let finalVars = { ...shared }
const existing = parseEnvFile(targetFile)

if (mergeMode && existing) {
  for (const [key, value] of Object.entries(existing)) {
    if (!(key in finalVars)) finalVars[key] = value
  }
}

// ── Report ───────────────────────────────────────────────────────────────
console.log('── PLAN ──')
console.log(`  Shared vars (to write): ${Object.keys(shared).length}`)
for (const [key, value] of Object.entries(shared)) {
  console.log(`    ${key}=${mask(value)}`)
}

if (conflicts.length) {
  console.log(`\n  ⚠  Conflicts (NOT written): ${conflicts.length}`)
  for (const { key, occurrences } of conflicts) {
    console.log(`    ${key}:`)
    for (const [src, val] of Object.entries(occurrences)) {
      console.log(`      - ${src} = ${mask(val)}`)
    }
  }
}

if (appSpecific.length) {
  console.log(`\n  ℹ  App-specific (only in 1 target, NOT written): ${appSpecific.length}`)
  for (const { key, source } of appSpecific) {
    console.log(`    ${key}  (only in ${source})`)
  }
}
console.log('')

// ── Write ────────────────────────────────────────────────────────────────
if (isDryRun) {
  console.log('🔍 Dry run complete. Re-run without --dry-run to write.\n')
  process.exit(0)
}

if (Object.keys(finalVars).length === 0) {
  console.log('─ Nothing to write (no shared vars fetched).\n')
  process.exit(0)
}

// Backup existing
if (fs.existsSync(targetFile)) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(ROOT, 'tmp')
  fs.mkdirSync(backupDir, { recursive: true })
  const backupFile = path.join(backupDir, `secrets-pull-backup-${ts}.env.production`)
  fs.copyFileSync(targetFile, backupFile)
  console.log(`📦 Backup: ${path.relative(ROOT, backupFile)}`)
}

const content = renderEnvFile(finalVars, {
  header:
    '@ezstart — Shared production secrets (pulled from Vercel + Railway)\n' +
    `Generated: ${new Date().toISOString()}\n` +
    'NEVER commit this file. App-specific overrides live in apps/*/{api,web}/.env.production.',
})
fs.writeFileSync(targetFile, content, { encoding: 'utf8' })

console.log(`✅ Wrote ${path.relative(ROOT, targetFile)} (${Object.keys(finalVars).length} vars)`)
console.log('')
