#!/usr/bin/env node
/**
 * Validate the centralized env architecture.
 *
 *   1. Root .env.local / .env.production  vs  .env.shared.example
 *   2. Per-app .env.local / .env.production vs apps/{app}/{layer}/.env.example
 *   3. Detect REDUNDANT app overrides (same value as root → useless duplication)
 *   4. Detect MISSING shared vars in root (defined per-app for 2+ apps → should be shared)
 *   5. Forbid real secrets in any *.example file
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
  /sk_test_/i,
  /mongodb\+srv:\/\/[^:]+:[^@]+@/i,
  /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/, // JWT
]
const PLACEHOLDER_RE = /(your-|change-|replace-|xxx|placeholder|example|TODO|here$)/i

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

console.log('\n=== .env Validation (centralized architecture) ===\n')

// ── 1. ROOT validation ─────────────────────────────────────────────────────
console.log('📁 ROOT (monorepo)')
const sharedExample = path.join(ROOT, '.env.shared.example')
const rootLocal = path.join(ROOT, '.env.local')
const rootProd = path.join(ROOT, '.env.production')

const sharedExampleVars = parseEnv(sharedExample) || {}
const sharedKeys = Object.keys(sharedExampleVars)

if (sharedKeys.length === 0) {
  warnPush('.env.shared.example has no documented vars — please populate it')
}

// Check shared.example has no real secrets
for (const [k, v] of Object.entries(sharedExampleVars)) {
  if (looksLikeSecret(v)) errorPush(`.env.shared.example has REAL SECRET: ${k}`)
}

const rootLocalVars = parseEnv(rootLocal)
if (rootLocalVars) {
  const missing = sharedKeys.filter(k => !(k in rootLocalVars))
  if (missing.length) warnPush(`root .env.local missing keys: ${missing.join(', ')}`)
  else okPush(`root .env.local — all ${sharedKeys.length} shared vars present`)
} else {
  warnPush('root .env.local — file not found (run `pnpm setup:env`)')
}

const rootProdVars = parseEnv(rootProd)
if (rootProdVars) {
  const missing = sharedKeys.filter(k => !(k in rootProdVars))
  if (missing.length) warnPush(`root .env.production missing keys: ${missing.join(', ')}`)
  else okPush(`root .env.production — all ${sharedKeys.length} shared vars present`)
} else {
  console.log('  ─  root .env.production — not found (OK if managed by Railway/Vercel)')
}

console.log('')

// ── 2. Discover all per-app env directories ────────────────────────────────
const appDirs = []
;(function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'tmp'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isFile() && entry.name === '.env.example') appDirs.push(path.dirname(full))
    else if (entry.isDirectory()) scan(full)
  }
})(path.join(ROOT, 'apps'))

// Track per-key defines to detect redundancy across apps
const perKeyAppValues = {} // key -> [{app, value}]

// ── 3. Per-app validation ──────────────────────────────────────────────────
for (const dir of appDirs) {
  const rel = path.relative(ROOT, dir).replace(/\\/g, '/')
  console.log(`📁 ${rel}`)

  const exampleVars = parseEnv(path.join(dir, '.env.example')) || {}
  const exampleKeys = Object.keys(exampleVars)
  const localVars = parseEnv(path.join(dir, '.env.local'))
  const prodVars = parseEnv(path.join(dir, '.env.production'))

  // Real secrets in .env.example
  for (const [k, v] of Object.entries(exampleVars)) {
    if (looksLikeSecret(v)) errorPush(`${rel}/.env.example has REAL SECRET: ${k}`)
  }

  // Local missing
  if (localVars) {
    // Account for vars satisfied by root
    const satisfied = key => key in localVars || (rootLocalVars && key in rootLocalVars)
    const missing = exampleKeys.filter(k => !satisfied(k))
    if (missing.length) warnPush(`.env.local missing (and not in root): ${missing.join(', ')}`)
    else okPush(`.env.local — all required vars resolvable`)

    // Redundant overrides — same value as root
    if (rootLocalVars) {
      const redundant = Object.entries(localVars).filter(
        ([k, v]) => rootLocalVars[k] === v && v !== ''
      )
      if (redundant.length) {
        warnPush(
          `.env.local has redundant overrides (= root value): ${redundant.map(([k]) => k).join(', ')}`
        )
      }
    }

    // Track for cross-app analysis
    for (const [k, v] of Object.entries(localVars)) {
      if (!perKeyAppValues[k]) perKeyAppValues[k] = []
      perKeyAppValues[k].push({ app: rel, value: v })
    }
  } else {
    console.log('  ─  .env.local not found')
  }

  // Prod missing
  if (prodVars) {
    const satisfied = key => key in prodVars || (rootProdVars && key in rootProdVars)
    const missing = exampleKeys.filter(k => !satisfied(k))
    if (missing.length) warnPush(`.env.production missing (and not in root): ${missing.join(', ')}`)
    else okPush(`.env.production — all required vars resolvable`)
  }

  console.log('')
}

// ── 4. Cross-app analysis: vars defined per-app with SAME value should be shared
console.log('🔎 Cross-app analysis — promote candidates to root .env.local')
let promoteCount = 0
for (const [key, occurrences] of Object.entries(perKeyAppValues)) {
  if (occurrences.length < 2) continue
  if (rootLocalVars && key in rootLocalVars) continue
  const uniqueValues = new Set(occurrences.map(o => o.value).filter(Boolean))
  if (uniqueValues.size === 1 && [...uniqueValues][0]) {
    warnPush(
      `${key} defined identically in ${occurrences.length} apps (${safe(key, [...uniqueValues][0])}) — consider promoting to root .env.local`
    )
    promoteCount++
  }
}
if (promoteCount === 0) okPush('No cross-app duplication detected')
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
