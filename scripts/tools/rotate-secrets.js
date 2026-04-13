#!/usr/bin/env node
/**
 * Rotate per-app secrets across the monorepo.
 *
 * Per-app secrets (JWT_SECRET, OAUTH_ENCRYPTION_KEY) are written to
 * apps/{app}/{layer}/.env.{local|production}. Shared secrets (root
 * .env.local / .env.production) stay manual — use `pnpm secrets:sync`
 * to push them to platforms.
 *
 * Usage:
 *   pnpm rotate-secrets                 # rotate dev + prod, push to Railway + Vercel
 *   pnpm rotate-secrets -- --dev        # only .env.local (dev)
 *   pnpm rotate-secrets -- --prod       # only .env.production
 *   pnpm rotate-secrets -- --dry-run    # show what would change
 *   pnpm rotate-secrets -- --no-railway # skip Railway push
 *   pnpm rotate-secrets -- --no-vercel  # skip Vercel push
 *
 * Secrets are NEVER printed in plaintext — only masked previews.
 */

const crypto = require('crypto')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const devOnly = args.includes('--dev')
const prodOnly = args.includes('--prod')
const noRailway = args.includes('--no-railway')
const noVercel = args.includes('--no-vercel')
const doBoth = !devOnly && !prodOnly

// ── Generate fresh secrets ──
const devJwtSecret = crypto.randomBytes(64).toString('base64url')
const prodJwtSecret = crypto.randomBytes(64).toString('base64url')
const devOauthEncKey = crypto.randomBytes(32).toString('base64url')
const prodOauthEncKey = crypto.randomBytes(32).toString('base64url')

function mask(value) {
  if (!value) return '(empty)'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

// ── Targets ──
const RAILWAY_SERVICES = [
  { service: 'ezauth-api', project: 'ezstart-apis' },
  { service: 'ezbill-api', project: 'ezstart-apis' },
  { service: 'ezpay-api', project: 'ezstart-apis' },
  { service: 'gacha-analyzer-api', project: 'ezstart-apis' },
  { service: 'greenpulse-api', project: 'TeamProjects' },
]

// Vercel projects that consume JWT-signed tokens (web apps using auth-sdk).
// JWT_SECRET is ONLY needed where tokens are verified server-side — most webs
// only need it if they have route handlers that re-verify cookies.
const VERCEL_PROJECTS = [
  'web-ezauth',
  'web-ezbill',
  'web-ezpay',
  'web-green-pulse',
  'web-gacha-analyzer',
]

const JWT_APPS = [
  'apps/ezauth/api',
  'apps/ezbill/api',
  'apps/gacha-analyzer/api',
  'apps/green-pulse/api',
  'apps/ezpay/api',
]

console.log(
  isDryRun ? '\n🔍 DRY RUN — no files or remote env changes\n' : '\n🔐 Rotating secrets...\n'
)

function ensureBackup(filePath) {
  if (!fs.existsSync(filePath) || isDryRun) return
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(ROOT, 'tmp', `secrets-backup-${ts}`)
  fs.mkdirSync(backupDir, { recursive: true })
  const dest = path.join(backupDir, path.relative(ROOT, filePath).replace(/[\\/]/g, '__'))
  fs.copyFileSync(filePath, dest)
}

function updateEnvFile(filePath, secrets) {
  const fullPath = path.join(ROOT, filePath)
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠  ${filePath} — not found, skipping`)
    return
  }
  ensureBackup(fullPath)

  let content = fs.readFileSync(fullPath, 'utf8')
  let changed = false

  for (const [key, value] of Object.entries(secrets)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`)
    } else {
      content = content.trimEnd() + `\n${key}=${value}\n`
    }
    changed = true
  }

  if (changed && !isDryRun) fs.writeFileSync(fullPath, content, 'utf8')

  const preview = Object.entries(secrets)
    .map(([k, v]) => `${k}=${mask(v)}`)
    .join(', ')
  console.log(`  ${isDryRun ? '📝' : '✅'} ${filePath} — ${preview}`)
}

// ── DEV (.env.local) ──
if (doBoth || devOnly) {
  console.log('── DEV (.env.local) ──')
  for (const app of JWT_APPS) {
    updateEnvFile(`${app}/.env.local`, { JWT_SECRET: devJwtSecret })
  }
  updateEnvFile('apps/ezauth/api/.env.local', { OAUTH_ENCRYPTION_KEY: devOauthEncKey })
  console.log('')
}

// ── PROD (.env.production) ──
if (doBoth || prodOnly) {
  console.log('── PROD (.env.production) ──')
  for (const app of JWT_APPS) {
    updateEnvFile(`${app}/.env.production`, { JWT_SECRET: prodJwtSecret })
  }
  updateEnvFile('apps/ezauth/api/.env.production', { OAUTH_ENCRYPTION_KEY: prodOauthEncKey })
  console.log('')
}

// ── Railway push ──
function railwayAvailable() {
  try {
    execSync('railway --version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

let railwayUpdated = false
if ((doBoth || prodOnly) && !noRailway) {
  console.log('── RAILWAY (push JWT_SECRET) ──')
  if (isDryRun) {
    for (const { service, project } of RAILWAY_SERVICES) {
      console.log(`  📝 Would push JWT_SECRET=${mask(prodJwtSecret)} → ${service} (${project})`)
      if (service === 'ezauth-api') {
        console.log(`  📝 Would push OAUTH_ENCRYPTION_KEY=${mask(prodOauthEncKey)} → ${service}`)
      }
    }
  } else if (!railwayAvailable()) {
    console.log('  ⚠  Railway CLI not found. Install: npm i -g @railway/cli')
  } else {
    for (const { service, project } of RAILWAY_SERVICES) {
      try {
        execSync(`railway link -p ${project} -s ${service} -e production`, {
          stdio: 'pipe',
          timeout: 15_000,
          cwd: ROOT,
        })
        execSync(`railway variable set JWT_SECRET=${prodJwtSecret}`, {
          stdio: 'pipe',
          timeout: 30_000,
          cwd: ROOT,
        })
        if (service === 'ezauth-api') {
          execSync(`railway variable set OAUTH_ENCRYPTION_KEY=${prodOauthEncKey}`, {
            stdio: 'pipe',
            timeout: 30_000,
            cwd: ROOT,
          })
          console.log(
            `  ✅ ${service} (${project}) — JWT_SECRET=${mask(prodJwtSecret)} + OAUTH_ENCRYPTION_KEY=${mask(prodOauthEncKey)}`
          )
        } else {
          console.log(`  ✅ ${service} (${project}) — JWT_SECRET=${mask(prodJwtSecret)}`)
        }
        railwayUpdated = true
      } catch (err) {
        console.log(`  ❌ ${service} (${project}) — failed: ${err.message.split('\n')[0]}`)
      }
    }
  }
  console.log('')
}

// ── Vercel push ──
function vercelAvailable() {
  try {
    execSync('vercel --version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

let vercelUpdated = false
if ((doBoth || prodOnly) && !noVercel) {
  console.log('── VERCEL (push JWT_SECRET) ──')
  if (isDryRun) {
    for (const project of VERCEL_PROJECTS) {
      console.log(`  📝 Would push JWT_SECRET=${mask(prodJwtSecret)} → ${project} (production)`)
    }
  } else if (!vercelAvailable()) {
    console.log('  ⚠  Vercel CLI not found. Install: pnpm add -g vercel')
  } else {
    for (const project of VERCEL_PROJECTS) {
      try {
        // Remove first (idempotent), then add. `vercel env rm` exits non-zero if absent — ignore.
        try {
          execSync(`vercel env rm JWT_SECRET production --yes --scope ${project}`, {
            stdio: 'pipe',
            timeout: 30_000,
            cwd: ROOT,
          })
        } catch {
          /* not present, ignore */
        }
        execSync(
          `echo ${prodJwtSecret} | vercel env add JWT_SECRET production --scope ${project}`,
          {
            stdio: 'pipe',
            timeout: 30_000,
            cwd: ROOT,
            shell: true,
          }
        )
        console.log(`  ✅ ${project} — JWT_SECRET=${mask(prodJwtSecret)}`)
        vercelUpdated = true
      } catch (err) {
        console.log(`  ❌ ${project} — failed: ${err.message.split('\n')[0]}`)
      }
    }
  }
  console.log('')
}

// ── Summary ──
console.log('═'.repeat(60))
console.log('📋 Summary')
console.log('═'.repeat(60))

if (doBoth || devOnly) {
  console.log(`  DEV  JWT_SECRET   = ${mask(devJwtSecret)}  (in .env.local files)`)
}
if (doBoth || prodOnly) {
  console.log(`  PROD JWT_SECRET   = ${mask(prodJwtSecret)}  (in .env.production files)`)
  console.log(`  PROD OAUTH_KEY    = ${mask(prodOauthEncKey)}  (ezauth only)`)
  if (railwayUpdated) console.log('  ⚡ Railway updated automatically.')
  if (vercelUpdated) console.log('  ⚡ Vercel updated automatically.')
  if (!noRailway && !railwayUpdated && !isDryRun)
    console.log('  ⚠  Railway not updated — push manually or fix the CLI.')
  if (!noVercel && !vercelUpdated && !isDryRun)
    console.log('  ⚠  Vercel not updated — push manually or fix the CLI.')
}
console.log('')
console.log(
  isDryRun
    ? '🔍 Dry run. Re-run without --dry-run to apply.'
    : '✅ Done. Restart dev servers: pnpm dev <app>'
)
console.log('   Plain values are not printed — check .env files locally if needed.\n')
