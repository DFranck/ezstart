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
 * Multi-project Railway support:
 *   Different apps in the monorepo live in different Railway projects (e.g.
 *   green-pulse-api in `TeamProjects`, ezauth/ezpay/ezstart/ezbill in
 *   `ezstart-apis`). The mapping app → { project, service } is declared in
 *   `scripts/env/railway-projects.ts`. Before pushing, the script automatically
 *   runs `railway link -p <project> -s <service> -e <env>` so each push targets
 *   the correct project regardless of what was previously linked locally.
 *   Adding a new app = 1 line in `RAILWAY_APP_PROJECTS`.
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
 * Value semantics (3-way, symmetric with push-vercel.ts):
 *   - `KEY` absent from every cascade layer  → no-op (variable not touched).
 *   - `KEY=` (empty string) in the cascade   → DELETE via per-key
 *                                              `railway variable delete <KEY>`
 *                                              (Railway CLI 4.x does NOT have a
 *                                              batch `--remove`; one CLI call
 *                                              per key, continue on per-key
 *                                              failure, exit 1 if any failed
 *                                              for a non-idempotent reason).
 *                                              Use this to explicitly clear a
 *                                              var on Railway. Idempotent: if
 *                                              the var doesn't exist remotely,
 *                                              the push still succeeds.
 *   - `KEY=value` in the cascade             → upsert via `railway variable set`.
 *
 * Safety guards (post-hacker-A3, 2026-06-05):
 *   - `--override KEY=` (empty value via flag) requires `--yes-i-mean-delete`
 *     in non-TTY / `--non-interactive` contexts, OR an interactive y/N prompt
 *     in a TTY. Prevents accidental DELETE on prod from a copy-paste typo.
 *   - Lines matching `^KEY=#` in any cascade file emit a non-blocking warn
 *     (dotenv treats `KEY=#TODO comment` as `{KEY: ''}` → DELETE, often
 *     unintended).
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
import * as readline from 'node:readline'
import * as dotenv from 'dotenv'
import { deleteRailwayKeys } from './railway-delete.js'
import {
  detectInlineCommentEmptyValuesFromFile,
  formatOverrideEmptyDeletePrompt,
  requireConfirmOverrideEmptyDelete,
} from './delete-guards.js'
import { getRailwayAppConfig, type RailwayAppConfig } from './railway-projects.js'
import { extractEnvFlag, isProtectedEnvKey, parseEnvArg, type TargetEnv } from './shared-flags.js'

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

/**
 * Quote a single CLI argument for safe shell execution on the current platform.
 *
 * Why this exists:
 *   - `spawnSync('railway', args, { shell: true })` on Windows JOINS args with
 *     spaces and pipes the result through cmd.exe. cmd interprets `&|<>=`
 *     specially even inside double-quotes for some characters.
 *   - Wrapping each arg in `""` keeps cmd from splitting on `&` (the most
 *     common offender — appears in MongoDB connection strings as `&w=majority`,
 *     `&appName=...`).
 *   - For double-quotes inside the value, escape as `""` (cmd convention).
 *   - On POSIX (sh/bash), wrap in single quotes and escape internal quotes.
 *
 * This is intentionally minimal — it covers the env-var values @ezstart
 * actually pushes (MongoDB URLs, JWT secrets, OAuth keys). It is NOT a
 * general-purpose shell escaper.
 */
function shellQuote(arg: string): string {
  if (process.platform === 'win32') {
    // cmd.exe: wrap in double quotes, escape inner double-quotes by doubling.
    // Note: cmd.exe metachars `&|<>` are NEUTRALIZED inside "..." (verified
    // empirically with `railway variable set "K=v&w=majority"`).
    return `"${arg.replace(/"/g, '""')}"`
  }
  // POSIX: single-quote (no expansion of $`\). Close+escape inner single-quotes.
  return `'${arg.replace(/'/g, `'\\''`)}'`
}

/**
 * Cross-platform spawnSync wrapper for the `railway` CLI.
 *
 * Why this exists:
 *   - On Windows, `railway` is a `.cmd` shim. `spawnSync('railway.cmd', ...,
 *     { shell: false })` fails with EINVAL — Node refuses to direct-spawn
 *     `.cmd` files for security reasons.
 *   - `spawnSync('railway', args, { shell: true })` works to find the shim
 *     but joins args naively, exposing values with `&|<>` to cmd.exe parsing.
 *   - Solution: build a fully-quoted command string ourselves (each arg
 *     wrapped via `shellQuote()`), then pass the WHOLE string as a single
 *     command to `shell: true`. Node treats it as `cmd /c "<our string>"` on
 *     Windows / `sh -c '<our string>'` on POSIX.
 *   - This way values like `MONGO_URL=mongodb+srv://u:p@h/db?w=majority&appName=x`
 *     survive intact (the `&` is inside our `""` so cmd doesn't split on it).
 */
function railwaySpawnSync(
  args: string[],
  opts: {
    input?: string
    stdio?: 'inherit' | 'pipe' | ['pipe', 'inherit', 'inherit'] | 'ignore'
  } = {}
) {
  const cmdLine = ['railway', ...args.map(shellQuote)].join(' ')
  return spawnSync(cmdLine, [], {
    encoding: 'utf-8',
    shell: true,
    input: opts.input,
    stdio: opts.stdio ?? ['pipe', 'inherit', 'inherit'],
  })
}

function checkRailwayCli(): void {
  const result = railwaySpawnSync(['--version'], { stdio: 'pipe' })
  if (result.status !== 0) {
    fail('Railway CLI not found. Install via:\n  npm i -g @railway/cli\n  OR  brew install railway')
  }
}

/**
 * Switch the local Railway link to the target project + service + environment.
 *
 * Railway CLI 4.x does NOT expose `--project` on `variable set`, so the only
 * way to push variables to a service in a project that isn't currently linked
 * is to call `railway link -p <project> -s <service> -e <env>` first. This
 * function does that idempotently.
 *
 * If the link command fails (project not found, service not found, missing
 * workspace permission), the function exits with a clear error message that
 * includes the project + service we tried to link to — much more actionable
 * than the generic "Service not found" the CLI emits when the linked project
 * doesn't contain the target service.
 */
function linkRailwayProject(config: RailwayAppConfig, env: TargetEnv): void {
  const args = [
    'link',
    '--project',
    config.project,
    '--service',
    config.serviceName,
    '--environment',
    env,
  ]
  if (config.workspace) {
    args.push('--workspace', config.workspace)
  }
  const result = railwaySpawnSync(args, { stdio: 'pipe' })
  if (result.status !== 0) {
    const stderr = result.stderr ?? ''
    fail(
      `Failed to link Railway project=${config.project} service=${config.serviceName} env=${env}\n` +
        `  Railway CLI exit code: ${result.status}\n` +
        `  stderr: ${stderr.trim() || '(empty)'}\n` +
        `  Hint: verify the project + service exist via \`railway list\` and ` +
        `that you are logged in via \`railway whoami\`.`
    )
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
  /**
   * When true, after pushing the merged cascade vars, the script also
   * inventories what's currently set on Railway and DELETES anything that
   * does not appear in the local cascade (except platform-protected keys
   * — see `isProtectedEnvKey()`). Off by default — opt-in only.
   */
  prune: boolean
  /**
   * Explicit operator confirmation for `--override KEY=` (empty value)
   * DELETE intent in non-interactive contexts. Required when stdin is not
   * a TTY OR when `--non-interactive` is set AND `--override KEY=` was
   * provided. See V5 in tmp/hack-a3-empty-delete.md.
   */
  yesIMeanDelete: boolean
  /**
   * Force non-interactive flow (no TTY prompts). When combined with
   * `--override KEY=` (empty), the operator MUST also pass
   * `--yes-i-mean-delete` or the push aborts.
   */
  nonInteractive: boolean
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
  const result: ParsedFlags = {
    overrides: {},
    includeBlocked: new Set(),
    dryRun: false,
    prune: false,
    yesIMeanDelete: false,
    nonInteractive: false,
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
    } else if (flag === '--prune') {
      result.prune = true
    } else if (flag === '--yes-i-mean-delete') {
      result.yesIMeanDelete = true
    } else if (flag === '--non-interactive') {
      result.nonInteractive = true
    } else {
      fail(`Unknown flag "${flag}"`)
    }
  }
  return result
}

// ────────────────────────────────────────────────────────────
// Prune logic — list remote keys & diff against local cascade
// ────────────────────────────────────────────────────────────

/**
 * Inventory env vars currently set on Railway for a given service+env.
 *
 * Strategy : Railway CLI 4.x supports `railway variables --service <s>
 * --environment <e> --json` which returns an object whose keys are env var
 * names. Older CLIs return a human-readable table — we fallback to parsing
 * KEY=VALUE lines. Both shapes are handled.
 *
 * The VALUE side is intentionally ignored — for prune we only care about
 * the keys (we are about to delete, not re-add).
 */
export function parseRailwayVariables(stdout: string): string[] {
  const trimmed = stdout.trim()
  if (!trimmed) return []
  // Try JSON first (CLI 4.x with --json).
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>
      return Object.keys(obj).sort()
    } catch {
      // fall through to table parser
    }
  }
  // Table / KEY=VALUE fallback. Each line either has `KEY=VALUE` or a table
  // row starting with a JS-identifier key. Skip blank lines + table headers.
  const keys = new Set<string>()
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const eq = line.indexOf('=')
    if (eq > 0) {
      const k = line.slice(0, eq).trim()
      if (/^[A-Z_][A-Z0-9_]*$/i.test(k)) keys.add(k)
      continue
    }
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s/)
    if (m) keys.add(m[1])
  }
  return Array.from(keys).sort()
}

export interface ListRailwayEnvOptions {
  service: string
  env: TargetEnv
  /** Test seam : swap the underlying spawn for a mock. */
  exec?: (args: string[]) => { status: number; stdout: string; stderr: string }
}

/**
 * Run `railway variables` and parse the inventory of var names. Throws on
 * non-zero exit so caller can present a clear error.
 */
export function listRailwayEnvKeys(opts: ListRailwayEnvOptions): string[] {
  const args = ['variables', '--service', opts.service, '--environment', opts.env, '--json']
  const exec = opts.exec ?? defaultRailwayExec
  const result = exec(args)
  if (result.status !== 0) {
    // Some CLI versions don't support --json — retry without it.
    const fallback = exec(['variables', '--service', opts.service, '--environment', opts.env])
    if (fallback.status !== 0) {
      throw new Error(
        `railway variables exited with status ${fallback.status} : ${fallback.stderr.trim() || '(empty)'}`
      )
    }
    return parseRailwayVariables(fallback.stdout)
  }
  return parseRailwayVariables(result.stdout)
}

function defaultRailwayExec(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = railwaySpawnSync(args, { stdio: 'pipe' })
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

/**
 * Prompt the operator interactively to confirm a DELETE intent triggered
 * via `--override KEY=` (empty value). Returns true only when the operator
 * types `yes` (case-insensitive, leading/trailing whitespace stripped).
 *
 * Anything else (`y`, `Y`, `YES `, blank line, `no`, Ctrl-C) returns false
 * and the push aborts. The check is intentionally strict because the
 * downside is permanent secret deletion on the remote.
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
  /** Keys discovered on the remote (Railway service for the target env). */
  remoteKeys: readonly string[]
  /** Keys present in the merged local cascade (will be pushed). */
  localKeys: readonly string[]
}

/**
 * Compute the list of keys that would be pruned : present on remote, not in
 * local cascade, AND not platform-protected. Pure function — easy to test
 * exhaustively without a live Railway service.
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
      'Usage: pnpm env:push:railway <app> <env> [--from <sourceEnv>] [--override KEY=val,KEY2=val2] [--dry-run] [--prune]\n' +
        '         pnpm env:push:railway <app> --env=<env> ...   (anti-typo alias)\n' +
        '  Example: pnpm env:push:railway ezauth staging\n' +
        '  Example: pnpm env:push:railway ezpay --env=staging --prune --dry-run\n' +
        '  Example: pnpm env:push:railway ezpay staging --from local --override DEPLOY_ENV=staging'
    )
  }

  // Same parsing strategy as push-vercel.ts — extract --env=<x> first, then
  // take the leftover non-flag head as the positional <env> if any.
  const rest = [...restRaw]
  const envFlagValue = extractEnvFlag(rest)
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

  // ── N1 guard: warn on KEY=#comment lines that dotenv treats as empty ────
  // A line like `DATABASE_URL=#TODO put real prod URL` is parsed by dotenv as
  // `{ DATABASE_URL: '' }` (the `#` starts an inline comment). Downstream that
  // means DELETE — usually NOT what the operator meant. Scan raw bytes of
  // every cascade file we read and warn (non-blocking) so the operator can
  // catch the typo before the push touches production.
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

  // ── V5 guard: confirm before DELETE via `--override KEY=` (empty value) ──
  // `--override KEY=` is a copy-paste-prone surface: missing value → empty
  // string → DELETE intent. In non-TTY contexts the operator MUST pass
  // `--yes-i-mean-delete` explicitly. In a TTY we prompt interactively.
  const emptyOverrideKeys = Object.entries(flags.overrides)
    .filter(([, v]) => v === '')
    .map(([k]) => k)
  if (!flags.dryRun && emptyOverrideKeys.length > 0) {
    const guard = requireConfirmOverrideEmptyDelete({
      emptyOverrideKeys,
      yesIMeanDelete: flags.yesIMeanDelete,
      nonInteractive: flags.nonInteractive,
    })
    if (!guard.proceed) {
      if (guard.requiresInteractivePrompt) {
        const accepted = await promptYesNoStrict(formatOverrideEmptyDeletePrompt(emptyOverrideKeys))
        if (!accepted) {
          fail(`Aborted by operator — type \`yes\` exactly to confirm DELETE intent next time.`)
        }
      } else {
        fail(guard.reason ?? 'Override DELETE intent requires explicit confirmation.')
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

  // Look up which Railway project + service this app maps to. Fail loudly if
  // the app isn't in the map — silently defaulting to `<app>-api` would mask
  // typos and route to the wrong project.
  const railwayConfig = getRailwayAppConfig(app)
  if (!railwayConfig) {
    fail(
      `No Railway project mapping for app="${app}".\n` +
        `  Add it to scripts/env/railway-projects.ts:\n` +
        `    ${app}: { project: '<railway-project-name>', serviceName: '${app}-api' },\n` +
        `  See \`railway list\` for available projects.`
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
  // Service name + Railway project come from RAILWAY_APP_PROJECTS (see
  // scripts/env/railway-projects.ts). Different apps live in different
  // Railway projects; the convention is usually <app>-api but the map is the
  // source of truth.
  const service = railwayConfig.serviceName
  const action = flags.dryRun ? 'Would push' : 'Pushing'
  console.info(
    `${action} ${Object.keys(merged).length} vars to Railway project="${railwayConfig.project}" service="${service}" env="${env}"...\n`
  )

  // Log (with masking) what we will push before any actual CLI call. Empty
  // values are flagged as DELETE (operator explicitly cleared them) — see the
  // PUSH-VERCEL-EMPTY-AS-DELETE-001 fix below for rationale.
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

  if (flags.dryRun) {
    if (dryRunDeleteCount > 0) {
      console.info(
        `\n🗑  Would DELETE ${dryRunDeleteCount} empty var${dryRunDeleteCount === 1 ? '' : 's'} from Railway`
      )
    }
    if (flags.prune) {
      // Inventory remote (read-only) and compute would-be-pruned list.
      try {
        // Need to link first to make the variables call target the right project.
        // Linking is read-only metadata change; safe in dry-run.
        linkRailwayProject(railwayConfig, targetEnv)
        const remoteKeys = listRailwayEnvKeys({ service, env: targetEnv })
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
            `\n🧹 [prune dry-run] ${toPrune.length} remote var${toPrune.length === 1 ? '' : 's'} would be DELETED from Railway:`
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
        ` on project="${railwayConfig.project}" service="${service}" env="${env}"`
    )
    process.exit(0)
  }

  // Switch the local Railway link to the target project + service + env BEFORE
  // pushing. The CLI 4.x doesn't expose `--project` on `variable set`, so this
  // is the only way to route a push to a service that lives in a project other
  // than the one currently linked. Idempotent — re-linking to the already
  // linked project is a no-op.
  console.info(`🔗 Linking Railway: project=${railwayConfig.project} service=${service} env=${env}`)
  linkRailwayProject(railwayConfig, targetEnv)

  // Batch ALL vars into ONE `railway variable set` call. Rationale:
  //   - Railway CLI 4.x supports `railway variable set KEY1=VAL1 KEY2=VAL2 ...`
  //     in a single invocation (see `railway variable set --help`). One call
  //     for 21 vars is ~30x faster than 21 sequential calls.
  //   - Cross-platform argv safety via `railwaySpawnSync()` which routes
  //     through `cmd.exe /c` on Windows with `shell: false`. Node escapes argv
  //     for the OS without going through a shell that re-interprets `&|><=`.
  //     This is safe for values like `MONGO_URL=mongodb+srv://u:p&w@host`.
  //   - `--skip-deploys` triggers ZERO Railway redeploys on this call. We let
  //     Railway redeploy naturally on the next git push, OR the operator can
  //     trigger a redeploy manually. Skipping deploys avoids redundant builds
  //     when push-all.ts runs across many services.
  //   - Empty values are 3-way partitioned :
  //       `v === ''`        → DELETE via `railway variables --remove` (operator
  //                            explicitly cleared the value in the cascade,
  //                            symmetric with the Vercel script — see
  //                            PUSH-VERCEL-EMPTY-AS-DELETE-001 in BACKLOG).
  //                            Previously empty=skip → manual cleanup required.
  //       value present     → upsert via `railway variable set KEY=VAL`.
  //       absent from cascade → never reached (filter is by value).
  //   - Windows command-line max length is ~8KB. With 21 vars × ~250 chars
  //     each we're at ~5KB — safely under the limit. If we ever bump into
  //     the limit, switch to chunking (e.g. 50 vars per call).
  const allEntries = Object.entries(merged)
  const toDelete: string[] = []
  const entries: Array<[string, string]> = []
  for (const [k, v] of allEntries) {
    if (v === '') {
      toDelete.push(k)
    } else {
      entries.push([k, v])
    }
  }

  if (entries.length === 0 && toDelete.length === 0) {
    console.info(`\n⚠️  Nothing to push (no vars in cascade).`)
    process.exit(0)
  }

  // Build single batch: railway variable set KEY1=VAL1 KEY2=VAL2 ... \
  //   --service <s> --environment <e> --skip-deploys
  if (entries.length > 0) {
    const setArgs: string[] = ['variable', 'set']
    for (const [k, v] of entries) {
      setArgs.push(`${k}=${v}`)
    }
    setArgs.push('--service', service, '--environment', env, '--skip-deploys')

    const result = railwaySpawnSync(setArgs, { stdio: ['pipe', 'inherit', 'inherit'] })
    if (result.status !== 0) {
      fail(
        `Railway CLI exited with status ${result.status} during batch set of ${entries.length} vars\n` +
          `  Hint: if a single var has invalid content, retry with --dry-run to inspect, or split into smaller batches.`
      )
    }

    console.info(
      `\n✅ Pushed ${entries.length} vars to Railway project="${railwayConfig.project}" service="${service}" env="${env}" in 1 batch call`
    )
  }

  // Empty-string entries → DELETE on Railway. Symmetric with the Vercel side
  // (PUSH-VERCEL-EMPTY-AS-DELETE-001). Operator sets `KEY=` (or `KEY=""`) in
  // the cascade to explicitly clear a var on the remote.
  //
  // 2026-06-05 — post-hacker-A3 fix (V1):
  //   The previous batch `railway variables --remove K1 K2 ...` call DOES NOT
  //   EXIST in Railway CLI 4.x — the CLI returns `error: unexpected argument
  //   '--remove' found` and exits non-zero. Verified empirically against
  //   `railway --version` = 4.35.0.
  //
  //   The correct CLI 4.x API is `railway variable delete <KEY>` (subcommand
  //   `delete`, singular `variable`, ONE key per call). We loop one CLI call
  //   per key via deleteRailwayKeys() (see scripts/env/railway-delete.ts).
  //   Per-key failures are collected; the loop continues so a single bad key
  //   doesn't block the rest. Process exit code is 1 iff at least one delete
  //   legitimately failed (NOT counting "already absent" idempotent OKs).
  if (toDelete.length > 0) {
    const { deleted, idempotent, failed, results } = deleteRailwayKeys({
      keys: toDelete,
      service,
      env,
      exec: defaultRailwayExec,
    })
    if (deleted + idempotent > 0) {
      const idempotentSuffix = idempotent > 0 ? ` (${idempotent} already absent)` : ''
      console.info(
        `\n🗑  Deleted ${deleted + idempotent}/${toDelete.length} empty var${toDelete.length === 1 ? '' : 's'} from Railway${idempotentSuffix}`
      )
    }
    if (failed > 0) {
      console.error(`\n❌ ${failed}/${toDelete.length} Railway deletes failed:`)
      for (const r of results) {
        if (r.status === 0) continue
        console.error(`     ↳ ${r.key} (status ${r.status}): ${r.stderr.trim().slice(0, 200)}`)
      }
      process.exit(1)
    }
  }

  // ── Prune (opt-in via --prune) ─────────────────────────────
  // Inventory remote vars after the push, diff against local cascade, delete
  // anything missing locally that is NOT platform-protected.
  if (flags.prune) {
    let remoteKeys: string[]
    try {
      remoteKeys = listRailwayEnvKeys({ service, env: targetEnv })
    } catch (err) {
      console.error(
        `\n❌ [prune] Could not inventory remote vars: ${err instanceof Error ? err.message : String(err)}`
      )
      console.error(`   Skipping prune. Push itself succeeded.`)
      process.exit(0)
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

      // Same per-key delete loop as the empty=DELETE branch above. Railway CLI
      // 4.x has no batch remove — one `railway variable delete <K>` per key
      // (see deleteRailwayKeys() in scripts/env/railway-delete.ts).
      const pruneResult = deleteRailwayKeys({
        keys: toPrune,
        service,
        env,
        exec: defaultRailwayExec,
      })
      if (pruneResult.failed > 0) {
        console.error(
          `\n❌ [prune] ${pruneResult.failed}/${toPrune.length} Railway deletes failed:`
        )
        for (const r of pruneResult.results) {
          if (r.status === 0) continue
          console.error(`     ↳ ${r.key} (status ${r.status}): ${r.stderr.trim().slice(0, 200)}`)
        }
      } else {
        const okTotal = pruneResult.deleted + pruneResult.idempotent
        const idempotentSuffix =
          pruneResult.idempotent > 0 ? ` (${pruneResult.idempotent} already absent)` : ''
        console.info(
          `✅ [prune] Removed ${okTotal}/${toPrune.length} remote vars${idempotentSuffix}`
        )
      }
    }
  }
}

if (isDirectRun) {
  main().catch(err => {
    console.error('❌ Uncaught error in push-railway:', err)
    process.exit(1)
  })
}
