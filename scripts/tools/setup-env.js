#!/usr/bin/env node
/**
 * Generate .env.local files for all APIs from environment variables or Codespace secrets.
 * Run: pnpm setup:env
 *
 * In Codespaces: secrets are auto-injected as env vars
 * Locally: uses defaults (localhost) if env vars not set
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')

// Read from env (Codespace secrets) or defaults
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-local-jwt-secret-change-me'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const OAUTH_ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || ''

const MONGO_OPTS = 'retryWrites=true&w=majority&appName=Cluster0'

const apps = [
  {
    path: 'apps/ezauth/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_URL}/ezauth?${MONGO_OPTS}`,
      JWT_SECRET,
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_CALLBACK_URL: 'http://localhost:6110/api/auth/google/callback',
      OAUTH_ENCRYPTION_KEY,
      RESEND_API_KEY,
      EMAIL_FROM: 'EZAuth <noreply@ezstart.xyz>',
    },
  },
  {
    path: 'apps/ezbill/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_URL}/ezbill?${MONGO_OPTS}`,
      JWT_SECRET,
      GEMINI_API_KEY,
      RESEND_API_KEY,
      EMAIL_FROM: 'EZBill <noreply@ezstart.xyz>',
    },
  },
  {
    path: 'apps/ezpay/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_URL}/ezpay?${MONGO_OPTS}`,
      JWT_SECRET,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
  },
  {
    path: 'apps/ezstart/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_URL}/ezstart?${MONGO_OPTS}`,
    },
  },
  {
    path: 'apps/green-pulse/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_URL}/greenpulse?${MONGO_OPTS}`,
      JWT_SECRET,
      GEMINI_API_KEY,
    },
  },
  {
    path: 'apps/gacha-analyzer/api',
    env: {
      NODE_ENV: 'development',
      MONGO_URL: `${MONGO_URL}/gacha-analyzer?${MONGO_OPTS}`,
      JWT_SECRET,
      GEMINI_API_KEY,
    },
  },
]

console.log('\n🔧 Generating .env.local files...\n')

const isCodespace = process.env.CODESPACES === 'true'
if (isCodespace) {
  console.log('  ☁️  Codespace detected — using GitHub secrets\n')
} else {
  console.log('  💻 Local dev — using defaults (localhost)\n')
}

let created = 0
let skipped = 0

for (const app of apps) {
  const envPath = path.join(ROOT, app.path, '.env.local')

  if (fs.existsSync(envPath)) {
    console.log(`  ⏭  ${app.path}/.env.local — already exists, skipping`)
    skipped++
    continue
  }

  const content = Object.entries(app.env)
    .filter(([, value]) => value !== '') // Skip empty values
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  fs.writeFileSync(envPath, content + '\n', 'utf8')
  console.log(`  ✅ ${app.path}/.env.local — created`)
  created++
}

console.log(`\n📋 Done: ${created} created, ${skipped} skipped (already exist)\n`)

if (!GEMINI_API_KEY) {
  console.log('  ⚠️  GEMINI_API_KEY not set — AI features will not work')
}
if (!RESEND_API_KEY) {
  console.log('  ⚠️  RESEND_API_KEY not set — emails will log to console instead of sending')
}
if (!GOOGLE_CLIENT_ID) {
  console.log(
    '  ⚠️  GOOGLE_CLIENT_ID not set — Google OAuth will not work (use X-User-Id header fallback)'
  )
}
if (!JWT_SECRET || JWT_SECRET === 'dev-local-jwt-secret-change-me') {
  console.log('  ⚠️  JWT_SECRET using default dev value')
}
console.log('')
