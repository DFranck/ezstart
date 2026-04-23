#!/usr/bin/env tsx
/**
 * env:push:all — push every app's env to Railway (api) + Vercel (web) in one command.
 *
 * Usage:
 *   pnpm env:push:all <env> [--dry-run] [--only-api] [--only-web]
 *                           [--apps <csv>] [--continue-on-error]
 *
 * Examples:
 *   pnpm env:push:all staging --dry-run
 *   pnpm env:push:all production --apps ezauth,ezpay
 *   pnpm env:push:all staging --only-web
 *   pnpm env:push:all production --continue-on-error
 *
 * Loops over the 8 monorepo apps and, for each one, calls:
 *   - `env:push:railway <app> <env>`  if `apps/<app>/api/package.json` exists
 *   - `env:push:vercel <app> <env>`   if `apps/<app>/web/package.json` exists
 *
 * Behavior:
 *   - Fail-fast by default (stop at first failure). Use `--continue-on-error`
 *     to push every app regardless and report failures at the end.
 *   - `--dry-run` is forwarded to each child CLI (no actual Railway/Vercel call).
 *   - `--only-api` / `--only-web` skip the other side entirely.
 *   - `--apps ezauth,ezpay` restricts the loop to an explicit subset
 *     (comma-separated, no spaces).
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

type TargetEnv = 'local' | 'staging' | 'production'
type Platform = 'railway' | 'vercel'

const ALL_APPS = [
  'ezauth',
  'ezpay',
  'ezstart',
  'ezbill',
  'green-pulse',
  'fengshui',
  'asc-tcd',
  'gacha-analyzer',
] as const

interface ParsedArgs {
  env: TargetEnv
  dryRun: boolean
  onlyApi: boolean
  onlyWeb: boolean
  apps: readonly string[]
  continueOnError: boolean
}

interface StepResult {
  app: string
  platform: Platform
  status: 'pushed' | 'skipped' | 'failed'
  exitCode: number
  reason?: string
}

function findMonorepoRoot(start: string = process.cwd()): string {
  let dir = path.resolve(start)
  const { root } = path.parse(dir)
  while (true) {
    try {
      if (readdirSync(dir).includes('pnpm-workspace.yaml')) return dir
    } catch {
      // ignore — keep walking up
    }
    if (dir === root) return start
    dir = path.dirname(dir)
  }
}

function fail(msg: string): never {
  console.error(`❌ ${msg}`)
  process.exit(1)
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const [env, ...rest] = argv

  if (!env) {
    fail(
      'Usage: pnpm env:push:all <env> [--dry-run] [--only-api] [--only-web] [--apps <csv>] [--continue-on-error]\n' +
        '  Example: pnpm env:push:all staging --dry-run\n' +
        '  Example: pnpm env:push:all production --apps ezauth,ezpay'
    )
  }
  if (!['local', 'staging', 'production'].includes(env)) {
    fail(`Invalid env "${env}" — must be one of: local | staging | production`)
  }

  let dryRun = false
  let onlyApi = false
  let onlyWeb = false
  let continueOnError = false
  let apps: readonly string[] = ALL_APPS

  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i]
    if (flag === '--dry-run') {
      dryRun = true
    } else if (flag === '--only-api') {
      onlyApi = true
    } else if (flag === '--only-web') {
      onlyWeb = true
    } else if (flag === '--continue-on-error') {
      continueOnError = true
    } else if (flag === '--apps') {
      const value = rest[++i]
      if (!value) fail('--apps requires a comma-separated list (e.g. --apps ezauth,ezpay)')
      const requested = value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      if (requested.length === 0) fail('--apps list is empty')
      const unknown = requested.filter(a => !ALL_APPS.includes(a as (typeof ALL_APPS)[number]))
      if (unknown.length > 0) {
        fail(`Unknown app(s): ${unknown.join(', ')}\n` + `  Valid apps: ${ALL_APPS.join(', ')}`)
      }
      apps = requested
    } else {
      fail(`Unknown flag "${flag}"`)
    }
  }

  if (onlyApi && onlyWeb) {
    fail('--only-api and --only-web are mutually exclusive')
  }

  return {
    env: env as TargetEnv,
    dryRun,
    onlyApi,
    onlyWeb,
    apps,
    continueOnError,
  }
}

function hasPackage(root: string, app: string, layer: 'api' | 'web'): boolean {
  return existsSync(path.join(root, 'apps', app, layer, 'package.json'))
}

function runPush(
  root: string,
  platform: Platform,
  app: string,
  env: TargetEnv,
  dryRun: boolean
): StepResult {
  const script = platform === 'railway' ? 'env:push:railway' : 'env:push:vercel'
  const args = ['run', script, app, env]
  if (dryRun) args.push('--dry-run')

  const prefix = platform === 'railway' ? '🚂' : '▲'
  console.info(`\n${prefix} [${platform}] ${app} → ${env}${dryRun ? ' (dry-run)' : ''}`)
  console.info(`   $ pnpm ${args.join(' ')}`)

  // `shell: true` for Windows compat (pnpm is a .cmd shim).
  const result = spawnSync('pnpm', args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })

  const exitCode = result.status ?? 1
  return {
    app,
    platform,
    status: exitCode === 0 ? 'pushed' : 'failed',
    exitCode,
  }
}

// ── CLI entry ───────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2))
const ROOT = findMonorepoRoot()

console.info(
  `📦 env:push:all — ${args.apps.length} app${args.apps.length === 1 ? '' : 's'} → ${args.env}` +
    `${args.dryRun ? ' (dry-run)' : ''}` +
    `${args.onlyApi ? ' [api only]' : ''}` +
    `${args.onlyWeb ? ' [web only]' : ''}` +
    `${args.continueOnError ? ' [continue-on-error]' : ''}`
)
console.info(`   apps: ${args.apps.join(', ')}`)

const results: StepResult[] = []
let firstFailure: StepResult | null = null

outer: for (const app of args.apps) {
  // API push
  if (!args.onlyWeb) {
    if (hasPackage(ROOT, app, 'api')) {
      const result = runPush(ROOT, 'railway', app, args.env, args.dryRun)
      results.push(result)
      if (result.status === 'failed') {
        if (!firstFailure) firstFailure = result
        if (!args.continueOnError) break outer
      }
    } else {
      results.push({
        app,
        platform: 'railway',
        status: 'skipped',
        exitCode: 0,
        reason: 'no apps/<app>/api/package.json',
      })
      console.info(`\n🚂 [railway] ${app} — skipped (no api/ package)`)
    }
  }

  // Web push
  if (!args.onlyApi) {
    if (hasPackage(ROOT, app, 'web')) {
      const result = runPush(ROOT, 'vercel', app, args.env, args.dryRun)
      results.push(result)
      if (result.status === 'failed') {
        if (!firstFailure) firstFailure = result
        if (!args.continueOnError) break outer
      }
    } else {
      results.push({
        app,
        platform: 'vercel',
        status: 'skipped',
        exitCode: 0,
        reason: 'no apps/<app>/web/package.json',
      })
      console.info(`\n▲ [vercel] ${app} — skipped (no web/ package)`)
    }
  }
}

// ── Summary ────────────────────────────────────────────────

const pushed = results.filter(r => r.status === 'pushed')
const skipped = results.filter(r => r.status === 'skipped')
const failed = results.filter(r => r.status === 'failed')

console.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.info(
  `📊 Summary: ${pushed.length} pushed · ${skipped.length} skipped · ${failed.length} failed`
)
for (const r of results) {
  const icon = r.status === 'pushed' ? '✅' : r.status === 'skipped' ? '·' : '❌'
  const detail = r.reason ? ` (${r.reason})` : ''
  console.info(`   ${icon} [${r.platform}] ${r.app}: ${r.status}${detail}`)
}

if (failed.length > 0) {
  console.error(
    `\n❌ ${failed.length} push${failed.length === 1 ? '' : 'es'} failed.` +
      (args.continueOnError ? ' (--continue-on-error)' : ' (fail-fast)')
  )
  process.exit(firstFailure?.exitCode ?? 1)
}

if (args.dryRun) {
  console.info(
    `\n✅ Dry-run complete — ${pushed.length} push${pushed.length === 1 ? '' : 'es'} would run.`
  )
} else {
  console.info(`\n✅ All ${pushed.length} push${pushed.length === 1 ? '' : 'es'} succeeded.`)
}
