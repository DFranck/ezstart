#!/usr/bin/env node
/**
 * Rotate all secrets across the monorepo.
 * Generates separate DEV and PROD keys, updates .env.local + .env.production,
 * and tells you which Railway/Vercel services need updating.
 *
 * Usage:
 *   pnpm rotate-secrets              # rotate all (dev + prod)
 *   pnpm rotate-secrets -- --dev     # rotate dev only (.env.local)
 *   pnpm rotate-secrets -- --prod    # rotate prod only (.env.production)
 *   pnpm rotate-secrets -- --dry-run    # show what would change
 *   pnpm rotate-secrets -- --no-railway # skip Railway push
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
const doBoth = !devOnly && !prodOnly

// ── Generate secrets ──
const devJwtSecret = crypto.randomBytes(64).toString('base64url')
const prodJwtSecret = crypto.randomBytes(64).toString('base64url')

// ── Railway services needing JWT_SECRET ──
const RAILWAY_SERVICES = [
  { service: 'ezauth-api', project: 'ezstart-apis' },
  { service: 'ezbill-api', project: 'ezstart-apis' },
  { service: 'ezpay-api', project: 'ezstart-apis' },
  { service: 'greenpulse-api', project: 'TeamProjects' },
]

// ── Which apps need JWT_SECRET ──
const JWT_APPS = [
  'apps/ezauth/api',
  'apps/ezbill/api',
  'apps/gacha-analyzer/api',
  'apps/green-pulse/api',
  'apps/ezpay/api',
  // ezstart n'a pas besoin de JWT (monitoring public)
]

console.log(isDryRun ? '\n🔍 DRY RUN\n' : '\n🔐 Rotating secrets...\n')

function updateEnvFile(filePath, secrets) {
  const fullPath = path.join(ROOT, filePath)
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠  ${filePath} — not found, skipping`)
    return
  }

  let content = fs.readFileSync(fullPath, 'utf8')
  let changed = false

  for (const [key, value] of Object.entries(secrets)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`)
      changed = true
    } else {
      content = content.trimEnd() + `\n${key}=${value}\n`
      changed = true
    }
  }

  if (changed && !isDryRun) {
    fs.writeFileSync(fullPath, content, 'utf8')
  }

  console.log(`  ${isDryRun ? '📝' : '✅'} ${filePath} — ${changed ? 'updated' : 'no changes'}`)
}

// ── DEV (.env.local) ──
if (doBoth || devOnly) {
  console.log('── DEV (.env.local) ──')
  for (const app of JWT_APPS) {
    updateEnvFile(`${app}/.env.local`, { JWT_SECRET: devJwtSecret })
  }
  console.log('')
}

// ── PROD (.env.production) ──
if (doBoth || prodOnly) {
  console.log('── PROD (.env.production) ──')
  for (const app of JWT_APPS) {
    updateEnvFile(`${app}/.env.production`, { JWT_SECRET: prodJwtSecret })
  }
  console.log('')
}

// ── Railway push ──
let railwayUpdated = false
if ((doBoth || prodOnly) && !noRailway && !isDryRun) {
  console.log('── RAILWAY (push JWT_SECRET) ──')

  // Check if railway CLI is available
  let railwayAvailable = false
  try {
    execSync('railway version', { stdio: 'pipe' })
    railwayAvailable = true
  } catch {
    console.log('  ⚠  Railway CLI not found. Install: npm i -g @railway/cli')
    console.log('  ⚠  Skipping automatic push — update manually in the Railway dashboard.')
  }

  if (railwayAvailable) {
    const results = []
    for (const { service, project } of RAILWAY_SERVICES) {
      try {
        execSync(
          `railway variables set JWT_SECRET=${prodJwtSecret} --service ${service} --project ${project}`,
          { stdio: 'pipe', timeout: 30_000 }
        )
        console.log(`  ✅ ${service} (${project}) — updated`)
        results.push({ service, project, ok: true })
      } catch (err) {
        console.log(`  ❌ ${service} (${project}) — failed: ${err.message}`)
        results.push({ service, project, ok: false })
      }
    }
    railwayUpdated = results.some(r => r.ok)
  }
  console.log('')
} else if ((doBoth || prodOnly) && !noRailway && isDryRun) {
  console.log('── RAILWAY (dry-run) ──')
  for (const { service, project } of RAILWAY_SERVICES) {
    console.log(
      `  📝 Would run: railway variables set JWT_SECRET=<secret> --service ${service} --project ${project}`
    )
  }
  console.log('')
}

// ── Summary ──
console.log('═'.repeat(60))
console.log('📋 Summary')
console.log('═'.repeat(60))

if (doBoth || devOnly) {
  console.log('')
  console.log('  DEV JWT_SECRET (for local development):')
  console.log(`  ${devJwtSecret}`)
}

if (doBoth || prodOnly) {
  console.log('')
  console.log('  PROD JWT_SECRET (for Railway):')
  console.log(`  ${prodJwtSecret}`)

  if (railwayUpdated) {
    console.log('')
    console.log('  ⚡ Railway services updated automatically via CLI.')
  } else if (!noRailway && !isDryRun) {
    console.log('')
    console.log('  ⚡ Update manually in Railway dashboard:')
    console.log('  ┌──────────────────────┬────────────────┐')
    console.log('  │ Service              │ Variable       │')
    console.log('  ├──────────────────────┼────────────────┤')
    console.log('  │ ezauth-api           │ JWT_SECRET     │')
    console.log('  │ ezbill-api           │ JWT_SECRET     │')
    console.log('  │ gacha-analyzer-api   │ JWT_SECRET     │')
    console.log('  │ greenpulse-api       │ JWT_SECRET     │')
    console.log('  │ ezpay-api            │ JWT_SECRET     │')
    console.log('  └──────────────────────┴────────────────┘')
    console.log(`  Value: ${prodJwtSecret}`)
  } else {
    console.log('')
    console.log('  ℹ  Railway push skipped (--no-railway or --dry-run).')
  }
}

console.log('')
if (!isDryRun) {
  console.log('✅ Done. Restart dev servers: pnpm dev all')
} else {
  console.log('🔍 Dry run. Run without --dry-run to apply.')
}
console.log('')
