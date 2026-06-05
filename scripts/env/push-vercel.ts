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
 * Value semantics (3-way, mirrors Stripe / Vercel CLI convention):
 *   - `KEY` absent from every cascade layer  → no-op (variable not touched).
 *   - `KEY=` (empty string) in the cascade   → DELETE via `vercel env rm`.
 *                                              Use this to explicitly clear a
 *                                              var on Vercel (e.g. after a leak
 *                                              or rotation). Idempotent: if the
 *                                              var doesn't exist remotely, the
 *                                              push still succeeds.
 *   - `KEY=value` in the cascade             → upsert (rm-then-add) on Vercel.
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
import * as readline from 'node:readline'
import * as dotenv from 'dotenv'
import {
  assertNoFailedDeletes,
  detectInlineCommentEmptyValuesFromFile,
  formatEmptyDeletePrompt,
  requireConfirmEmptyDelete,
} from './delete-guards.js'
import {
  ALL_TARGET_ENVS,
  extractEnvFlag,
  isProtectedEnvKey,
  parseEnvArg,
  type TargetEnv,
} from './shared-flags.js'

export type { TargetEnv }

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
  /**
   * When true, after pushing the merged cascade vars, the script also
   * inventories what's currently set on Vercel and DELETES anything that
   * does not appear in the local cascade (except platform-protected keys
   * — see `isProtectedEnvKey()`). Off by default — opt-in only.
   */
  prune: boolean
  /**
   * When true, an empty-string cascade entry (`KEY=`) deletes the var from
   * ALL Vercel target envs (development + preview + production) instead of
   * only the env this push targets. Off by default — opt-in only. Useful
   * for post-leak rotation when the operator wants to ensure no env keeps
   * the rotated value. See V3 in tmp/hack-a3-empty-delete.md.
   */
  cascadeDeleteAllEnvs: boolean
  /**
   * Explicit operator confirmation for `--override KEY=` (empty value)
   * DELETE intent in non-interactive contexts. See V5 in
   * tmp/hack-a3-empty-delete.md.
   */
  yesIMeanDelete: boolean
  /**
   * Force non-interactive flow (no TTY prompts).
   */
  nonInteractive: boolean
  /**
   * Acknowledge that the V3 cross-env scope mismatch is intentional. When
   * the cascade has `KEY=` in the current env but the same KEY is set in
   * another env's cascade, the push only deletes from the current Vercel
   * env — the value lives on for the other env. Without this flag, the
   * mismatch triggers a fail-fast in non-TTY contexts. Use this when the
   * partial delete is what you actually want (e.g. cycling a prod-only key
   * while keeping the staging value untouched). Post hacker-A3.5 (P1b).
   */
  acceptCrossEnvMismatch: boolean
}

export function parseFlags(flags: string[]): ParsedFlags {
  const result: ParsedFlags = {
    overrides: {},
    dryRun: false,
    prune: false,
    cascadeDeleteAllEnvs: false,
    yesIMeanDelete: false,
    nonInteractive: false,
    acceptCrossEnvMismatch: false,
  }
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
    } else if (flag === '--prune') {
      result.prune = true
    } else if (flag === '--cascade-delete-all-envs') {
      result.cascadeDeleteAllEnvs = true
    } else if (flag === '--yes-i-mean-delete') {
      result.yesIMeanDelete = true
    } else if (flag === '--non-interactive') {
      result.nonInteractive = true
    } else if (flag === '--accept-cross-env-mismatch') {
      result.acceptCrossEnvMismatch = true
    } else {
      fail(`Unknown flag "${flag}"`)
    }
  }
  return result
}

/**
 * Scan other cascade envs (the ones we're NOT pushing right now) to detect
 * keys that are empty (DELETE intent) here but populated elsewhere. This is
 * the V3 cross-env scope-mismatch warning: a `KEY=` in `.env.production`
 * only deletes from Vercel's `production` target. If the same `KEY` is set
 * in `.env.staging`, the staging-targeted push earlier (or later) keeps
 * the value alive in Vercel's `preview` target. The operator should know.
 *
 * Returns an array of detections; empty when there is no mismatch.
 */
export interface CrossEnvScopeDetection {
  key: string
  targetEnv: TargetEnv
  otherEnv: TargetEnv
  otherValueSample: string
}

export interface DetectCrossEnvScopeMismatchInput {
  root: string
  app: string
  /** The env currently being pushed. */
  targetEnv: TargetEnv
  /** Keys that are EMPTY in this push (slated for DELETE on Vercel). */
  emptyKeys: readonly string[]
  /** Function that reads an env file and returns its keys, or null. */
  readEnv: (absPath: string) => Record<string, string> | null
}

export function detectCrossEnvScopeMismatch(
  input: DetectCrossEnvScopeMismatchInput
): CrossEnvScopeDetection[] {
  const out: CrossEnvScopeDetection[] = []
  for (const otherEnv of ALL_TARGET_ENVS) {
    if (otherEnv === input.targetEnv) continue
    const otherPath = path.join(input.root, 'apps', input.app, 'web', `.env.${otherEnv}`)
    const parsed = input.readEnv(otherPath)
    if (!parsed) continue
    for (const key of input.emptyKeys) {
      const otherValue = parsed[key]
      if (otherValue !== undefined && otherValue !== '') {
        out.push({
          key,
          targetEnv: input.targetEnv,
          otherEnv,
          otherValueSample: otherValue,
        })
      }
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────
// Prune logic — list remote keys & diff against local cascade
// ────────────────────────────────────────────────────────────

/**
 * Inventory env vars currently set on Vercel for a given target environment.
 *
 * Strategy : `vercel env ls <target> [<gitBranch>]` returns a human-readable
 * table on stdout. Vercel CLI does NOT have a `--json` flag for `env ls` as
 * of CLI v32, so we parse the table line-by-line. The table format is :
 *
 *   Environment Variables found in Project "x"
 *
 *     name              value             environments      created
 *     NEXT_PUBLIC_FOO   Encrypted         Production        ...
 *     ...
 *
 * Heuristic : skip blank lines + the header row + lines that don't start with
 * a JS-identifier-like prefix. Robust enough for our use (we only care about
 * the keys, not the values).
 */
export function parseVercelEnvLs(stdout: string): string[] {
  const keys = new Set<string>()
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    // Header / footer lines start with capital words like "Environment" or
    // contain "Vercel CLI" — they don't match our key regex.
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s/)
    if (m) keys.add(m[1])
  }
  return Array.from(keys).sort()
}

export interface ListVercelEnvOptions {
  cwd: string
  vercelTarget: 'development' | 'preview' | 'production'
  gitBranch: string | null
  /** Test seam : swap the underlying spawn for a mock. */
  exec?: (args: string[], cwd: string) => { status: number; stdout: string; stderr: string }
}

/**
 * Run `vercel env ls` in the project directory and return the list of var
 * names currently configured for the target env (+ optional git branch).
 *
 * Throws when the CLI exits non-zero — caller should catch and present a
 * clear error.
 */
export function listVercelEnvKeys(opts: ListVercelEnvOptions): string[] {
  const args = ['env', 'ls', opts.vercelTarget]
  if (opts.gitBranch) args.push(opts.gitBranch)
  const exec = opts.exec ?? defaultVercelExec
  const result = exec(args, opts.cwd)
  if (result.status !== 0) {
    throw new Error(
      `vercel env ls exited with status ${result.status} : ${result.stderr.trim() || '(empty)'}`
    )
  }
  return parseVercelEnvLs(result.stdout)
}

function defaultVercelExec(
  args: string[],
  cwd: string
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('vercel', args, { cwd, encoding: 'utf-8', shell: true })
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

/**
 * Strict yes/no prompt — only the exact lowercase string `yes` confirms.
 * Anything else (including `y`, blank line, EOF) returns false. Used for the
 * `--override KEY=` DELETE confirmation gate (V5 in hacker-A3 report).
 */
async function promptYesNoStrict(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await new Promise<string>(resolve => {
      rl.question(message, resolve)
    })
    return answer.trim().toLowerCase() === 'yes'
  } finally {
    rl.close()
  }
}

export interface ComputePruneInput {
  /** Keys discovered on the remote (Vercel project for the target env). */
  remoteKeys: readonly string[]
  /** Keys present in the merged local cascade (will be pushed). */
  localKeys: readonly string[]
}

/**
 * Compute the list of keys that would be pruned : present on remote, not in
 * the local cascade, AND not platform-protected. Pure function — easy to
 * test exhaustively without a live Vercel project.
 */
export function computePruneList(input: ComputePruneInput): string[] {
  const local = new Set(input.localKeys)
  const result: string[] = []
  for (const key of input.remoteKeys) {
    if (local.has(key)) continue
    if (isProtectedEnvKey(key)) continue
    result.push(key)
  }
  return result.sort()
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
  const [, , app, ...restRaw] = process.argv
  if (!app) {
    fail(
      'Usage: pnpm env:push:vercel <app> <env> [--from <sourceEnv>] [--override KEY=val,KEY2=val2] [--dry-run] [--prune]\n' +
        '         pnpm env:push:vercel <app> --env=<env> ...   (anti-typo alias)\n' +
        '  Example: pnpm env:push:vercel ezpay production\n' +
        '  Example: pnpm env:push:vercel ezpay --env=staging --prune --dry-run\n' +
        '  Example: pnpm env:push:vercel ezpay staging --from local --override DEPLOY_ENV=staging'
    )
  }

  // Extract --env=<x> BEFORE pulling the positional <env>, so a caller using
  // --env= without the legacy positional doesn't get the flag mis-parsed as
  // the positional. Then take the leftover first non-flag token as positional.
  const rest = [...restRaw]
  const envFlagValue = extractEnvFlag(rest)
  // Positional <env> = first leftover arg that does NOT start with '--'.
  let positionalEnv: string | undefined
  if (rest.length > 0 && !rest[0].startsWith('--')) {
    positionalEnv = rest.shift()
  }

  let targetEnv: TargetEnv | null
  try {
    targetEnv = parseEnvArg(positionalEnv, envFlagValue)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
  if (!targetEnv) {
    fail(
      'Missing <env> — pass it as positional or --env=<value>. Valid values: local | staging | production.'
    )
  }
  const env = targetEnv

  const flags = parseFlags(rest)

  const ROOT = findMonorepoRoot()

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

  // ── N1 guard: warn on KEY=#comment lines that dotenv treats as empty ────
  // dotenv parses `DATABASE_URL=#TODO put real prod URL` as `{ DATABASE_URL:
  // '' }` (the `#` starts an inline comment), which downstream triggers
  // DELETE — usually NOT what the operator meant.
  for (const src of sources) {
    if (!src.exists) continue
    const detections = detectInlineCommentEmptyValuesFromFile(src.path)
    for (const d of detections) {
      console.warn(
        `⚠️  ${d.file}:${d.line} — \`${d.raw}\` parses as ${d.key}='' (inline # comment ⇒ empty value ⇒ DELETE).\n` +
          `   If you meant to keep ${d.key}, quote the value or move the comment to its own line.`
      )
    }
  }

  // ── V3 guard: cross-env scope mismatch ─────────────────────────────────
  // `vercel env rm KEY <target>` only deletes from the named target env. If
  // the same KEY is populated in another env's cascade (e.g. cleared in
  // production but still set in staging), the value lives on in Vercel for
  // that other env.
  //
  // Post hacker-A3.5 (P1b): previously this was a `console.warn` then
  // silently continued — operators with scrolled CI logs got the exact
  // half-delete state the warning described. Now:
  //   - In TTY (interactive): prompt the operator to choose abort / continue
  //     scoped-only / cascade-delete-all-envs.
  //   - In non-TTY (CI): fail-fast unless either `--cascade-delete-all-envs`
  //     OR `--accept-cross-env-mismatch` is passed. Make the operator
  //     deliberately acknowledge the split-state risk.
  const emptyCascadeKeys = Object.entries(merged)
    .filter(([, v]) => v === '')
    .map(([k]) => k)
  if (emptyCascadeKeys.length > 0 && !flags.cascadeDeleteAllEnvs) {
    const mismatches = detectCrossEnvScopeMismatch({
      root: ROOT,
      app,
      targetEnv: env,
      emptyKeys: emptyCascadeKeys,
      readEnv: parseEnvFile,
    })
    if (mismatches.length > 0) {
      console.warn(`⚠️  Cross-env scope mismatch on ${mismatches.length} DELETE key(s):`)
      for (const m of mismatches) {
        console.warn(
          `     - ${m.key}: empty in ${m.targetEnv} cascade (will DELETE from Vercel ${vercelEnvName(m.targetEnv)})`
        )
        console.warn(
          `       But set in .env.${m.otherEnv} → Vercel ${vercelEnvName(m.otherEnv)} keeps the value.`
        )
      }
      console.warn(
        `   Pass --cascade-delete-all-envs to remove from ALL Vercel envs (development + preview + production).\n`
      )
      const isTTY = Boolean(process.stdin.isTTY) && !flags.nonInteractive
      if (!isTTY) {
        if (!flags.acceptCrossEnvMismatch) {
          fail(
            `Cross-env scope mismatch detected in non-interactive context (${mismatches.length} key(s)).\n` +
              `  Either pass --cascade-delete-all-envs to delete from ALL 3 Vercel envs,\n` +
              `  OR pass --accept-cross-env-mismatch to delete only from the current env\n` +
              `  (deliberately accepting that other envs keep the value).`
          )
        }
        // operator explicitly accepted — continue with scoped delete
      } else if (!flags.acceptCrossEnvMismatch) {
        const accepted = await promptYesNoStrict(
          `\n   Continue with scoped delete (only ${vercelEnvName(env)})? (yes/NO): `
        )
        if (!accepted) {
          fail(`Aborted — re-run with --cascade-delete-all-envs OR --accept-cross-env-mismatch.`)
        }
      }
    }
  }

  // ── V5 guard: confirm before DELETE for ANY empty-value source ──────────
  // Post hacker-A3.5 (P1a): extended from override-only to cover cascade-file
  // empties too (a bare `KEY=` line in .env.production is the same risk class
  // as a `--override KEY=` typo — both DELETE the secret silently in CI).
  const emptyOverrideKeys = Object.entries(flags.overrides)
    .filter(([, v]) => v === '')
    .map(([k]) => k)
  const cascadeEmptyKeys = emptyCascadeKeys.filter(k => !emptyOverrideKeys.includes(k))
  if (!flags.dryRun && (emptyOverrideKeys.length > 0 || cascadeEmptyKeys.length > 0)) {
    const guard = requireConfirmEmptyDelete({
      emptyOverrideKeys,
      emptyCascadeKeys: cascadeEmptyKeys,
      yesIMeanDelete: flags.yesIMeanDelete,
      nonInteractive: flags.nonInteractive,
    })
    if (!guard.proceed) {
      if (guard.requiresInteractivePrompt) {
        const accepted = await promptYesNoStrict(formatEmptyDeletePrompt(guard.allEmptyKeys))
        if (!accepted) {
          fail(`Aborted by operator — type \`yes\` exactly to confirm DELETE intent next time.`)
        }
      } else {
        fail(guard.reason ?? 'Empty-value DELETE intent requires explicit confirmation.')
      }
    }
  }

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
    let dryRunDeleteCount = 0
    let dryRunUpsertCount = 0
    for (const [k, v] of Object.entries(merged)) {
      const marker = flags.overrides[k] !== undefined ? ' [override]' : ''
      if (v === '') {
        console.info(`  ${k}=<DELETE> (empty in cascade)${marker}`)
        dryRunDeleteCount++
      } else {
        console.info(`  ${k}=${mask(v)}${marker}`)
        dryRunUpsertCount++
      }
    }
    if (dryRunDeleteCount > 0) {
      console.info(
        `\n🗑  Would DELETE ${dryRunDeleteCount} empty var${dryRunDeleteCount === 1 ? '' : 's'} from Vercel`
      )
    }
    if (flags.prune) {
      // In dry-run we still need to inventory the remote to compute the prune
      // diff. The CLI is read-only here so it is safe to call without staging
      // a real change.
      try {
        const remoteKeys = listVercelEnvKeys({
          cwd: webDir,
          vercelTarget,
          gitBranch: vercelGitBranch(env),
        })
        const toPrune = computePruneList({
          remoteKeys,
          localKeys: Object.keys(merged),
        })
        if (toPrune.length === 0) {
          console.info(
            `\n🧹 [prune dry-run] No remote vars would be pruned (cascade matches remote inventory).`
          )
        } else {
          console.info(
            `\n🧹 [prune dry-run] ${toPrune.length} remote var${toPrune.length === 1 ? '' : 's'} would be DELETED from Vercel:`
          )
          for (const k of toPrune) console.info(`  - ${k}`)
        }
      } catch (err) {
        console.warn(
          `\n⚠️  [prune dry-run] Could not inventory remote vars: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
    console.info(
      `\n✅ Dry-run complete — ${dryRunUpsertCount} var${dryRunUpsertCount === 1 ? '' : 's'} would be upserted` +
        (dryRunDeleteCount > 0
          ? ` + ${dryRunDeleteCount} var${dryRunDeleteCount === 1 ? '' : 's'} deleted`
          : '') +
        ` on "${app}" (${vercelTarget})`
    )
    process.exit(0)
  }

  const gitBranch = vercelGitBranch(env)
  // Split entries by intent (3-way partition, mirrors `vercel env` CLI verbs):
  //   - empty string `''`  → DELETE the var on Vercel (operator explicitly
  //     cleared the value in the cascade — pattern matches Stripe / Vercel CLI
  //     convention of `vercel env rm <NAME>` for explicit teardown). Previously
  //     these were silently skipped, forcing manual cleanup after leaks or
  //     rotations.
  //   - value present     → upsert (rm-then-add) the var on Vercel.
  //   - undefined / absent from cascade  → never reached here (filter is by
  //     value, and `dotenv.parse()` returns absent keys as missing, not '').
  const toDelete: string[] = []
  const entries: Array<[string, string]> = []
  for (const [k, v] of Object.entries(merged)) {
    if (v === '') {
      toDelete.push(k)
    } else {
      entries.push([k, v])
    }
  }

  // Log what we're about to push (with masking) — done synchronously BEFORE
  // kicking off parallel tasks so the output is readable.
  for (const [k, v] of entries) {
    const marker = flags.overrides[k] !== undefined ? ' [override]' : ''
    console.info(`  ${k}=${mask(v)}${marker}`)
  }
  for (const k of toDelete) {
    console.info(`  ${k}=<DELETE> (empty in cascade)`)
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

  // Delete tasks for vars explicitly cleared in the cascade. Run in parallel
  // alongside upserts. Vercel `env rm` exits non-zero when the var doesn't
  // exist on the remote — we treat that as idempotent success so push-all
  // doesn't crash when a fresh project hasn't seen the var yet. The stderr
  // signature for "not found" is recognizable enough across CLI versions.
  //
  // When `--cascade-delete-all-envs` is set (V3), each empty key is removed
  // from every Vercel env target (development + preview + production), not
  // only the env this push targets. The result is reported as the WORST of
  // the per-target outcomes (a single non-idempotent failure surfaces).
  const cascadeTargets: ReadonlyArray<'development' | 'preview' | 'production'> =
    flags.cascadeDeleteAllEnvs
      ? (['development', 'preview', 'production'] as const)
      : [vercelTarget]
  const deleteTasks = toDelete.map(k => async () => {
    let worstStatus = 0
    let combinedStderr = ''
    let anyDeleted = false
    let allIdempotent = true
    for (const target of cascadeTargets) {
      const rmArgs = ['env', 'rm', k, target]
      // Git branch only meaningful for preview target
      if (target === 'preview' && gitBranch) rmArgs.push(gitBranch)
      rmArgs.push('--yes')
      const result = await vercelSpawn(rmArgs, webDir)
      const lowerStderr = result.stderr.toLowerCase()
      const notFound =
        lowerStderr.includes('not found') ||
        lowerStderr.includes('does not exist') ||
        lowerStderr.includes("doesn't exist")
      if (result.status === 0) {
        anyDeleted = true
        allIdempotent = false
      } else if (notFound) {
        // already absent — fine
      } else {
        worstStatus = result.status
        combinedStderr += `[${target}] ${result.stderr}\n`
        allIdempotent = false
      }
    }
    return {
      key: k,
      status: worstStatus,
      stderr: combinedStderr,
      idempotent: !anyDeleted && allIdempotent,
    }
  })

  const VERCEL_CONCURRENCY = 8
  const [upsertResults, deleteResults] = await Promise.all([
    runWithConcurrency(tasks, VERCEL_CONCURRENCY),
    runWithConcurrency(deleteTasks, VERCEL_CONCURRENCY),
  ])

  let pushed = 0
  let failed = 0
  for (const r of upsertResults) {
    if (r.status === 0) {
      pushed++
    } else {
      failed++
      console.error(`     ↳ ${r.key} failed (status ${r.status}): ${r.stderr.trim().slice(0, 200)}`)
    }
  }

  let deleted = 0
  let deleteIdempotent = 0
  let deleteFailed = 0
  for (const r of deleteResults) {
    if (r.status === 0) {
      if (r.idempotent) deleteIdempotent++
      else deleted++
    } else {
      deleteFailed++
      console.error(
        `     ↳ DELETE ${r.key} failed (status ${r.status}): ${r.stderr.trim().slice(0, 200)}`
      )
    }
  }

  if (toDelete.length > 0) {
    const idempotentSuffix = deleteIdempotent > 0 ? ` (${deleteIdempotent} already absent)` : ''
    console.info(
      `\n🗑  Deleted ${deleted + deleteIdempotent}/${toDelete.length} empty vars from Vercel${idempotentSuffix}`
    )
  }

  console.info(
    `\n${failed === 0 && deleteFailed === 0 ? '✅' : '⚠️ '} Pushed ${pushed}/${entries.length} vars to Vercel project "${app}" (parallel concurrency=${VERCEL_CONCURRENCY})`
  )

  failed += deleteFailed

  // ── Prune (opt-in via --prune) ─────────────────────────────
  // Inventory remote vars after the push, diff against local cascade, delete
  // anything missing locally that is NOT platform-protected. Done AFTER the
  // push so the diff includes the just-pushed keys (no false-positive deletes).
  if (flags.prune) {
    let remoteKeys: string[]
    try {
      remoteKeys = listVercelEnvKeys({
        cwd: webDir,
        vercelTarget,
        gitBranch: vercelGitBranch(env),
      })
    } catch (err) {
      console.error(
        `\n❌ [prune] Could not inventory remote vars: ${err instanceof Error ? err.message : String(err)}`
      )
      console.error(`   Skipping prune. Push itself succeeded.`)
      process.exit(failed > 0 ? 1 : 0)
    }

    const toPrune = computePruneList({
      remoteKeys,
      localKeys: Object.keys(merged),
    })

    if (toPrune.length === 0) {
      console.info(`\n🧹 [prune] No remote vars to delete — cascade matches remote inventory.`)
    } else {
      console.info(
        `\n🧹 [prune] Deleting ${toPrune.length} remote var${toPrune.length === 1 ? '' : 's'} not in local cascade:`
      )
      for (const k of toPrune) console.info(`  - ${k}`)

      // Sequential deletes (concurrency unnecessary — typically 1-5 keys).
      const pruneTasks = toPrune.map(k => async () => {
        const rmArgs = ['env', 'rm', k, vercelTarget]
        if (vercelGitBranch(env)) rmArgs.push(vercelGitBranch(env)!)
        rmArgs.push('--yes')
        return await vercelSpawn(rmArgs, webDir)
      })
      const pruneResults = await runWithConcurrency(pruneTasks, 4)
      const prunedOk = pruneResults.filter(r => r.status === 0).length
      const prunedFail = pruneResults.length - prunedOk
      console.info(
        `${prunedFail === 0 ? '✅' : '⚠️ '} [prune] Deleted ${prunedOk}/${pruneResults.length} remote vars`
      )
      // Post hacker-A3.5 (P0): previously prune failures bumped no counter
      // and process exited zero — CI marked the push as success while the
      // remote still held variables the cascade said should be gone. Fold
      // the prune fail count into the global `failed` so process.exit at
      // the end correctly signals partial-failure to CI.
      if (prunedFail > 0) {
        // Build failure records from the per-task results we have. The
        // sequential rmArgs we used earlier captures key by index.
        const pruneFailures: { key: string; status: number; stderr: string }[] = []
        pruneResults.forEach((r, i) => {
          if (r.status !== 0) {
            pruneFailures.push({
              key: toPrune[i],
              status: r.status,
              stderr: r.stderr,
            })
          }
        })
        assertNoFailedDeletes({
          failures: pruneFailures,
          label: '[prune]',
          totalAttempted: toPrune.length,
        })
      }
    }
  }

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
