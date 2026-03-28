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
 *   pnpm rotate-secrets -- --dry-run # show what would change
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const devOnly = args.includes('--dev')
const prodOnly = args.includes('--prod')
const doBoth = !devOnly && !prodOnly

// ── Generate secrets ──
const devJwtSecret = crypto.randomBytes(64).toString('base64url')
const prodJwtSecret = crypto.randomBytes(64).toString('base64url')

// ── Which apps need JWT_SECRET ──
const JWT_APPS = [
  'apps/ezauth/api',
  'apps/ezbill/api',
  // Add more as they adopt JWT auth
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
  console.log('')
  console.log('  ⚡ Update in Railway dashboard:')
  console.log('  ┌──────────────────────┬────────────────┐')
  console.log('  │ Service              │ Variable       │')
  console.log('  ├──────────────────────┼────────────────┤')
  console.log('  │ ezauth-api           │ JWT_SECRET     │')
  console.log('  │ ezbill-api           │ JWT_SECRET     │')
  console.log('  └──────────────────────┴────────────────┘')
  console.log(`  Value: ${prodJwtSecret}`)
}

console.log('')
if (!isDryRun) {
  console.log('✅ Done. Restart dev servers: pnpm dev all')
} else {
  console.log('🔍 Dry run. Run without --dry-run to apply.')
}
console.log('')
