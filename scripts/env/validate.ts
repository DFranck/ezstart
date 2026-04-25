#!/usr/bin/env tsx
/**
 * env:validate — verify the hybrid root + per-app env layout.
 *
 * Checks:
 *   1. Required SHARED vars exist in root .env.{env} (JWT_SECRET, MONGO_URL, DEPLOY_ENV)
 *   2. For each shared var, if a per-app .env.{env} also defines it, verify
 *      the value MATCHES root (drift detection)
 *   3. For each app, every key declared in `.env.example` is present in `.env.local`
 *
 * Exit code:
 *   - 0 on success
 *   - 1 on any drift / missing var
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import * as dotenv from 'dotenv'

// ── Paths ───────────────────────────────────────────────────
function findMonorepoRoot(start: string = process.cwd()): string {
  let dir = path.resolve(start)
  const { root } = path.parse(dir)
  while (true) {
    try {
      if (readdirSync(dir).includes('pnpm-workspace.yaml')) return dir
    } catch {
      // ignore
    }
    if (dir === root) return start
    dir = path.dirname(dir)
  }
}

const ROOT = findMonorepoRoot()
const APPS_DIR = path.join(ROOT, 'apps')

// ── Args ────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const envFlag =
  argv.find(a => a.startsWith('--env='))?.split('=')[1] ?? process.env.DEPLOY_ENV ?? 'local'
const envFile = `.env.${envFlag}`

// ── Shared vars (must be identical across every layer that defines them) ──
const SHARED_VARS = ['JWT_SECRET', 'MONGO_URL', 'DEPLOY_ENV']

// ── Required at root ────────────────────────────────────────
const REQUIRED_AT_ROOT = ['JWT_SECRET', 'MONGO_URL']

// ── Helpers ─────────────────────────────────────────────────
function mask(value: string | undefined): string {
  if (!value) return '(empty)'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

function parseEnvFile(absPath: string): Record<string, string> {
  if (!existsSync(absPath)) return {}
  return dotenv.parse(readFileSync(absPath))
}

function listAppLayers(): Array<{ app: string; layer: 'api' | 'web'; dir: string }> {
  const result: Array<{ app: string; layer: 'api' | 'web'; dir: string }> = []
  if (!existsSync(APPS_DIR)) return result
  for (const app of readdirSync(APPS_DIR)) {
    const appDir = path.join(APPS_DIR, app)
    try {
      if (!statSync(appDir).isDirectory()) continue
    } catch {
      continue
    }
    for (const layer of ['api', 'web'] as const) {
      const layerDir = path.join(appDir, layer)
      if (existsSync(layerDir)) result.push({ app, layer, dir: layerDir })
    }
  }
  return result
}

// ── Run validation ──────────────────────────────────────────
type Issue = { kind: 'missing' | 'drift' | 'missing-from-local'; message: string }
const issues: Issue[] = []

console.log(`🔍 env:validate — checking ${envFile} (root + per-app)\n`)

// 1. Root file
const rootEnvPath = path.join(ROOT, envFile)
const rootVars = parseEnvFile(rootEnvPath)
if (!Object.keys(rootVars).length) {
  console.log(`⚠️  Root ${envFile} not found at ${rootEnvPath}`)
} else {
  console.log(`✓ Root ${envFile}: ${Object.keys(rootVars).length} vars`)
}

for (const v of REQUIRED_AT_ROOT) {
  if (!rootVars[v]) {
    issues.push({
      kind: 'missing',
      message: `Required SHARED var ${v} missing from root ${envFile}`,
    })
  }
}

// 2. Per-app layers
const layers = listAppLayers()
console.log(`\nScanning ${layers.length} app layers:`)
for (const { app, layer, dir } of layers) {
  const localPath = path.join(dir, envFile)
  const examplePath = path.join(dir, '.env.example')
  const localVars = parseEnvFile(localPath)
  const exampleVars = parseEnvFile(examplePath)

  const localCount = Object.keys(localVars).length
  const exampleCount = Object.keys(exampleVars).length
  console.log(`  - ${app}/${layer}: ${envFile}=${localCount}, .env.example=${exampleCount}`)

  // 2a. Drift: shared vars defined in per-app must match root
  for (const v of SHARED_VARS) {
    if (localVars[v] !== undefined && rootVars[v] !== undefined && localVars[v] !== rootVars[v]) {
      issues.push({
        kind: 'drift',
        message: `${app}/${layer} has ${v}=${mask(localVars[v])} but root has ${mask(rootVars[v])}`,
      })
    }
  }

  // 2b. Per-app .env.example keys present in .env.local
  // Skip shared vars (come from root) and vars with a non-empty default value
  // in .env.example (treated as optional with a working default).
  for (const [key, exampleValue] of Object.entries(exampleVars)) {
    if (SHARED_VARS.includes(key)) continue
    // If example has a non-empty default value, treat as OPTIONAL.
    if (exampleValue && exampleValue.trim() !== '') continue
    if (localVars[key] === undefined && rootVars[key] === undefined) {
      issues.push({
        kind: 'missing-from-local',
        message: `${app}/${layer} .env.example requires ${key} (empty placeholder) but .env.local has no value`,
      })
    }
  }
}

// ── Report ──────────────────────────────────────────────────
console.log('')
if (issues.length === 0) {
  console.log('✅ All checks passed — no drift, no missing required vars.')
  process.exit(0)
}

console.log(`❌ ${issues.length} issue(s) found:\n`)
for (const i of issues) {
  const icon = i.kind === 'drift' ? '⚠️' : '✗'
  console.log(`  ${icon} [${i.kind}] ${i.message}`)
}
console.log('')
process.exit(1)
