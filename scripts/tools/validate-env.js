#!/usr/bin/env node
/**
 * Validate the centralized env architecture (root-only, generic).
 *
 *   1. Root .env.example lists all expected keys (no secrets).
 *   2. Root .env.local / .env.staging / .env.production (if present) cover
 *      every key from .env.example.
 *   3. Per-app .env.example files are documentation only — they must NOT
 *      contain actual secret values.
 *   4. No per-app .env.local or .env.production files exist (only
 *      apps/ezauth/api/.env.test is allowed — vitest legit).
 *
 * Usage: pnpm validate-env
 *        node scripts/tools/validate-env.js --strict   # exit 1 on warnings too
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..')
const args = process.argv.slice(2)
const strict = args.includes('--strict')

const SENSITIVE_RE = /(SECRET|KEY|TOKEN|PASSWORD|DSN|PRIVATE)/i

function mask(value) {
  if (!value) return '(empty)'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

function safe(key, value) {
  if (!value) return '(empty)'
  return SENSITIVE_RE.test(key) ? mask(value) : value
}

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

const SECRET_PATTERNS = [
  /sk_live_/i,
  /sk_test_[a-zA-Z0-9]{20,}/i,
  /mongodb\+srv:\/\/[^:]+:[^@<{]+@/i, // real password (not a <PLACEHOLDER> or {templated})
  /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/, // JWT
]
const PLACEHOLDER_RE = /(your-|change-|replace-|xxx|placeholder|example|TODO|<|\{)/i

function looksLikeSecret(value) {
  if (!value) return false
  if (PLACEHOLDER_RE.test(value)) return false
  return SECRET_PATTERNS.some(p => p.test(value))
}

let errors = 0
let warnings = 0
const errorPush = msg => {
  errors++
  console.log(`  ❌ ${msg}`)
}
const warnPush = msg => {
  warnings++
  console.log(`  ⚠  ${msg}`)
}
const okPush = msg => console.log(`  ✅ ${msg}`)

console.log('\n=== .env Validation (root-only generic architecture) ===\n')

// ── 1. ROOT validation ─────────────────────────────────────────────────────
console.log('📁 ROOT (monorepo)')
const rootExample = path.join(ROOT, '.env.example')
const rootLocal = path.join(ROOT, '.env.local')
const rootStaging = path.join(ROOT, '.env.staging')
const rootProd = path.join(ROOT, '.env.production')

const exampleVars = parseEnv(rootExample) || {}
const exampleKeys = Object.keys(exampleVars)

if (exampleKeys.length === 0) {
  warnPush('.env.example has no documented vars — please populate it')
}

// Check example has no real secrets
for (const [k, v] of Object.entries(exampleVars)) {
  if (looksLikeSecret(v)) errorPush(`.env.example has REAL SECRET: ${k}`)
}

for (const [label, filePath] of [
  ['.env.local', rootLocal],
  ['.env.staging', rootStaging],
  ['.env.production', rootProd],
]) {
  const vars = parseEnv(filePath)
  if (vars) {
    const missing = exampleKeys.filter(k => !(k in vars))
    if (missing.length) warnPush(`root ${label} missing keys: ${missing.join(', ')}`)
    else okPush(`root ${label} — all ${exampleKeys.length} keys present`)
  } else {
    console.log(`  ─  root ${label} — not found (OK if unused for this environment)`)
  }
}

console.log('')

// ── 2. Per-app .env.example files ──────────────────────────────────────────
const appEnvExamples = []
const strayEnvFiles = []
;(function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'tmp'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isFile()) {
      if (entry.name === '.env.example') appEnvExamples.push(full)
      else if (entry.name === '.env.local' || entry.name === '.env.production') {
        strayEnvFiles.push(full)
      }
    } else if (entry.isDirectory()) scan(full)
  }
})(path.join(ROOT, 'apps'))

console.log('📁 Per-app .env.example (must be doc only, no secrets)')
for (const file of appEnvExamples) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')
  const vars = parseEnv(file) || {}
  let localErr = 0
  for (const [k, v] of Object.entries(vars)) {
    if (looksLikeSecret(v)) {
      errorPush(`${rel} has REAL SECRET: ${k} (=${safe(k, v)})`)
      localErr++
    }
  }
  if (localErr === 0) okPush(rel)
}
console.log('')

// ── 3. Stray app-local env files — should not exist ────────────────────────
console.log('📁 Stray app-local env files')
if (strayEnvFiles.length === 0) {
  okPush('None found (root-only architecture respected)')
} else {
  for (const file of strayEnvFiles) {
    errorPush(
      `Found stray app-local env file: ${path.relative(ROOT, file).replace(/\\/g, '/')} — delete it, root is the only source`
    )
  }
}
console.log('')

// ── Summary ────────────────────────────────────────────────────────────────
console.log('═'.repeat(60))
if (errors === 0 && warnings === 0) {
  console.log('✅ All .env files are consistent.')
  process.exit(0)
} else {
  console.log(`Errors: ${errors}  |  Warnings: ${warnings}`)
  if (errors > 0 || (strict && warnings > 0)) {
    console.log('❌ Validation failed. Fix issues before deploying.\n')
    process.exit(1)
  }
  console.log('⚠  Validation passed with warnings.\n')
  process.exit(0)
}
