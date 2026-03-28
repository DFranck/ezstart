#!/usr/bin/env node
/**
 * Validate that .env.local and .env.production have all variables from .env.example.
 * Also checks that .env.example has no real secrets (only placeholders).
 *
 * Usage: node scripts/tools/validate-env.js
 *        pnpm validate-env
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')

function parseEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=')[0].trim())
    .filter(Boolean)
}

function parseEnvValues(filePath) {
  if (!fs.existsSync(filePath)) return null
  const entries = {}
  fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .forEach(l => {
      const [key, ...rest] = l.split('=')
      if (key) entries[key.trim()] = rest.join('=').trim()
    })
  return entries
}

// Secret patterns that should NOT be in .env.example
const SECRET_PATTERNS = [
  /sk_live_/i,
  /sk_test_/i,
  /mongodb\+srv:\/\/[^:]+:[^@]+@/i,
  /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/,  // JWT token
  /[a-f0-9]{32,}/i,  // long hex (could be API key)
]

const PLACEHOLDER_PATTERNS = [
  /your-/i, /change-/i, /replace-/i, /xxx/i, /placeholder/i, /example/i, /TODO/i,
]

// Find all apps with .env.example
const appDirs = []
const scan = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue
    const full = path.join(dir, entry.name)
    if (entry.isFile() && entry.name === '.env.example') {
      appDirs.push(path.dirname(full))
    } else if (entry.isDirectory()) {
      scan(full)
    }
  }
}
scan(path.join(ROOT, 'apps'))

let hasErrors = false

console.log('\n=== .env Validation ===\n')

for (const dir of appDirs) {
  const rel = path.relative(ROOT, dir)
  const examplePath = path.join(dir, '.env.example')
  const localPath = path.join(dir, '.env.local')
  const prodPath = path.join(dir, '.env.production')

  const exampleKeys = parseEnvKeys(examplePath)
  const localKeys = parseEnvKeys(localPath)
  const prodKeys = parseEnvKeys(prodPath)
  const exampleValues = parseEnvValues(examplePath)

  console.log(`📁 ${rel}`)

  // Check .env.example for real secrets
  if (exampleValues) {
    for (const [key, value] of Object.entries(exampleValues)) {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(value)) {
          console.log(`  ❌ .env.example has REAL SECRET: ${key}`)
          hasErrors = true
        }
      }
    }
  }

  // Check .env.local has all example keys
  if (localKeys) {
    const missing = exampleKeys.filter(k => !localKeys.includes(k))
    if (missing.length > 0) {
      console.log(`  ⚠  .env.local missing: ${missing.join(', ')}`)
      hasErrors = true
    } else {
      console.log(`  ✅ .env.local — all ${exampleKeys.length} vars present`)
    }
  } else {
    console.log(`  ⚠  .env.local — file not found`)
  }

  // Check .env.production has all example keys
  if (prodKeys) {
    const missing = exampleKeys.filter(k => !prodKeys.includes(k))
    if (missing.length > 0) {
      console.log(`  ⚠  .env.production missing: ${missing.join(', ')}`)
      hasErrors = true
    } else {
      console.log(`  ✅ .env.production — all ${exampleKeys.length} vars present`)
    }
  } else {
    console.log(`  ─  .env.production — not found (OK if using Railway env vars)`)
  }

  console.log('')
}

if (hasErrors) {
  console.log('❌ Some .env files have issues. Fix them before deploying.\n')
  process.exit(1)
} else {
  console.log('✅ All .env files are consistent.\n')
}
