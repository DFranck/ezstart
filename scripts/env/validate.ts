#!/usr/bin/env tsx
/**
 * env:validate — verify the per-app env layout (PER-APP ONLY, no root layer).
 *
 * Cascade (per-app, lowest → highest precedence):
 *   local       → apps/<app>/<layer>/.env.local
 *   staging     → apps/<app>/<layer>/.env.local  ←  apps/<app>/<layer>/.env.staging
 *   production  → apps/<app>/<layer>/.env.local  ←  apps/<app>/<layer>/.env.staging  ←  apps/<app>/<layer>/.env.production
 *
 * Checks:
 *   1. For each app/layer, every key declared in `.env.example` with an EMPTY value
 *      (a placeholder requiring the user to set it) is present in the merged cascade
 *      for the target env.
 *   2. No `<TO_SET|<TO_GENERATE|<REPLACE_ME` literal values present in the merged
 *      cascade (these would be pushed as-is, polluting cloud env).
 *
 * Exit code:
 *   - 0 on success
 *   - 1 on any missing required var or remaining placeholder literal
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
type TargetEnv = 'local' | 'staging' | 'production'

const argv = process.argv.slice(2)
const envFlag =
  (argv.find(a => a.startsWith('--env='))?.split('=')[1] as TargetEnv | undefined) ??
  (process.env.DEPLOY_ENV as TargetEnv | undefined) ??
  'local'

if (!['local', 'staging', 'production'].includes(envFlag)) {
  console.error(`❌ Invalid --env="${envFlag}" — must be one of: local | staging | production`)
  process.exit(1)
}

// ── Cascade ─────────────────────────────────────────────────
function cascadeLayers(env: TargetEnv): TargetEnv[] {
  if (env === 'local') return ['local']
  if (env === 'staging') return ['local', 'staging']
  return ['local', 'staging', 'production']
}

// ── Placeholder detection ───────────────────────────────────
const PLACEHOLDER_RE =
  /<TO_(SET|GENERATE|FILL)|<REPLACE_ME|<USER>|<PASSWORD>|<CLUSTER>|<GENERATE_SECURE/i

function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_RE.test(value)
}

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

function loadMergedCascade(
  layerDir: string,
  targetEnv: TargetEnv
): { merged: Record<string, string>; sources: Array<{ level: TargetEnv; exists: boolean }> } {
  const merged: Record<string, string> = {}
  const sources: Array<{ level: TargetEnv; exists: boolean }> = []
  for (const level of cascadeLayers(targetEnv)) {
    const file = path.join(layerDir, `.env.${level}`)
    const parsed = parseEnvFile(file)
    sources.push({ level, exists: Object.keys(parsed).length > 0 })
    for (const [k, v] of Object.entries(parsed)) merged[k] = v
  }
  return { merged, sources }
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
type Issue = { kind: 'missing' | 'placeholder'; message: string }
const issues: Issue[] = []

console.log(`🔍 env:validate — checking per-app cascade for ${envFlag}\n`)

const layers = listAppLayers()
console.log(`Scanning ${layers.length} app layers:`)
for (const { app, layer, dir } of layers) {
  const examplePath = path.join(dir, '.env.example')
  const exampleVars = parseEnvFile(examplePath)
  const { merged, sources } = loadMergedCascade(dir, envFlag)

  const cascadeSummary = sources.map(s => `${s.exists ? '✓' : '·'}${s.level}`).join('+')
  console.log(
    `  - ${app}/${layer}: cascade [${cascadeSummary}] = ${Object.keys(merged).length} vars, .env.example=${Object.keys(exampleVars).length}`
  )

  // Check 1: example empty placeholders MUST be present in merged cascade
  for (const [key, exampleValue] of Object.entries(exampleVars)) {
    if (exampleValue && exampleValue.trim() !== '') continue // optional with default
    if (merged[key] === undefined || merged[key] === '') {
      issues.push({
        kind: 'missing',
        message: `${app}/${layer} cascade missing required var ${key} (declared empty in .env.example)`,
      })
    }
  }

  // Check 2: no remaining <TO_SET|<TO_GENERATE> literals in merged cascade
  for (const [key, value] of Object.entries(merged)) {
    if (isPlaceholderValue(value)) {
      issues.push({
        kind: 'placeholder',
        message: `${app}/${layer} cascade has unresolved placeholder ${key}=${mask(value)}`,
      })
    }
  }
}

// ── Report ──────────────────────────────────────────────────
console.log('')
if (issues.length === 0) {
  console.log('✅ All checks passed — no missing required vars, no unresolved placeholders.')
  process.exit(0)
}

console.log(`❌ ${issues.length} issue(s) found:\n`)
for (const i of issues) {
  const icon = i.kind === 'placeholder' ? '⚠️' : '✗'
  console.log(`  ${icon} [${i.kind}] ${i.message}`)
}
console.log('')
process.exit(1)
