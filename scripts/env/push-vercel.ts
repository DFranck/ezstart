#!/usr/bin/env tsx
/**
 * env:push:vercel — push merged (root + per-app web) env to Vercel project.
 *
 * Usage:
 *   pnpm env:push:vercel <app> <env>
 *
 * Example:
 *   pnpm env:push:vercel ezpay production
 *
 * Reads:
 *   <repo>/.env.<env>
 *   apps/<app>/web/.env.<env>
 *
 * Per-app values override root for duplicates. Pushes via `vercel env add`.
 *
 * Requires: Vercel CLI installed (https://vercel.com/docs/cli).
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

function checkVercelCli(): void {
  const result = spawnSync('vercel', ['--version'], { encoding: 'utf-8' })
  if (result.status !== 0) {
    fail('Vercel CLI not found. Install via:\n  npm i -g vercel')
  }
}

function parseEnvFile(absPath: string): Record<string, string> {
  if (!existsSync(absPath)) return {}
  return dotenv.parse(readFileSync(absPath))
}

function mask(value: string | undefined): string {
  if (!value) return '(empty)'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

function vercelEnvName(env: string): 'development' | 'preview' | 'production' {
  if (env === 'staging') return 'preview'
  if (env === 'local') return 'development'
  return 'production'
}

// ── Args ────────────────────────────────────────────────────
const [, , app, env] = process.argv
if (!app || !env) {
  fail('Usage: pnpm env:push:vercel <app> <env>\n  Example: pnpm env:push:vercel ezpay production')
}
if (!['local', 'staging', 'production'].includes(env)) {
  fail(`Invalid env "${env}" — must be one of: local | staging | production`)
}

const ROOT = findMonorepoRoot()
const envFile = `.env.${env}`
const rootEnvPath = path.join(ROOT, envFile)
const appEnvPath = path.join(ROOT, 'apps', app, 'web', envFile)

console.log(`▲ env:push:vercel — ${app}/web → ${env} (Vercel ${vercelEnvName(env)})`)
console.log(`   root:    ${rootEnvPath}`)
console.log(`   per-app: ${appEnvPath}\n`)

if (!existsSync(rootEnvPath)) fail(`Root env file missing: ${rootEnvPath}`)
if (!existsSync(appEnvPath))
  console.log(`⚠️  No per-app env file at ${appEnvPath} — using root only`)

checkVercelCli()

// ── Merge ───────────────────────────────────────────────────
const merged: Record<string, string> = {}
const rootVars = parseEnvFile(rootEnvPath)
const appVars = parseEnvFile(appEnvPath)
for (const [k, v] of Object.entries(rootVars)) merged[k] = v
for (const [k, v] of Object.entries(appVars)) merged[k] = v

// ── Push (cwd in the web app dir so Vercel picks the right project) ────
const webDir = path.join(ROOT, 'apps', app, 'web')
const targetEnv = vercelEnvName(env)

console.log(`Pushing ${Object.keys(merged).length} vars to Vercel project (cwd=${webDir})...\n`)

let pushed = 0
let failed = 0
for (const [k, v] of Object.entries(merged)) {
  console.log(`  ${k}=${mask(v)}`)
  // First remove (idempotent — ignore failure), then add.
  spawnSync('vercel', ['env', 'rm', k, targetEnv, '--yes'], { cwd: webDir, stdio: 'ignore' })
  const result = spawnSync('vercel', ['env', 'add', k, targetEnv], {
    cwd: webDir,
    input: v,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  if (result.status === 0) pushed++
  else {
    failed++
    console.error(`     ↳ failed (status ${result.status})`)
  }
}

console.log(
  `\n${failed === 0 ? '✅' : '⚠️ '} Pushed ${pushed}/${Object.keys(merged).length} vars to Vercel project "${app}"`
)
if (failed > 0) process.exit(1)
