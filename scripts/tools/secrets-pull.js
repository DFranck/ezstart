#!/usr/bin/env node
/**
 * Pull secrets from Vercel projects + Railway services → write to root
 * `.env.production`.
 *
 * The root file uses the PREFIXED architecture: per-app vars are stored
 * as `{APP_PREFIX}_VARNAME`. This script does the inverse transform of
 * `secrets-sync.js`:
 *
 *   - A var present in a single target → stored with the target's prefix.
 *   - A var identical in 2+ targets → stored as shared (no prefix).
 *   - A var with different values across targets → flagged as conflict,
 *     NOT written.
 *
 * `NEXT_PUBLIC_*` vars are always treated as shared (Next convention).
 *
 * Usage:
 *   pnpm secrets:pull                    # fetch all, write .env.production
 *   pnpm secrets:pull -- --dry-run       # show what would be written (masked)
 *   pnpm secrets:pull -- --vercel-only
 *   pnpm secrets:pull -- --railway-only
 *   pnpm secrets:pull -- --merge         # keep existing local-only keys
 */

const fs = require('fs')
const path = require('path')
const {
  RAILWAY_SERVICES,
  VERCEL_PROJECTS,
  fetchVercelEnv,
  fetchRailwayEnv,
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

// Vars that are ALWAYS shared (no prefix) even if seen in a single target.
// These identify infrastructure-level secrets that never vary per app.
const ALWAYS_SHARED = new Set([
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG_SLUG',
  'MONGODB_ATLAS_PUBLIC_KEY',
  'MONGODB_ATLAS_PRIVATE_KEY',
  'MONGODB_ATLAS_PROJECT_ID',
  'GITHUB_TOKEN',
  'GITHUB_USERNAME',
  'VERCEL_TOKEN',
  'VERCEL_TEAM_ID',
  'RAILWAY_TOKEN',
  'EXCHANGE_RATE_API_KEY',
])

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

// ── Build per-key index with prefix context ──────────────────────────────
// index[key] = [{ source, prefix, value }]
const index = {}
for (const [project, vars] of Object.entries(vercel)) {
  const meta = VERCEL_PROJECTS.find(p => p.project === project)
  const prefix = meta ? meta.prefix : null
  for (const [key, value] of Object.entries(vars)) {
    index[key] = index[key] || []
    index[key].push({ source: `vercel/${project}`, prefix, value })
  }
}
for (const [service, vars] of Object.entries(railway)) {
  const meta = RAILWAY_SERVICES.find(s => s.service === service)
  const prefix = meta ? meta.prefix : null
  for (const [key, value] of Object.entries(vars)) {
    index[key] = index[key] || []
    index[key].push({ source: `railway/${service}`, prefix, value })
  }
}

// ── Classify each key ────────────────────────────────────────────────────
const shared = {} // rootKey → value
const perApp = {} // rootKey (prefixed) → value
const conflicts = [] // { key, occurrences }

for (const [key, occurrences] of Object.entries(index)) {
  const uniqueValues = new Set(occurrences.map(o => o.value))
  const isPublic = key.startsWith('NEXT_PUBLIC_')

  if (uniqueValues.size > 1) {
    // Different values across targets. Could be legit per-app, or a real drift.
    // Group by prefix — if each group is self-consistent and belongs to a
    // distinct prefix, treat as per-app; otherwise flag as conflict.
    const byPrefix = {}
    for (const o of occurrences) {
      if (!o.prefix) {
        // Unknown prefix → real conflict
        conflicts.push({ key, occurrences })
        byPrefix._ambiguous = true
        break
      }
      byPrefix[o.prefix] = byPrefix[o.prefix] || new Set()
      byPrefix[o.prefix].add(o.value)
    }
    if (byPrefix._ambiguous) continue

    let clean = true
    for (const vals of Object.values(byPrefix)) {
      if (vals.size > 1) {
        clean = false
        break
      }
    }
    if (!clean) {
      conflicts.push({ key, occurrences })
      continue
    }
    // Per-app values → store prefixed
    for (const [prefix, vals] of Object.entries(byPrefix)) {
      const val = [...vals][0]
      perApp[`${prefix}_${key}`] = val
    }
    continue
  }

  const value = [...uniqueValues][0]

  if (isPublic || ALWAYS_SHARED.has(key)) {
    shared[key] = value
    continue
  }

  // Single-value case. If it comes from one target → per-app; else shared.
  const distinctTargets = new Set(occurrences.map(o => o.source))
  if (distinctTargets.size >= 2) {
    shared[key] = value
  } else {
    const only = occurrences[0]
    if (only.prefix) {
      perApp[`${only.prefix}_${key}`] = value
    } else {
      // No known prefix (e.g. a legacy Vercel project we don't map) → shared.
      shared[key] = value
    }
  }
}

// ── Merge mode : keep local-only keys ────────────────────────────────────
let finalVars = { ...shared, ...perApp }
const existing = parseEnvFile(targetFile)
if (mergeMode && existing) {
  for (const [key, value] of Object.entries(existing)) {
    if (!(key in finalVars)) finalVars[key] = value
  }
}

// ── Report ───────────────────────────────────────────────────────────────
console.log('── PLAN ──')
console.log(`  Shared vars: ${Object.keys(shared).length}`)
for (const [key, value] of Object.entries(shared)) {
  console.log(`    ${key}=${mask(value)}`)
}
console.log(`\n  Per-app vars: ${Object.keys(perApp).length}`)
for (const [key, value] of Object.entries(perApp)) {
  console.log(`    ${key}=${mask(value)}`)
}

if (conflicts.length) {
  console.log(`\n  ⚠  Conflicts (NOT written): ${conflicts.length}`)
  for (const { key, occurrences } of conflicts) {
    console.log(`    ${key}:`)
    for (const o of occurrences) {
      console.log(`      - ${o.source} = ${mask(o.value)}`)
    }
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
    '@ezstart — Production secrets (pulled from Vercel + Railway)\n' +
    `Generated: ${new Date().toISOString()}\n` +
    'Root-only prefixed architecture — per-app vars use {PREFIX}_VARNAME.\n' +
    'NEVER commit this file.',
})
fs.writeFileSync(targetFile, content, { encoding: 'utf8' })

console.log(`✅ Wrote ${path.relative(ROOT, targetFile)} (${Object.keys(finalVars).length} vars)`)
console.log('')
