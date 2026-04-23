#!/usr/bin/env tsx
/**
 * env:push:railway — push merged per-app env to Railway service.
 *
 * Usage:
 *   pnpm env:push:railway <app> <env> [--from <sourceEnv>] [--override KEY=val,KEY2=val2] [--dry-run]
 *
 * Examples:
 *   pnpm env:push:railway ezauth staging
 *   pnpm env:push:railway ezpay production
 *   pnpm env:push:railway ezpay staging --override STRIPE_WEBHOOK_SECRET=whsec_xxx --dry-run
 *
 * Cascade (PER-APP ONLY — no root layer, lowest → highest precedence):
 *   local       → apps/<app>/api/.env.local
 *   staging     → apps/<app>/api/.env.local  ←  apps/<app>/api/.env.staging
 *   production  → apps/<app>/api/.env.local  ←  apps/<app>/api/.env.staging  ←  apps/<app>/api/.env.production
 *
 * Later layers override earlier ones. The production cascade includes `.env.staging`
 * so deployed (non-dev) defaults — cluster URLs, cookie domains, `NODE_ENV=production`
 * — cascade once and `.env.production` only holds the values that DIFFER from staging
 * (prod MongoDB cluster, `sk_live_*` Stripe keys, prod webhook secrets, etc.).
 *
 * Missing layers are silently skipped. Use `--from <env>` to bypass the cascade and
 * force a single source file.
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

type TargetEnv = 'local' | 'staging' | 'production'

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

function parseEnvFile(absPath: string): Record<string, string> | null {
  if (!existsSync(absPath)) return null
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
  from?: TargetEnv
  overrides: Record<string, string>
  includeBlocked: Set<string>
  dryRun: boolean
}

const PRODUCTION_BLOCKLIST = [/^TEST_/, /^DEBUG_/, /^_LOCAL_/, /^DEV_/]

function isBlockedInProduction(key: string): boolean {
  return PRODUCTION_BLOCKLIST.some(re => re.test(key))
}

/**
 * Return the cascade of env layers for a target env, from lowest to highest precedence.
 * local      → ['local']
 * staging    → ['local', 'staging']
 * production → ['local', 'staging', 'production']
 *
 * The production cascade includes staging so non-dev defaults (cluster URL,
 * NODE_ENV=production, cookie domains) flow through once and `.env.production`
 * only holds values that DIFFER from staging (prod DB cluster, live Stripe
 * secrets, prod webhook secrets).
 */
export function cascadeLayers(env: TargetEnv): TargetEnv[] {
  if (env === 'local') return ['local']
  if (env === 'staging') return ['local', 'staging']
  return ['local', 'staging', 'production']
}

export interface LoadMergedEnvInput {
  /** Absolute path to the monorepo root. */
  root: string
  /** App slug (e.g. 'ezauth'). */
  app: string
  /** Target environment. Drives the cascade. */
  targetEnv: TargetEnv
  /**
   * If provided, bypass the cascade and load a SINGLE env file level.
   * Typical use: `--from local` to push local values verbatim to staging.
   */
  fromOverride?: TargetEnv
  /** --override KEY=VALUE pairs applied LAST. */
  overrides?: Record<string, string>
  /**
   * Function that reads an env file and returns its keys, or `null` if the
   * file does not exist. Defaults to the real filesystem reader. Swappable
   * for tests (to avoid touching disk).
   */
  readEnv?: (absPath: string) => Record<string, string> | null
}

export interface LoadMergedEnvResult {
  merged: Record<string, string>
  sources: Array<{ level: TargetEnv; path: string; exists: boolean }>
}

/**
 * Merge per-app env files following the cascade.
 *
 * Precedence (lowest → highest):
 *   app .env.local < app .env.<env> < overrides
 *
 * When `fromOverride` is set, ONLY that layer is loaded, cascade is bypassed.
 */
export function loadMergedEnv(input: LoadMergedEnvInput): LoadMergedEnvResult {
  const { root, app, targetEnv, fromOverride, overrides = {}, readEnv = parseEnvFile } = input

  const layers: TargetEnv[] = fromOverride ? [fromOverride] : cascadeLayers(targetEnv)

  const merged: Record<string, string> = {}
  const sources: LoadMergedEnvResult['sources'] = []

  for (const level of layers) {
    const file = `.env.${level}`
    const absPath = path.join(root, 'apps', app, 'api', file)
    const parsed = readEnv(absPath)
    sources.push({ level, path: absPath, exists: parsed !== null })
    if (!parsed) continue
    for (const [k, v] of Object.entries(parsed)) merged[k] = v
  }

  // --override flag (highest precedence, applied last)
  for (const [k, v] of Object.entries(overrides)) merged[k] = v

  return { merged, sources }
}

export function parseFlags(flags: string[]): ParsedFlags {
  const result: ParsedFlags = { overrides: {}, includeBlocked: new Set(), dryRun: false }
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i]
    if (flag === '--from') {
      const value = flags[++i]
      if (!value) fail('--from requires a value (e.g. --from local)')
      if (!['local', 'staging', 'production'].includes(value)) {
        fail(`Invalid --from "${value}" — must be one of: local | staging | production`)
      }
      result.from = value as TargetEnv
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

// ── CLI entry ───────────────────────────────────────────────
// Only execute the CLI body when run directly (not when imported by tests).
const isDirectRun = (() => {
  try {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : ''
    const self = path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
    return entry === self
  } catch {
    return true
  }
})()

if (isDirectRun) {
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
  const targetEnv = env as TargetEnv

  const { merged, sources } = loadMergedEnv({
    root: ROOT,
    app,
    targetEnv,
    fromOverride: flags.from,
    overrides: flags.overrides,
  })

  console.info(`🚂 env:push:railway — ${app} → ${env}${flags.dryRun ? ' (dry-run)' : ''}`)
  if (flags.from) {
    console.info(`   source:  SINGLE layer .env.${flags.from} (via --from, cascade bypassed)`)
  } else {
    const levels = cascadeLayers(targetEnv).join(' → ')
    console.info(`   cascade: ${levels}`)
  }
  for (const s of sources) {
    const status = s.exists ? '✓' : '·'
    console.info(`   ${status} [${s.level}] ${s.path}`)
  }
  if (Object.keys(flags.overrides).length > 0) {
    console.info(`   override: ${Object.keys(flags.overrides).join(', ')}`)
  }
  console.info('')

  // At least one layer must exist
  const anyExists = sources.some(s => s.exists)
  if (!anyExists) {
    fail(
      `No env files found for ${app} targeting ${env}. Checked:\n  ${sources.map(s => s.path).join('\n  ')}`
    )
  }

  if (!flags.dryRun) checkRailwayCli()

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
      console.info(
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
    fail(`No vars to push — check that apps/${app}/api/.env.<layer> files have content`)
  }

  // ── Push ────────────────────────────────────────────────────
  // Railway service names = `<app>-api` convention (ezauth-api, ezpay-api, etc.)
  const service = `${app}-api`
  const action = flags.dryRun ? 'Would push' : 'Pushing'
  console.info(`${action} ${Object.keys(merged).length} vars to Railway service "${service}"...\n`)

  // Log (with masking) what we will push before any actual CLI call.
  for (const [k, v] of Object.entries(merged)) {
    const marker = flags.overrides[k] !== undefined ? ' [override]' : ''
    console.info(`  ${k}=${mask(v)}${marker}`)
  }

  if (flags.dryRun) {
    console.info(
      `\n✅ Dry-run complete — ${Object.keys(merged).length} vars would be pushed to "${service}"`
    )
    process.exit(0)
  }

  // Use `railway variable set KEY --stdin` to pass the value via stdin instead
  // of via argv. Rationale:
  //   - values with `&`, `|`, `<`, `>`, spaces, quotes (eg. mongodb URLs) break
  //     the command line when joined via shell or passed to .cmd shims
  //   - stdin is a binary-safe channel — zero shell interpretation
  //   - `shell: true` is required to execute `railway.cmd` on Windows, but
  //     since the value never touches argv we don't care about cmd parsing
  //   - `--skip-deploys` on all but the last call avoids N redeploys; the
  //     final call omits it so Railway redeploys once with the full new env
  //   - Empty values are skipped: Railway rejects them via stdin. Empty env
  //     vars in source files represent "intentionally absent" — Railway will
  //     simply not have that var, matching local behavior.
  const allEntries = Object.entries(merged)
  const skipped: string[] = []
  const entries = allEntries.filter(([k, v]) => {
    if (v === '') {
      skipped.push(k)
      return false
    }
    return true
  })
  if (skipped.length > 0) {
    console.info(`\n⏭  Skipped ${skipped.length} empty vars: ${skipped.join(', ')}`)
  }
  let pushed = 0
  for (let i = 0; i < entries.length; i++) {
    const [k, v] = entries[i]
    const isLast = i === entries.length - 1
    const args = ['variable', 'set', '--service', service, k, '--stdin']
    if (!isLast) args.push('--skip-deploys')
    const result = spawnSync('railway', args, {
      input: v,
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true,
    })
    if (result.status !== 0) {
      fail(`Railway CLI exited with status ${result.status} on variable "${k}"`)
    }
    pushed++
  }

  console.info(`\n✅ Pushed ${pushed} vars to Railway service "${service}"`)
}
