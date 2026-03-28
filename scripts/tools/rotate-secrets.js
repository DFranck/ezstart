#!/usr/bin/env node
/**
 * Rotate all secrets across the monorepo.
 * Generates new secure keys, updates all .env.local files, and tells you
 * which Railway/Vercel services need updating.
 *
 * Usage:
 *   node scripts/tools/rotate-secrets.js           # rotate all
 *   node scripts/tools/rotate-secrets.js --dry-run  # show what would change without writing
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const isDryRun = process.argv.includes('--dry-run')

// ── Generate secrets ──
const newJwtSecret = crypto.randomBytes(64).toString('base64url')

// ── Define which .env.local files need which secrets ──
const ENV_FILES = [
  {
    file: 'apps/ezauth/api/.env.local',
    secrets: { JWT_SECRET: newJwtSecret },
  },
  {
    file: 'apps/ezbill/api/.env.local',
    secrets: { JWT_SECRET: newJwtSecret },
  },
  // Add more apps here as they adopt JWT auth
]

// ── Update .env.local files ──
console.log(isDryRun ? '\n🔍 DRY RUN — no files will be changed\n' : '\n🔐 Rotating secrets...\n')

for (const { file, secrets } of ENV_FILES) {
  const fullPath = path.join(ROOT, file)

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠  ${file} — file not found, skipping`)
    continue
  }

  let content = fs.readFileSync(fullPath, 'utf8')
  let changed = false

  for (const [key, value] of Object.entries(secrets)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`)
      changed = true
    } else {
      // Key doesn't exist yet — append
      content += `\n${key}=${value}\n`
      changed = true
    }
  }

  if (changed) {
    if (!isDryRun) {
      fs.writeFileSync(fullPath, content, 'utf8')
      console.log(`  ✅ ${file} — updated`)
    } else {
      console.log(`  📝 ${file} — would update: ${Object.keys(secrets).join(', ')}`)
    }
  } else {
    console.log(`  ✓  ${file} — no changes needed`)
  }
}

// ── Production reminder ──
console.log('\n' + '═'.repeat(60))
console.log('📋 PRODUCTION — Update these env vars manually:')
console.log('═'.repeat(60))
console.log('')
console.log('  Railway (APIs):')
console.log('  ┌──────────────────────┬────────────────┬───────────────────┐')
console.log('  │ Service              │ Variable       │ Value             │')
console.log('  ├──────────────────────┼────────────────┼───────────────────┤')
console.log(`  │ ezauth-api           │ JWT_SECRET     │ ${newJwtSecret.slice(0, 15)}... │`)
console.log(`  │ ezbill-api           │ JWT_SECRET     │ (same as above)   │`)
console.log('  └──────────────────────┴────────────────┴───────────────────┘')
console.log('')
console.log('  ⚡ Quick copy for Railway:')
console.log(`  JWT_SECRET=${newJwtSecret}`)
console.log('')

if (!isDryRun) {
  console.log('✅ Local .env.local files updated. Restart your dev servers.')
} else {
  console.log('🔍 Dry run complete. Run without --dry-run to apply changes.')
}
console.log('')
