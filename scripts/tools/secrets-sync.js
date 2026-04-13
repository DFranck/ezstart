#!/usr/bin/env node
/**
 * Sync root .env.production → all Vercel projects + Railway services.
 * Reads root .env.production as the source of truth for SHARED secrets.
 *
 * Usage:
 *   pnpm secrets:sync                       # push to all (Vercel + Railway)
 *   pnpm secrets:sync -- --vercel-only      # only Vercel
 *   pnpm secrets:sync -- --railway-only     # only Railway
 *   pnpm secrets:sync -- --dry-run          # show what would be pushed (no execution)
 *   pnpm secrets:sync -- --vars KEY1,KEY2   # only specific vars
 *
 * Routing rules:
 *   - NEXT_PUBLIC_*               → Vercel only
 *   - In RAILWAY_SHARED_VARS      → all Railway services
 *   - In VERCEL_SHARED_VARS       → all Vercel projects
 *   - Sensitive (*_SECRET, *_KEY, *_TOKEN, *_DSN) → masked in output
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const vercelOnly = args.includes('--vercel-only')
const railwayOnly = args.includes('--railway-only')
const varsIdx = args.indexOf('--vars')
const filterVars =
  varsIdx >= 0 && args[varsIdx + 1] ? args[varsIdx + 1].split(',').map(s => s.trim()) : null

const SENSITIVE_RE = /(SECRET|KEY|TOKEN|PASSWORD|DSN|PRIVATE)/i
function mask(value) {
  if (!value) return '(empty)'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}
function display(key, value) {
  if (!value) return '(empty)'
  return SENSITIVE_RE.test(key) ? mask(value) : value
}

// ── Targets ──────────────────────────────────────────────────────────────
const RAILWAY_SERVICES = [
  { service: 'ezauth-api', project: 'ezstart-apis' },
  { service: 'ezbill-api', project: 'ezstart-apis' },
  { service: 'ezpay-api', project: 'ezstart-apis' },
  { service: 'gacha-analyzer-api', project: 'ezstart-apis' },
  { service: 'greenpulse-api', project: 'TeamProjects' },
  { service: 'ezstart-api', project: 'ezstart-apis' },
]

const VERCEL_PROJECTS = [
  'web-ezstart',
  'web-ezauth',
  'web-ezbill',
  'web-ezpay',
  'web-green-pulse',
  'web-fengshui',
  'web-asc-tcd',
  'web-gacha-analyzer',
]

// Vars consumed by Railway services (APIs)
const RAILWAY_SHARED_VARS = new Set([
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG_SLUG',
  'EXCHANGE_RATE_API_KEY',
])

// Vars consumed by Vercel projects (web apps)
const VERCEL_SHARED_VARS = new Set([
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG_SLUG',
  // NEXT_PUBLIC_* handled dynamically below
])

// ── Load source of truth ─────────────────────────────────────────────────
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return null
  const out = {}
  fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .forEach(l => {
      const idx = l.indexOf('=')
      if (idx > 0) out[l.slice(0, idx).trim()] = l.slice(idx + 1).trim()
    })
  return out
}

const sourceFile = path.join(ROOT, '.env.production')
const source = parseEnv(sourceFile)
if (!source) {
  console.error(`\n❌ ${path.relative(ROOT, sourceFile)} not found.`)
  console.error('   Create it from .env.shared.example with your production values.\n')
  process.exit(1)
}

// ── Plan: which var goes where ───────────────────────────────────────────
const vercelTargets = [] // [{key, value}]
const railwayTargets = [] // [{key, value}]

for (const [key, value] of Object.entries(source)) {
  if (filterVars && !filterVars.includes(key)) continue
  if (!value) continue

  const isPublic = key.startsWith('NEXT_PUBLIC_')

  if (isPublic) {
    vercelTargets.push({ key, value })
    continue
  }
  if (RAILWAY_SHARED_VARS.has(key)) railwayTargets.push({ key, value })
  if (VERCEL_SHARED_VARS.has(key)) vercelTargets.push({ key, value })
}

// ── CLI checks ───────────────────────────────────────────────────────────
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
if (!vercelOnly && railwayTargets.length > 0) {
  console.log('── RAILWAY ──')
  console.log(
    `  Vars to push: ${railwayTargets.map(t => `${t.key}=${display(t.key, t.value)}`).join(', ')}`
  )
  console.log(`  Targets: ${RAILWAY_SERVICES.length} services`)

  if (!isDryRun) {
    if (!cliAvailable('railway')) {
      console.log('  ⚠  Railway CLI not found. Install: npm i -g @railway/cli')
    } else {
      for (const { service, project } of RAILWAY_SERVICES) {
        try {
          execSync(`railway link -p ${project} -s ${service} -e production`, {
            stdio: 'pipe',
            timeout: 15_000,
            cwd: ROOT,
          })
          for (const { key, value } of railwayTargets) {
            execSync(`railway variable set ${key}=${value}`, {
              stdio: 'pipe',
              timeout: 30_000,
              cwd: ROOT,
            })
          }
          console.log(`  ✅ ${service} (${project}) — ${railwayTargets.length} var(s) pushed`)
        } catch (err) {
          console.log(`  ❌ ${service} (${project}) — failed: ${err.message.split('\n')[0]}`)
        }
      }
    }
  } else {
    for (const { service, project } of RAILWAY_SERVICES) {
      console.log(`  📝 Would push to ${service} (${project})`)
    }
  }
  console.log('')
}

// ── VERCEL push ──────────────────────────────────────────────────────────
if (!railwayOnly && vercelTargets.length > 0) {
  console.log('── VERCEL ──')
  console.log(
    `  Vars to push: ${vercelTargets.map(t => `${t.key}=${display(t.key, t.value)}`).join(', ')}`
  )
  console.log(`  Targets: ${VERCEL_PROJECTS.length} projects`)

  if (!isDryRun) {
    if (!cliAvailable('vercel')) {
      console.log('  ⚠  Vercel CLI not found. Install: pnpm add -g vercel')
    } else {
      for (const project of VERCEL_PROJECTS) {
        let ok = 0,
          failed = 0
        for (const { key, value } of vercelTargets) {
          try {
            try {
              execSync(`vercel env rm ${key} production --yes --scope ${project}`, {
                stdio: 'pipe',
                timeout: 30_000,
                cwd: ROOT,
              })
            } catch {
              /* not present */
            }
            execSync(`echo ${value} | vercel env add ${key} production --scope ${project}`, {
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
          `  ${failed === 0 ? '✅' : '⚠'} ${project} — ${ok} pushed${failed ? `, ${failed} failed` : ''}`
        )
      }
    }
  } else {
    for (const project of VERCEL_PROJECTS) {
      console.log(`  📝 Would push to ${project}`)
    }
  }
  console.log('')
}

if (railwayTargets.length === 0 && vercelTargets.length === 0) {
  console.log('  ─  Nothing to push (no matching vars).')
}

console.log('═'.repeat(60))
console.log(
  isDryRun ? '🔍 Dry run complete. Re-run without --dry-run to apply.' : '✅ Sync complete.'
)
console.log('')
