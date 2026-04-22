#!/usr/bin/env tsx
/**
 * env:push:railway — push merged (root + per-app api) env to Railway service.
 *
 * Usage:
 *   pnpm env:push:railway <app> <env> [--from <sourceEnv>] [--override KEY=val,KEY2=val2] [--dry-run]
 *
 * Examples:
 *   pnpm env:push:railway ezauth staging
 *   pnpm env:push:railway ezpay production
 *   pnpm env:push:railway ezpay staging --override STRIPE_WEBHOOK_SECRET=whsec_xxx --dry-run
 *
 * Cascade (Next.js-style) — target env determines merge order:
 *   local       → .env.local
 *   staging     → .env.local  ←  .env.staging
 *   production  → .env.local  ←  .env.staging  ←  .env.production
 *
 * Each layer reads both root and per-app file. Later layers override earlier ones.
 * Use --from <env> to force a single source (disables cascade).
 *
 * Production blocklist: TEST_*, DEBUG_*, _LOCAL_*, DEV_* are filtered out.
 * Override with --include-blocked KEY1,KEY2.
 *
 * Flags:
 *   --from <env>             Skip cascade, read only .env.<from>.
 *   --override KEY=VAL       Comma-separated KEY=VAL, applied LAST.
 *   --include-blocked KEYS   Comma-separated keys to keep in production despite blocklist.
 *   --dry-run                Print merged vars without pushing.
 *
 * Precedence (lowest → highest): cascade layers < --override.
 *
 * Requires: Railway CLI installed (https://docs.railway.app/develop/cli).
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import * as dotenv from 'dotenv'

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

function fail(msg: string): never {
  console.error(`❌ ${msg}`)
  process.exit(1)
}

function checkRailwayCli(): void {
  // On Windows, npm/pnpm global bins are .cmd shims — spawnSync without
  // `shell: true` can't find them on PATH.
  const result = spawnSync('railway', ['--version'], { encoding: 'utf-8', shell: true })
  if (result.status !== 0) {
    fail('Railway CLI not found. Install via:\n  npm i -g @railway/cli\n  OR  brew install railway')
  }
}

function parseEnvFile(absPath: string): Record<string, string> {
  if (!existsSync(absPath)) return {}
  return dotenv.parse(readFileSync(absPath))
}

function resolveTemplating(value: string, app: string): string {
  return value.replace(/\{app\}/g, app)
}

function mask(value: string | undefined): string {
  if (!value) return '(empty)'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

interface ParsedFlags {
  from?: string
  overrides: Record<string, string>
  includeBlocked: Set<string>
  dryRun: boolean
}

const PRODUCTION_BLOCKLIST = [/^TEST_/, /^DEBUG_/, /^_LOCAL_/, /^DEV_/]

function isBlockedInProduction(key: string): boolean {
  return PRODUCTION_BLOCKLIST.some(re => re.test(key))
}

function cascadeOrder(env: string): string[] {
  if (env === 'production') return ['local', 'staging', 'production']
  if (env === 'staging') return ['local', 'staging']
  return ['local']
}

function parseFlags(flags: string[]): ParsedFlags {
  const result: ParsedFlags = { overrides: {}, includeBlocked: new Set(), dryRun: false }
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i]
    if (flag === '--from') {
      const value = flags[++i]
      if (!value) fail('--from requires a value (e.g. --from local)')
      result.from = value
    } else if (flag === '--override') {
      const value = flags[++i]
      if (!value) fail('--override requires a value (e.g. --override KEY=VAL,KEY2=VAL2)')
      for (const pair of value.split(',')) {
        const trimmed = pair.trim()
        if (!trimmed) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) fail(`Invalid --override entry "${trimmed}" — expected KEY=VALUE`)
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1)
        if (!key) fail(`Invalid --override entry "${trimmed}" — empty key`)
        result.overrides[key] = val
      }
    } else if (flag === '--include-blocked') {
      const value = flags[++i]
      if (!value) fail('--include-blocked requires a value (e.g. --include-blocked TEST_USER)')
      for (const key of value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)) {
        result.includeBlocked.add(key)
      }
    } else if (flag === '--dry-run') {
      result.dryRun = true
    } else {
      fail(`Unknown flag "${flag}"`)
    }
  }
  return result
}

// ── Args ────────────────────────────────────────────────────
const [, , app, env, ...rest] = process.argv
if (!app || !env) {
  fail(
    'Usage: pnpm env:push:railway <app> <env> [--from <sourceEnv>] [--override KEY=val,KEY2=val2] [--dry-run]\n' +
      '  Example: pnpm env:push:railway ezauth staging\n' +
      '  Example: pnpm env:push:railway ezpay staging --from local --override DEPLOY_ENV=staging'
  )
}
if (!['local', 'staging', 'production'].includes(env)) {
  fail(`Invalid env "${env}" — must be one of: local | staging | production`)
}

const flags = parseFlags(rest)

const ROOT = findMonorepoRoot()
const layers = flags.from ? [flags.from] : cascadeOrder(env)
for (const layer of layers) {
  if (!['local', 'staging', 'production'].includes(layer)) {
    fail(`Invalid env layer "${layer}" — must be one of: local | staging | production`)
  }
}

console.log(`🚂 env:push:railway — ${app} → ${env}${flags.dryRun ? ' (dry-run)' : ''}`)
if (flags.from) {
  console.log(`   source:  .env.${flags.from} (via --from, cascade disabled)`)
} else {
  console.log(`   cascade: ${layers.map(l => `.env.${l}`).join(' ← ')}`)
}
if (Object.keys(flags.overrides).length > 0) {
  console.log(`   override: ${Object.keys(flags.overrides).join(', ')}`)
}
console.log('')

if (!flags.dryRun) checkRailwayCli()

// ── Merge cascade: each layer adds root + per-app, later layers override ──
const merged: Record<string, string> = {}
for (const layer of layers) {
  const envFile = `.env.${layer}`
  const rootEnvPath = path.join(ROOT, envFile)
  const appEnvPath = path.join(ROOT, 'apps', app, 'api', envFile)
  const rootVars = parseEnvFile(rootEnvPath)
  const appVars = parseEnvFile(appEnvPath)
  const rootCount = Object.keys(rootVars).length
  const appCount = Object.keys(appVars).length
  if (rootCount === 0 && appCount === 0) {
    console.log(`   (layer ${layer}: no vars — skipped)`)
    continue
  }
  console.log(`   layer ${layer}: +${rootCount} root, +${appCount} per-app`)
  for (const [k, v] of Object.entries(rootVars)) merged[k] = v
  for (const [k, v] of Object.entries(appVars)) merged[k] = v
}
for (const [k, v] of Object.entries(flags.overrides)) merged[k] = v

// Production blocklist — filter TEST_*, DEBUG_*, _LOCAL_*, DEV_* unless --include-blocked.
if (env === 'production') {
  const blocked: string[] = []
  for (const key of Object.keys(merged)) {
    if (isBlockedInProduction(key) && !flags.includeBlocked.has(key)) {
      delete merged[key]
      blocked.push(key)
    }
  }
  if (blocked.length > 0) {
    console.log(
      `\n⚠️  Skipped ${blocked.length} vars (production blocklist): ${blocked.join(', ')}\n` +
        `   Override with: --include-blocked ${blocked.join(',')}`
    )
  }
}

// Resolve templating ({app})
for (const [k, v] of Object.entries(merged)) {
  if (v.includes('{app}')) merged[k] = resolveTemplating(v, app)
}

if (Object.keys(merged).length === 0) {
  fail('No vars to push — check that .env.<layer> files exist at root and/or apps/<app>/api/')
}

// ── Push ────────────────────────────────────────────────────
const action = flags.dryRun ? 'Would push' : 'Pushing'
console.log(`${action} ${Object.keys(merged).length} vars to Railway service for ${app}...\n`)

// `railway variables --set "KEY=VALUE" --set "KEY2=VALUE2" --service <svc>`
// Use one --set per var to be explicit and avoid shell quoting issues.
const args = ['variables', '--service', app]
for (const [k, v] of Object.entries(merged)) {
  args.push('--set', `${k}=${v}`)
  const marker = flags.overrides[k] !== undefined ? ' [override]' : ''
  console.log(`  ${k}=${mask(v)}${marker}`)
}

if (flags.dryRun) {
  console.log(
    `\n✅ Dry-run complete — ${Object.keys(merged).length} vars would be pushed to "${app}"`
  )
  process.exit(0)
}

const result = spawnSync('railway', args, { stdio: 'inherit', shell: true })
if (result.status !== 0) fail(`Railway CLI exited with status ${result.status}`)

console.log(`\n✅ Pushed ${Object.keys(merged).length} vars to Railway service "${app}"`)
