#!/usr/bin/env tsx
/**
 * env:push:railway — push merged (root + per-app api) env to Railway service.
 *
 * Usage:
 *   pnpm env:push:railway <app> <env> [--from <sourceEnv>] [--override KEY=val,KEY2=val2] [--dry-run]
 *
 * Examples:
 *   pnpm env:push:railway ezauth staging
 *   pnpm env:push:railway ezpay staging --from local --override DEPLOY_ENV=staging,STRIPE_WEBHOOK_SECRET=whsec_xxx
 *   pnpm env:push:railway ezpay staging --from local --override DEPLOY_ENV=staging --dry-run
 *
 * Reads:
 *   <repo>/.env.<from|env>
 *   apps/<app>/api/.env.<from|env>
 *
 * Flags:
 *   --from <env>        Source env file to read (default: <env>). Use "local" to reuse dev config.
 *   --override KEY=VAL  Comma-separated KEY=VALUE pairs, applied LAST (override everything).
 *   --dry-run           Print merged vars without calling Railway CLI.
 *
 * Resolves templating ({app} in MONGO_URL) and pushes via `railway variables`.
 * Precedence (lowest → highest): root <from> < per-app <from> < --override.
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
  const result = spawnSync('railway', ['--version'], { encoding: 'utf-8' })
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
  dryRun: boolean
}

function parseFlags(flags: string[]): ParsedFlags {
  const result: ParsedFlags = { overrides: {}, dryRun: false }
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
const sourceEnv = flags.from ?? env
if (!['local', 'staging', 'production'].includes(sourceEnv)) {
  fail(`Invalid --from "${sourceEnv}" — must be one of: local | staging | production`)
}

const ROOT = findMonorepoRoot()
const envFile = `.env.${sourceEnv}`
const rootEnvPath = path.join(ROOT, envFile)
const appEnvPath = path.join(ROOT, 'apps', app, 'api', envFile)

console.log(`🚂 env:push:railway — ${app} → ${env}${flags.dryRun ? ' (dry-run)' : ''}`)
if (sourceEnv !== env) console.log(`   source:  .env.${sourceEnv} (via --from)`)
console.log(`   root:    ${rootEnvPath}`)
console.log(`   per-app: ${appEnvPath}`)
if (Object.keys(flags.overrides).length > 0) {
  console.log(`   override: ${Object.keys(flags.overrides).join(', ')}`)
}
console.log('')

if (!existsSync(rootEnvPath)) fail(`Root env file missing: ${rootEnvPath}`)
if (!existsSync(appEnvPath))
  console.log(`⚠️  No per-app env file at ${appEnvPath} — using root only`)

if (!flags.dryRun) checkRailwayCli()

// ── Merge: root first, per-app overrides, then --override flag ──
const merged: Record<string, string> = {}
const rootVars = parseEnvFile(rootEnvPath)
const appVars = parseEnvFile(appEnvPath)

for (const [k, v] of Object.entries(rootVars)) merged[k] = v
for (const [k, v] of Object.entries(appVars)) merged[k] = v
for (const [k, v] of Object.entries(flags.overrides)) merged[k] = v

// Resolve templating ({app})
for (const [k, v] of Object.entries(merged)) {
  if (v.includes('{app}')) merged[k] = resolveTemplating(v, app)
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

const result = spawnSync('railway', args, { stdio: 'inherit' })
if (result.status !== 0) fail(`Railway CLI exited with status ${result.status}`)

console.log(`\n✅ Pushed ${Object.keys(merged).length} vars to Railway service "${app}"`)
