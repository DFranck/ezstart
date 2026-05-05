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

import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { extractEnvFlag, parseEnvArg, type TargetEnv } from './shared-flags.js'

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
  /** Forward to each child push script — opt-in destructive cleanup. */
  prune: boolean
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
  // Same parsing strategy as push-vercel/push-railway — pull --env=<x> out
  // first, then take the leftover non-flag head as the positional <env>.
  const working = [...argv]
  const envFlagValue = extractEnvFlag(working)
  let positionalEnv: string | undefined
  if (working.length > 0 && !working[0].startsWith('--')) {
    positionalEnv = working.shift()
  }
  const rest = working

  let resolvedEnv: TargetEnv | null
  try {
    resolvedEnv = parseEnvArg(positionalEnv, envFlagValue)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
  if (!resolvedEnv) {
    fail(
      'Usage: pnpm env:push:all <env> [--dry-run] [--only-api] [--only-web] [--apps <csv>] [--continue-on-error] [--prune]\n' +
        '         pnpm env:push:all --env=<env> ...   (anti-typo alias)\n' +
        '  Example: pnpm env:push:all staging --dry-run\n' +
        '  Example: pnpm env:push:all --env=production --apps ezauth,ezpay --prune'
    )
  }

  let dryRun = false
  let onlyApi = false
  let onlyWeb = false
  let continueOnError = false
  let prune = false
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
    } else if (flag === '--prune') {
      prune = true
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
    env: resolvedEnv,
    dryRun,
    onlyApi,
    onlyWeb,
    apps,
    continueOnError,
    prune,
  }
}

function hasPackage(root: string, app: string, layer: 'api' | 'web'): boolean {
  return existsSync(path.join(root, 'apps', app, layer, 'package.json'))
}

/**
 * Async wrapper over `spawn()` for child `pnpm env:push:*` processes. Captures
 * stdout/stderr to a string buffer (instead of inheriting the terminal) so
 * parallel children don't interleave their output. The buffered output is
 * printed AFTER the child exits, prefixed with the app/platform header.
 *
 * Why captured (not inherited): when running 4 apps in parallel, each running
 * a Vercel push that itself parallelizes 8 vars internally, mixing all output
 * on the same terminal would be unreadable. Buffer + serialized print keeps
 * each app's log block coherent.
 */
function runPush(
  root: string,
  platform: Platform,
  app: string,
  env: TargetEnv,
  dryRun: boolean,
  prune: boolean
): Promise<StepResult> {
  const script = platform === 'railway' ? 'env:push:railway' : 'env:push:vercel'
  const args = ['run', script, app, env]
  if (dryRun) args.push('--dry-run')
  if (prune) args.push('--prune')

  const prefix = platform === 'railway' ? '🚂' : '▲'

  return new Promise(resolve => {
    // `shell: true` for Windows compat (pnpm is a .cmd shim).
    const child = spawn('pnpm', args, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })
    let buffer = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')
    })
    child.on('close', code => {
      const exitCode = code ?? 1
      // Print the captured output as a single block so concurrent runs stay readable.
      console.info(`\n${prefix} [${platform}] ${app} → ${env}${dryRun ? ' (dry-run)' : ''}`)
      console.info(`   $ pnpm ${args.join(' ')}`)
      if (buffer.trim()) {
        // Indent the child output for visual nesting under the header.
        const indented = buffer
          .trimEnd()
          .split('\n')
          .map(l => `   ${l}`)
          .join('\n')
        console.info(indented)
      }
      resolve({
        app,
        platform,
        status: exitCode === 0 ? 'pushed' : 'failed',
        exitCode,
      })
    })
    child.on('error', err => {
      console.error(`\n${prefix} [${platform}] ${app} — spawn error: ${err.message}`)
      resolve({ app, platform, status: 'failed', exitCode: 1, reason: err.message })
    })
  })
}

/**
 * Run an array of async tasks with bounded concurrency. Same pattern as in
 * push-vercel.ts (kept inline to avoid an extra shared util for 2 callers).
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

// ── CLI entry ───────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const ROOT = findMonorepoRoot()

  console.info(
    `📦 env:push:all — ${args.apps.length} app${args.apps.length === 1 ? '' : 's'} → ${args.env}` +
      `${args.dryRun ? ' (dry-run)' : ''}` +
      `${args.onlyApi ? ' [api only]' : ''}` +
      `${args.onlyWeb ? ' [web only]' : ''}` +
      `${args.continueOnError ? ' [continue-on-error]' : ''}` +
      `${args.prune ? ' [prune]' : ''}`
  )
  console.info(`   apps: ${args.apps.join(', ')}`)

  // Build per-app tasks. Each task does API+Web sequentially within the app
  // (to keep their output grouped) but different apps run in parallel up to
  // APP_CONCURRENCY. Skipped layers don't spawn subprocesses.
  //
  // Concurrency cap of 4 balances:
  //   - Throughput: 8 apps × ~5s each in parallel = ~10s wall clock for 4 batches
  //   - Vercel/Railway API rate limits: 4 concurrent CLI sessions is well within
  //     normal headroom (their dashboards routinely handle dozens of dev calls)
  //   - Local CPU/memory: each pnpm child fork loads tsx; 4 in parallel is fine
  //     on any modern dev machine
  //
  // Fail-fast semantics with --continue-on-error: when fail-fast is active, the
  // first failure observed cancels NO in-flight tasks (that would require an
  // AbortController + cooperative cancellation in each child), but blocks the
  // next batch of tasks from starting. With --continue-on-error, every task
  // runs to completion regardless.
  const APP_CONCURRENCY = 4

  interface AppTaskResult {
    steps: StepResult[]
    shouldStop: boolean
  }

  const results: StepResult[] = []
  let firstFailure: StepResult | null = null
  let stopRequested = false

  const appTasks = args.apps.map(app => async (): Promise<AppTaskResult> => {
    // Honor fail-fast: skip if a prior task already failed.
    if (stopRequested) {
      return { steps: [], shouldStop: true }
    }

    const steps: StepResult[] = []

    // API push
    if (!args.onlyWeb) {
      if (hasPackage(ROOT, app, 'api')) {
        const result = await runPush(ROOT, 'railway', app, args.env, args.dryRun, args.prune)
        steps.push(result)
        if (result.status === 'failed' && !args.continueOnError) {
          stopRequested = true
          return { steps, shouldStop: true }
        }
      } else {
        steps.push({
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
        const result = await runPush(ROOT, 'vercel', app, args.env, args.dryRun, args.prune)
        steps.push(result)
        if (result.status === 'failed' && !args.continueOnError) {
          stopRequested = true
          return { steps, shouldStop: true }
        }
      } else {
        steps.push({
          app,
          platform: 'vercel',
          status: 'skipped',
          exitCode: 0,
          reason: 'no apps/<app>/web/package.json',
        })
        console.info(`\n▲ [vercel] ${app} — skipped (no web/ package)`)
      }
    }

    return { steps, shouldStop: false }
  })

  const taskResults = await runWithConcurrency<AppTaskResult>(appTasks, APP_CONCURRENCY)
  for (const tr of taskResults) {
    for (const step of tr.steps) {
      results.push(step)
      if (step.status === 'failed' && !firstFailure) {
        firstFailure = step
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
}

// Run main and surface any uncaught error as a clean exit. tsx (esbuild CJS)
// does not support top-level await, so we use a promise chain instead.
main().catch(err => {
  console.error('❌ Uncaught error in push-all:', err)
  process.exit(1)
})
