#!/usr/bin/env node
/**
 * Sync root .env.production → all Vercel projects + Railway services.
 *
 * Root file is the SINGLE source of truth. It contains two kinds of vars:
 *
 *   - SHARED (no prefix)       → pushed as-is to every matching target.
 *   - PER-APP `{PREFIX}_VAR`   → stripped of prefix and pushed ONLY to the
 *                                matching service / project. Vars for other
 *                                apps are filtered out.
 *
 * `NEXT_PUBLIC_*` are shared (Next convention) and pushed to Vercel only.
 *
 * Usage:
 *   pnpm secrets:sync                       # push to all (Vercel + Railway)
 *   pnpm secrets:sync -- --vercel-only      # only Vercel
 *   pnpm secrets:sync -- --railway-only     # only Railway
 *   pnpm secrets:sync -- --dry-run          # show what would be pushed (no execution)
 *   pnpm secrets:sync -- --vars KEY1,KEY2   # only specific vars (root names)
 *
 * Sensitive values are masked in stdout.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const {
  RAILWAY_SERVICES,
  VERCEL_PROJECTS,
  classifyKeyForTarget,
  mask,
  parseEnvFile,
} = require('./lib/secrets-fetch')

const ROOT = path.resolve(__dirname, '..', '..')
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const vercelOnly = args.includes('--vercel-only')
const railwayOnly = args.includes('--railway-only')
const varsIdx = args.indexOf('--vars')
const filterVars =
  varsIdx >= 0 && args[varsIdx + 1] ? args[varsIdx + 1].split(',').map(s => s.trim()) : null

const SENSITIVE_RE = /(SECRET|KEY|TOKEN|PASSWORD|DSN|PRIVATE)/i
function display(key, value) {
  if (!value) return '(empty)'
  return SENSITIVE_RE.test(key) ? mask(value) : mask(value)
}

// Shared vars we actively push to APIs (Railway). Anything else stays local.
// Per-app vars with matching prefix are ALWAYS pushed (no allow-list needed).
const RAILWAY_SHARED_ALLOWLIST = new Set([
  'NODE_ENV',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'RESEND_FULL_ACCESS_API_KEY',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG_SLUG',
  'EXCHANGE_RATE_API_KEY',
  'MONGODB_ATLAS_PUBLIC_KEY',
  'MONGODB_ATLAS_PRIVATE_KEY',
  'MONGODB_ATLAS_PROJECT_ID',
  'GITHUB_TOKEN',
  'GITHUB_USERNAME',
  'VERCEL_TOKEN',
  'VERCEL_TEAM_ID',
  'RAILWAY_TOKEN',
])

// Shared vars pushed to Vercel (web apps). NEXT_PUBLIC_* handled separately.
const VERCEL_SHARED_ALLOWLIST = new Set(['JWT_SECRET', 'SENTRY_AUTH_TOKEN', 'SENTRY_ORG_SLUG'])

// Scoped shared vars: pushed ONLY to the listed targets. Used for "shared by
// design but not every service needs them" (e.g. Stripe keys consumed by ezpay
// for payments + ezstart for read-only dashboards).
const SCOPED_SHARED_VARS = {
  STRIPE_SECRET_KEY: {
    railway: new Set(['ezpay-api', 'ezstart-api']),
    vercel: new Set(['web-ezpay']),
  },
  STRIPE_WEBHOOK_SECRET: {
    railway: new Set(['ezpay-api']),
    vercel: new Set(),
  },
  STRIPE_PUBLISHABLE_KEY: {
    railway: new Set(['ezpay-api']),
    vercel: new Set(['web-ezpay']),
  },
}

// ── Load source of truth ─────────────────────────────────────────────────
const sourceFile = path.join(ROOT, '.env.production')
const source = parseEnvFile(sourceFile)
if (!source) {
  console.error(`\n❌ ${path.relative(ROOT, sourceFile)} not found.`)
  console.error('   Create it from .env.shared.example with your production values.\n')
  process.exit(1)
}

// ── Plan: which var goes where ───────────────────────────────────────────
// For each (target, root-key) pair, compute the (platform key, value) to push.
function buildPlan(targets, sharedAllowlist, { includePublic, platform } = {}) {
  // targets: [{ label, prefix, meta }]
  const plan = new Map() // targetLabel → [{ key, value }]
  for (const t of targets) plan.set(t.label, [])

  for (const [rootKey, value] of Object.entries(source)) {
    if (filterVars && !filterVars.includes(rootKey)) continue
    if (!value) continue

    const isPublic = rootKey.startsWith('NEXT_PUBLIC_')
    const scoped = SCOPED_SHARED_VARS[rootKey]

    for (const t of targets) {
      const { kind, exportedKey } = classifyKeyForTarget(rootKey, t.prefix)
      if (kind === 'foreign') continue
      if (kind === 'self') {
        plan.get(t.label).push({ key: exportedKey, value })
        continue
      }
      // shared
      if (isPublic) {
        if (includePublic) plan.get(t.label).push({ key: exportedKey, value })
        continue
      }
      if (scoped) {
        const allowed = scoped[platform]
        const targetName =
          platform === 'railway' ? t.meta && t.meta.service : t.meta && t.meta.project
        if (allowed && allowed.has(targetName)) {
          plan.get(t.label).push({ key: exportedKey, value })
        }
        continue
      }
      if (sharedAllowlist.has(rootKey)) {
        plan.get(t.label).push({ key: exportedKey, value })
      }
    }
  }
  return plan
}

function cliAvailable(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

console.log(
  isDryRun
    ? '\n🔍 DRY RUN — no remote changes\n'
    : '\n🚀 Syncing root .env.production → platforms...\n'
)
console.log(`Source: ${path.relative(ROOT, sourceFile)}`)
if (filterVars) console.log(`Filter: ${filterVars.join(', ')}`)
console.log('')

// ── RAILWAY push ─────────────────────────────────────────────────────────
if (!vercelOnly) {
  console.log('── RAILWAY ──')
  const railwayTargets = RAILWAY_SERVICES.map(s => ({
    label: `${s.service}/${s.project}`,
    prefix: s.prefix,
    meta: s,
  }))
  const plan = buildPlan(railwayTargets, RAILWAY_SHARED_ALLOWLIST, {
    includePublic: false,
    platform: 'railway',
  })

  const railwayAvailable = !isDryRun && cliAvailable('railway')
  if (!isDryRun && !railwayAvailable) {
    console.log('  ⚠  Railway CLI not found. Install: npm i -g @railway/cli')
  }

  for (const t of railwayTargets) {
    const entries = plan.get(t.label)
    console.log(`  ${t.label} (${entries.length} var${entries.length === 1 ? '' : 's'}):`)
    for (const { key, value } of entries) {
      console.log(`    ${key}=${display(key, value)}`)
    }
    if (isDryRun || !railwayAvailable) continue
    try {
      execSync(`railway link -p ${t.meta.project} -s ${t.meta.service} -e production`, {
        stdio: 'pipe',
        timeout: 15_000,
        cwd: ROOT,
      })
      for (const { key, value } of entries) {
        execSync(`railway variable set ${key}=${value}`, {
          stdio: 'pipe',
          timeout: 30_000,
          cwd: ROOT,
        })
      }
      console.log(`    ✅ pushed ${entries.length} var(s)`)
    } catch (err) {
      console.log(`    ❌ failed: ${err.message.split('\n')[0]}`)
    }
  }
  console.log('')
}

// ── VERCEL push ──────────────────────────────────────────────────────────
if (!railwayOnly) {
  console.log('── VERCEL ──')
  const vercelTargets = VERCEL_PROJECTS.map(p => ({
    label: p.project,
    prefix: p.prefix,
    meta: p,
  }))
  const plan = buildPlan(vercelTargets, VERCEL_SHARED_ALLOWLIST, {
    includePublic: true,
    platform: 'vercel',
  })

  const vercelAvailable = !isDryRun && cliAvailable('vercel')
  if (!isDryRun && !vercelAvailable) {
    console.log('  ⚠  Vercel CLI not found. Install: pnpm add -g vercel')
  }

  for (const t of vercelTargets) {
    const entries = plan.get(t.label)
    console.log(`  ${t.label} (${entries.length} var${entries.length === 1 ? '' : 's'}):`)
    for (const { key, value } of entries) {
      console.log(`    ${key}=${display(key, value)}`)
    }
    if (isDryRun || !vercelAvailable) continue

    let ok = 0
    let failed = 0
    for (const { key, value } of entries) {
      try {
        try {
          execSync(`vercel env rm ${key} production --yes --scope ${t.meta.project}`, {
            stdio: 'pipe',
            timeout: 30_000,
            cwd: ROOT,
          })
        } catch {
          /* not present */
        }
        execSync(`echo ${value} | vercel env add ${key} production --scope ${t.meta.project}`, {
          stdio: 'pipe',
          timeout: 30_000,
          cwd: ROOT,
          shell: true,
        })
        ok++
      } catch {
        failed++
      }
    }
    console.log(
      `    ${failed === 0 ? '✅' : '⚠'} ${ok} pushed${failed ? `, ${failed} failed` : ''}`
    )
  }
  console.log('')
}

console.log('═'.repeat(60))
console.log(
  isDryRun ? '🔍 Dry run complete. Re-run without --dry-run to apply.' : '✅ Sync complete.'
)
console.log('')
