#!/usr/bin/env tsx
/**
 * env:push:railway — push merged (root + per-app api) env to Railway service.
 *
 * Usage:
 *   pnpm env:push:railway <app> <env>
 *
 * Example:
 *   pnpm env:push:railway ezauth staging
 *
 * Reads:
 *   <repo>/.env.<env>
 *   apps/<app>/api/.env.<env>
 *
 * Resolves templating ({app} in MONGO_URL) and pushes via `railway variables`.
 * Per-app values override root for duplicates.
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

// ── Args ────────────────────────────────────────────────────
const [, , app, env] = process.argv
if (!app || !env) {
  fail('Usage: pnpm env:push:railway <app> <env>\n  Example: pnpm env:push:railway ezauth staging')
}
if (!['local', 'staging', 'production'].includes(env)) {
  fail(`Invalid env "${env}" — must be one of: local | staging | production`)
}

const ROOT = findMonorepoRoot()
const envFile = `.env.${env}`
const rootEnvPath = path.join(ROOT, envFile)
const appEnvPath = path.join(ROOT, 'apps', app, 'api', envFile)

console.log(`🚂 env:push:railway — ${app} → ${env}`)
console.log(`   root:    ${rootEnvPath}`)
console.log(`   per-app: ${appEnvPath}\n`)

if (!existsSync(rootEnvPath)) fail(`Root env file missing: ${rootEnvPath}`)
if (!existsSync(appEnvPath))
  console.log(`⚠️  No per-app env file at ${appEnvPath} — using root only`)

checkRailwayCli()

// ── Merge: root first, per-app overrides ────────────────────
const merged: Record<string, string> = {}
const rootVars = parseEnvFile(rootEnvPath)
const appVars = parseEnvFile(appEnvPath)

for (const [k, v] of Object.entries(rootVars)) merged[k] = v
for (const [k, v] of Object.entries(appVars)) merged[k] = v

// Resolve templating ({app})
for (const [k, v] of Object.entries(merged)) {
  if (v.includes('{app}')) merged[k] = resolveTemplating(v, app)
}

// ── Push ────────────────────────────────────────────────────
console.log(`Pushing ${Object.keys(merged).length} vars to Railway service for ${app}...\n`)

// `railway variables --set "KEY=VALUE" --set "KEY2=VALUE2" --service <svc>`
// Use one --set per var to be explicit and avoid shell quoting issues.
const args = ['variables', '--service', app]
for (const [k, v] of Object.entries(merged)) {
  args.push('--set', `${k}=${v}`)
  console.log(`  ${k}=${mask(v)}`)
}

const result = spawnSync('railway', args, { stdio: 'inherit' })
if (result.status !== 0) fail(`Railway CLI exited with status ${result.status}`)

console.log(`\n✅ Pushed ${Object.keys(merged).length} vars to Railway service "${app}"`)
