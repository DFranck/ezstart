#!/usr/bin/env tsx
/**
 * env:push:vercel — push merged per-app web env to Vercel project.
 *
 * Usage:
 *   pnpm env:push:vercel <app> <env> [--from <sourceEnv>] [--override KEY=val,KEY2=val2] [--dry-run]
 *
 * Examples:
 *   pnpm env:push:vercel ezpay local
 *   pnpm env:push:vercel ezpay staging
 *   pnpm env:push:vercel ezpay production
 *   pnpm env:push:vercel ezpay staging --from local   # force single source, skip cascade
 *   pnpm env:push:vercel ezpay production --override NEXT_PUBLIC_X=custom
 *   pnpm env:push:vercel ezpay staging --dry-run
 *
 * Cascade (PER-APP ONLY — no root layer, lowest → highest precedence):
 *
 *   local       →  apps/<app>/web/.env.local
 *
 *   staging     →  apps/<app>/web/.env.local
 *                  apps/<app>/web/.env.staging   (staging overrides)
 *
 *   production  →  apps/<app>/web/.env.local
 *                  apps/<app>/web/.env.staging   (shared staging+prod defaults)
 *                  apps/<app>/web/.env.production (prod-only overrides)
 *
 *   --override KEY=VAL is applied LAST and beats every file-level value.
 *
 * `.env.staging` holds the values shared by staging AND production (non-dev defaults:
 * cluster URLs, `DEPLOY_ENV=production`, production CDN origins, cookie domains).
 * `.env.production` holds ONLY the keys that DIFFER from staging (live Stripe
 * publishable keys, production API URLs, production webhook targets). Missing layers
 * are silently skipped.
 *
 * Flags:
 *   --from <env>        Use a SINGLE source env file (bypass cascade). Useful when
 *                       you want to push exactly what's in .env.local to staging
 *                       for example. Accepts: local | staging | production.
 *   --override KEY=VAL  Comma-separated KEY=VALUE pairs, applied LAST.
 *   --dry-run           Print merged vars without calling Vercel CLI.
 *
 * Final precedence (lowest → highest):
 *   cascade layers < --override
 *
 * Requires: Vercel CLI installed (https://vercel.com/docs/cli).
 */

import { spawn, spawnSync } from 'node:child_process'
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

function checkVercelCli(): void {
  // On Windows, npm/pnpm global bins are .cmd shims — spawnSync without
  // `shell: true` can't find them on PATH.
  const result = spawnSync('vercel', ['--version'], { encoding: 'utf-8', shell: true })
  if (result.status !== 0) {
    fail('Vercel CLI not found. Install via:\n  npm i -g vercel')
  }
}

/**
 * Async wrapper over `spawn()` for the `vercel` CLI. Returns the child's exit
 * status without throwing. Stdio is fully captured (returned as string) so
 * parallel calls don't interleave their output on the terminal.
 *
 * Why not spawnSync: parallelizing N rm+add pairs requires async I/O. spawnSync
 * blocks the event loop, defeating Promise.all.
 *
 * `shell: true` is kept for Windows compat (vercel is a .cmd shim under npm
 * global). Vercel env values are passed via dedicated CLI flags (`--value`),
 * not concatenated into a shell string, so shell metacharacters in values are
 * not a concern here (unlike Railway's batch which we route through cmd /c).
 */
function vercelSpawn(args: string[], cwd: string): Promise<{ status: number; stderr: string }> {
  return new Promise(resolve => {
    const child = spawn('vercel', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8')
    })
    child.stdout?.on('data', () => {
      // discard stdout — vercel logs verbosely; we only care about exit status
    })
    child.on('close', code => {
      resolve({ status: code ?? 1, stderr })
    })
    child.on('error', err => {
      resolve({ status: 1, stderr: err.message })
    })
  })
}

/**
 * Run an array of async tasks with bounded concurrency. Resolves when all
 * tasks complete (failures included — each task is responsible for capturing
 * its own error). Order of `tasks[i]` is preserved in `results[i]`.
 *
 * Why not p-limit / async pool libs: zero-dep, this script is small.
 */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (true) {
      const i = nextIndex++
      if (i >= tasks.length) return
      results[i] = await tasks[i]()
    }
  })
  await Promise.all(workers)
  return results
}

function parseEnvFile(absPath: string): Record<string, string> | null {
  if (!existsSync(absPath)) return null
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

/**
 * Git branch used to scope Vercel preview env vars. Staging pushes target the
 * `staging` branch specifically — other preview branches keep their own vars.
 * Returns null for envs that aren't branch-scoped (production, development).
 */
function vercelGitBranch(env: string): string | null {
  return env === 'staging' ? 'staging' : null
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
  /** App slug (e.g. 'ezpay'). */
  app: string
  /** Target environment. Drives the cascade. */
  targetEnv: TargetEnv
  /**
   * If provided, bypass the cascade and load a SINGLE env file level.
   * Typical use: `--from local` to push local values verbatim to preview.
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
 * Merge per-app web env files following the cascade.
 *
 * Precedence (lowest → highest):
 *   app .env.local < app .env.<env> < overrides
 *
 * When `fromOverride` is set, ONLY that layer is loaded, the cascade is bypassed.
 */
export function loadMergedEnv(input: LoadMergedEnvInput): LoadMergedEnvResult {
  const { root, app, targetEnv, fromOverride, overrides = {}, readEnv = parseEnvFile } = input

  const layers: TargetEnv[] = fromOverride ? [fromOverride] : cascadeLayers(targetEnv)

  const merged: Record<string, string> = {}
  const sources: LoadMergedEnvResult['sources'] = []

  for (const level of layers) {
    const file = `.env.${level}`
    const absPath = path.join(root, 'apps', app, 'web', file)
    const parsed = readEnv(absPath)
    sources.push({ level, path: absPath, exists: parsed !== null })
    if (!parsed) continue
    for (const [k, v] of Object.entries(parsed)) merged[k] = v
  }

  // --override flag (highest precedence, applied last)
  for (const [k, v] of Object.entries(overrides)) merged[k] = v

  return { merged, sources }
}

interface ParsedFlags {
  from?: TargetEnv
  overrides: Record<string, string>
  dryRun: boolean
}

export function parseFlags(flags: string[]): ParsedFlags {
  const result: ParsedFlags = { overrides: {}, dryRun: false }
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

async function main(): Promise<void> {
  const [, , app, env, ...rest] = process.argv
  if (!app || !env) {
    fail(
      'Usage: pnpm env:push:vercel <app> <env> [--from <sourceEnv>] [--override KEY=val,KEY2=val2] [--dry-run]\n' +
        '  Example: pnpm env:push:vercel ezpay production\n' +
        '  Example: pnpm env:push:vercel ezpay staging --from local --override DEPLOY_ENV=staging'
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

  const branchSuffix = vercelGitBranch(env) ? ` branch=${vercelGitBranch(env)}` : ''
  console.info(
    `▲ env:push:vercel — ${app}/web → ${env} (Vercel ${vercelEnvName(env)}${branchSuffix})${flags.dryRun ? ' (dry-run)' : ''}`
  )
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

  if (!flags.dryRun) checkVercelCli()

  const webDir = path.join(ROOT, 'apps', app, 'web')
  const vercelTarget = vercelEnvName(env)

  const action = flags.dryRun ? 'Would push' : 'Pushing'
  console.info(
    `${action} ${Object.keys(merged).length} vars to Vercel project (cwd=${webDir})...\n`
  )

  if (flags.dryRun) {
    for (const [k, v] of Object.entries(merged)) {
      const marker = flags.overrides[k] !== undefined ? ' [override]' : ''
      console.info(`  ${k}=${mask(v)}${marker}`)
    }
    console.info(
      `\n✅ Dry-run complete — ${Object.keys(merged).length} vars would be pushed to "${app}" (${vercelTarget})`
    )
    process.exit(0)
  }

  const gitBranch = vercelGitBranch(env)
  const skipped: string[] = []
  // Filter empty values upfront — Vercel `env add` rejects them, and an empty
  // value in a source file means "intentionally absent" (matches local behavior).
  const entries = Object.entries(merged).filter(([k, v]) => {
    if (v === '') {
      skipped.push(k)
      return false
    }
    return true
  })

  // Log what we're about to push (with masking) — done synchronously BEFORE
  // kicking off parallel tasks so the output is readable.
  for (const [k, v] of entries) {
    const marker = flags.overrides[k] !== undefined ? ' [override]' : ''
    console.info(`  ${k}=${mask(v)}${marker}`)
  }

  // Build per-var rm+add tasks and run with bounded concurrency. Each task
  // does a sequential rm-then-add for that key (order matters: vercel env rm
  // followed by env add). Different keys are independent → parallel-safe.
  // Concurrency cap of 8 balances throughput vs Vercel API rate limits and
  // local CPU; 12 vars × 2 calls in parallel finishes in ~3-4s instead of
  // ~24s sequential.
  const tasks = entries.map(([k, v]) => async () => {
    const rmArgs = ['env', 'rm', k, vercelTarget]
    if (gitBranch) rmArgs.push(gitBranch)
    rmArgs.push('--yes')

    const addArgs = ['env', 'add', k, vercelTarget]
    if (gitBranch) addArgs.push(gitBranch)
    addArgs.push('--value', v, '--yes')

    // rm first (best-effort — ignore failures, the var may not exist yet).
    await vercelSpawn(rmArgs, webDir)
    const addResult = await vercelSpawn(addArgs, webDir)
    return { key: k, status: addResult.status, stderr: addResult.stderr }
  })

  const VERCEL_CONCURRENCY = 8
  const results = await runWithConcurrency(tasks, VERCEL_CONCURRENCY)

  let pushed = 0
  let failed = 0
  for (const r of results) {
    if (r.status === 0) {
      pushed++
    } else {
      failed++
      console.error(`     ↳ ${r.key} failed (status ${r.status}): ${r.stderr.trim().slice(0, 200)}`)
    }
  }

  if (skipped.length > 0) {
    console.info(`\n⏭  Skipped ${skipped.length} empty vars: ${skipped.join(', ')}`)
  }

  console.info(
    `\n${failed === 0 ? '✅' : '⚠️ '} Pushed ${pushed}/${entries.length} vars to Vercel project "${app}" (parallel concurrency=${VERCEL_CONCURRENCY})`
  )
  if (failed > 0) process.exit(1)
}

if (isDirectRun) {
  // Run main() and surface any uncaught error as a clean exit instead of an
  // unhandled promise rejection. tsx (esbuild CJS output) does not support
  // top-level await, so we use a .then/.catch chain.
  main().catch(err => {
    console.error('❌ Uncaught error in push-vercel:', err)
    process.exit(1)
  })
}
