#!/usr/bin/env node
/**
 * Generate/update .env.local files post-centralization.
 *
 *   - Root  .env.local             → SHARED secrets (consumed by every app/api)
 *   - apps/{app}/{layer}/.env.local → APP-SPECIFIC overrides only (MONGO_URL, JWT_SECRET, OAuth callbacks…)
 *
 * Idempotent — only fills missing keys. Won't overwrite existing values.
 *
 * Usage:
 *   pnpm setup:env                # write/update both root + per-app
 *   pnpm setup:env -- --dry-run   # show what would change, no write
 *   pnpm setup:env -- --root-only # only the root .env.local
 *   pnpm setup:env -- --apps-only # only per-app .env.local files
 *   pnpm setup:env -- --force     # overwrite existing values (BACKUP first!)
 *
 * In Codespaces (CODESPACES=true), GitHub secrets are auto-injected as env vars
 * and used as defaults. Locally, sensible localhost defaults are used.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '..', '..')
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const rootOnly = args.includes('--root-only')
const appsOnly = args.includes('--apps-only')
const force = args.includes('--force')

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

function ensureBackup(filePath) {
  if (!fs.existsSync(filePath) || isDryRun) return
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(ROOT, 'tmp', `env-backup-${ts}`)
  fs.mkdirSync(backupDir, { recursive: true })
  const dest = path.join(backupDir, path.relative(ROOT, filePath).replace(/[\\/]/g, '__'))
  fs.copyFileSync(filePath, dest)
}

// ── Read existing values (don't overwrite unless --force) ──────────────────
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}
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

// ── Sources for SHARED vars (root .env.local) ──────────────────────────────
// Anything documented in .env.shared.example
const SHARED_VARS = {
  // AI providers
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  // Email
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  // Sentry org (NOT per-project DSNs)
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || '',
  SENTRY_ORG_SLUG: process.env.SENTRY_ORG_SLUG || '',
  // Atlas admin
  MONGODB_ATLAS_PUBLIC_KEY: process.env.MONGODB_ATLAS_PUBLIC_KEY || '',
  MONGODB_ATLAS_PRIVATE_KEY: process.env.MONGODB_ATLAS_PRIVATE_KEY || '',
  MONGODB_ATLAS_PROJECT_ID: process.env.MONGODB_ATLAS_PROJECT_ID || '',
  // Infra CLIs
  VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
  VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID || '',
  RAILWAY_TOKEN: process.env.RAILWAY_TOKEN || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  GITHUB_USERNAME: process.env.GITHUB_USERNAME || '',
  // External APIs shared by multiple apps
  EXCHANGE_RATE_API_KEY: process.env.EXCHANGE_RATE_API_KEY || '',
}

// ── App-specific overrides (only these vars are written per-app) ───────────
// MUST stay per-app: MONGO_URL (separate DBs), JWT_SECRET (rotated independently),
// OAuth callbacks (different ports/domains), STRIPE_*, EMAIL_FROM, NEXT_PUBLIC_*
const MONGO_BASE = process.env.MONGO_URL || 'mongodb://localhost:27017'
const MONGO_OPTS = 'retryWrites=true&w=majority&appName=Cluster0'
const devJwt = () => crypto.randomBytes(32).toString('base64url')

const APP_OVERRIDES = [
  {
    path: 'apps/ezauth/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_BASE}/ezauth?${MONGO_OPTS}`,
      JWT_SECRET: process.env.JWT_SECRET || devJwt(),
      OAUTH_ENCRYPTION_KEY:
        process.env.OAUTH_ENCRYPTION_KEY || crypto.randomBytes(32).toString('base64url'),
      OAUTH_STATE_SECRET:
        process.env.OAUTH_STATE_SECRET || crypto.randomBytes(32).toString('base64url'),
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
      GOOGLE_CALLBACK_URL: 'http://localhost:6110/api/auth/google/callback',
      EMAIL_FROM: 'EZAuth <noreply@ezstart.xyz>',
    },
  },
  {
    path: 'apps/ezbill/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_BASE}/ezbill?${MONGO_OPTS}`,
      JWT_SECRET: process.env.JWT_SECRET || devJwt(),
      EMAIL_FROM: 'EZBill <noreply@ezstart.xyz>',
    },
  },
  {
    path: 'apps/ezpay/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_BASE}/ezpay?${MONGO_OPTS}`,
      JWT_SECRET: process.env.JWT_SECRET || devJwt(),
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
  },
  {
    path: 'apps/ezstart/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_BASE}/ezstart?${MONGO_OPTS}`,
    },
  },
  {
    path: 'apps/green-pulse/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_BASE}/greenpulse?${MONGO_OPTS}`,
      JWT_SECRET: process.env.JWT_SECRET || devJwt(),
    },
  },
  {
    path: 'apps/gacha-analyzer/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_BASE}/gacha-analyzer?${MONGO_OPTS}`,
      JWT_SECRET: process.env.JWT_SECRET || devJwt(),
    },
  },
]

function mergeKeepExisting(existing, target) {
  const out = { ...existing }
  const changes = []
  for (const [key, value] of Object.entries(target)) {
    if (force || !(key in existing) || existing[key] === '') {
      if (existing[key] !== value && value !== '') {
        out[key] = value
        changes.push({ key, before: existing[key], after: value })
      }
    }
  }
  return { merged: out, changes }
}

function serialize(entries) {
  return (
    Object.entries(entries)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n') + '\n'
  )
}

function writeFile(filePath, label, target) {
  const existing = parseEnv(filePath)
  const { merged, changes } = mergeKeepExisting(existing, target)

  if (changes.length === 0) {
    console.log(`  ─  ${label} — up to date`)
    return
  }

  console.log(`  ${isDryRun ? '📝' : '✅'} ${label} — ${changes.length} change(s):`)
  for (const c of changes) {
    const before = c.before === undefined ? '(missing)' : display(c.key, c.before)
    const after = display(c.key, c.after)
    console.log(`       ${c.key}: ${before} → ${after}`)
  }

  if (!isDryRun) {
    ensureBackup(filePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, serialize(merged), 'utf8')
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
console.log(
  isDryRun ? '\n🔍 DRY RUN — no files will be written\n' : '\n🔧 Generating .env.local files...\n'
)

const isCodespace = process.env.CODESPACES === 'true'
console.log(
  `  ${isCodespace ? '☁️  Codespace detected — using GitHub secrets' : '💻 Local dev — defaults + env vars'}\n`
)

if (!appsOnly) {
  console.log('── ROOT (shared secrets) ──')
  writeFile(path.join(ROOT, '.env.local'), '.env.local (root)', SHARED_VARS)
  console.log('')
}

if (!rootOnly) {
  console.log('── APP-SPECIFIC (overrides only) ──')
  for (const app of APP_OVERRIDES) {
    writeFile(path.join(ROOT, app.path, '.env.local'), `${app.path}/.env.local`, app.env)
  }
  console.log('')
}

console.log('═'.repeat(60))
console.log(isDryRun ? '🔍 Dry run complete. Re-run without --dry-run to apply.' : '✅ Done.')
console.log('   Validate with: pnpm validate-env')
console.log('')
