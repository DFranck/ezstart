#!/usr/bin/env node
/**
 * Bootstrap the root .env.local from the committed .env.example template.
 *
 * The monorepo uses ONE env file at the root per environment
 * (`.env.local`, `.env.staging`, `.env.production`). App-local `.env.*` files
 * are intentionally NOT created — each app reads root values through the
 * `@ezstart/config` helpers.
 *
 * Idempotent:
 *   - Creates `.env.local` from `.env.example` if it doesn't exist.
 *   - Never overwrites an existing `.env.local` (edit it by hand).
 *
 * Usage:
 *   pnpm setup:env              # bootstrap root .env.local
 *   pnpm setup:env -- --dry-run # show what would happen
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')

const TEMPLATE = path.join(ROOT, '.env.example')
const TARGET = path.join(ROOT, '.env.local')

console.log(isDryRun ? '\n🔍 DRY RUN — no files written\n' : '\n🔧 Setting up root env...\n')

if (!fs.existsSync(TEMPLATE)) {
  console.error(`  ❌ Missing ${TEMPLATE}. This repo is misconfigured.`)
  process.exit(1)
}

if (fs.existsSync(TARGET)) {
  console.log(`  ─  .env.local already exists — leaving it alone.`)
  console.log(`     Edit it directly to add missing secrets.`)
} else if (isDryRun) {
  console.log(`  📝 Would copy .env.example → .env.local`)
} else {
  fs.copyFileSync(TEMPLATE, TARGET)
  console.log(`  ✅ Created .env.local from .env.example`)
  console.log(`     Edit it to fill in the placeholders (DEV_PASSWORD, API keys, etc.).`)
}

console.log('')
console.log('═'.repeat(60))
console.log(isDryRun ? '🔍 Dry run complete.' : '✅ Done.')
console.log('   Validate with: pnpm validate-env')
console.log('')
