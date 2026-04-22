#!/usr/bin/env tsx
/**
 * env:push:vercel — push merged (root + per-app web) env to Vercel project.
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
 * Cascade (Next.js-style overlay — lowest → highest precedence):
 *
 *   local       →  root .env.local
 *                  apps/<app>/web/.env.local
 *
 *   staging     →  root .env.local
 *                  root .env.staging                (staging overrides)
 *                  apps/<app>/web/.env.local
 *                  apps/<app>/web/.env.staging      (staging overrides)
 *
 *   production  →  root .env.local
 *                  root .env.staging
 *                  root .env.production             (final override)
 *                  apps/<app>/web/.env.local
 *                  apps/<app>/web/.env.staging
 *                  apps/<app>/web/.env.production   (final override)
 *
 *   --override KEY=VAL is applied LAST and beats every file-level value.
 *
 * .env.staging and .env.production should contain ONLY the keys that DIFFER from
 * .env.local (or from the previous layer). Duplicating base values is discouraged —
 * the cascade fills them in automatically. Missing layers are silently skipped.
 *
 * Flags:
 *   --from <env>        Use a SINGLE source env file (bypass cascade). Useful when
 *                       you want to push exactly what's in .env.local to staging
 *                       for example. Accepts: local | staging | production.
 *   --override KEY=VAL  Comma-separated KEY=VALUE pairs, applied LAST.
 *   --dry-run           Print merged vars without calling Vercel CLI.
 *
 * Final precedence (lowest → highest):
 *   root cascade < per-app cascade < --override
 *
 * Requires: Vercel CLI installed (https://vercel.com/docs/cli).
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

function checkVercelCli(): void {
  // On Windows, npm/pnpm global bins are .cmd shims — spawnSync without
  // `shell: true` can't find them on PATH.
  const result = spawnSync('vercel', ['--version'], { encoding: 'utf-8', shell: true })
  if (result.status !== 0) {
    fail('Vercel CLI not found. Install via:\n  npm i -g vercel')
  }
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
   * If provided, bypass the cascade and load a SINGLE env file level
   * (still root + per-app for that one level). Typical use: `--from local`
   * to push local values verbatim to preview.
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
  sources: Array<{ level: TargetEnv; scope: 'root' | 'app'; path: string; exists: boolean }>
}

/**
 * Merge root + per-app env files following the cascade.
 *
 * Precedence (lowest → highest):
 *   root local < root staging < root prod
 *   < per-app local < per-app staging < per-app prod
 *   < overrides
 *
 * When `fromOverride` is set, ONLY that layer is loaded (root + per-app), the
 * cascade is bypassed. This is equivalent to the legacy single-source behavior.
 */
export function loadMergedEnv(input: LoadMergedEnvInput): LoadMergedEnvResult {
  const { root, app, targetEnv, fromOverride, overrides = {}, readEnv = parseEnvFile } = input

  const layers: TargetEnv[] = fromOverride ? [fromOverride] : cascadeLayers(targetEnv)

  const merged: Record<string, string> = {}
  const sources: LoadMergedEnvResult['sources'] = []

  // 1. Root cascade (lowest precedence)
  for (const level of layers) {
    const file = `.env.${level}`
    const absPath = path.join(root, file)
    const parsed = readEnv(absPath)
    sources.push({ level, scope: 'root', path: absPath, exists: parsed !== null })
    if (!parsed) continue
    for (const [k, v] of Object.entries(parsed)) merged[k] = v
  }

  // 2. Per-app cascade (overrides root)
  for (const level of layers) {
    const file = `.env.${level}`
    const absPath = path.join(root, 'apps', app, 'web', file)
    const parsed = readEnv(absPath)
    sources.push({ level, scope: 'app', path: absPath, exists: parsed !== null })
    if (!parsed) continue
    for (const [k, v] of Object.entries(parsed)) merged[k] = v
  }

  // 3. --override flag (highest precedence, applied last)
  for (const [k, v] of Object.entries(overrides)) merged[k] = v

  return { merged, sources }
}

interface ParsedFlags {
  from?: string
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
      'Usage: pnpm env:push:vercel <app> <env> [--from <sourceEnv>] [--override KEY=val,KEY2=val2] [--dry-run]\n' +
        '  Example: pnpm env:push:vercel ezpay production\n' +
        '  Example: pnpm env:push:vercel ezpay staging --from local --override DEPLOY_ENV=staging'
    )
  }
  if (!['local', 'staging', 'production'].includes(env)) {
    fail(`Invalid env "${env}" — must be one of: local | staging | production`)
  }

  const flags = parseFlags(rest)
  if (flags.from && !['local', 'staging', 'production'].includes(flags.from)) {
    fail(`Invalid --from "${flags.from}" — must be one of: local | staging | production`)
  }

  const ROOT = findMonorepoRoot()
  const targetEnv = env as TargetEnv
  const fromOverride = flags.from as TargetEnv | undefined

  const { merged, sources } = loadMergedEnv({
    root: ROOT,
    app,
    targetEnv,
    fromOverride,
    overrides: flags.overrides,
  })

  const branchSuffix = vercelGitBranch(env) ? ` branch=${vercelGitBranch(env)}` : ''
  console.log(
    `▲ env:push:vercel — ${app}/web → ${env} (Vercel ${vercelEnvName(env)}${branchSuffix})${flags.dryRun ? ' (dry-run)' : ''}`
  )
  if (fromOverride) {
    console.log(`   source:  SINGLE layer .env.${fromOverride} (via --from, cascade bypassed)`)
  } else {
    const levels = cascadeLayers(targetEnv).join(' → ')
    console.log(`   cascade: ${levels}`)
  }
  for (const s of sources) {
    const status = s.exists ? '✓' : '·'
    console.log(`   ${status} [${s.scope}/${s.level}] ${s.path}`)
  }
  if (Object.keys(flags.overrides).length > 0) {
    console.log(`   override: ${Object.keys(flags.overrides).join(', ')}`)
  }
  console.log('')

  // At least one layer must exist (root .env.local is the baseline for any cascade)
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
  console.log(`${action} ${Object.keys(merged).length} vars to Vercel project (cwd=${webDir})...\n`)

  if (flags.dryRun) {
    for (const [k, v] of Object.entries(merged)) {
      const marker = flags.overrides[k] !== undefined ? ' [override]' : ''
      console.log(`  ${k}=${mask(v)}${marker}`)
    }
    console.log(
      `\n✅ Dry-run complete — ${Object.keys(merged).length} vars would be pushed to "${app}" (${vercelTarget})`
    )
    process.exit(0)
  }

  const gitBranch = vercelGitBranch(env)
  let pushed = 0
  let failed = 0
  for (const [k, v] of Object.entries(merged)) {
    const marker = flags.overrides[k] !== undefined ? ' [override]' : ''
    console.log(`  ${k}=${mask(v)}${marker}`)
    // Remove args — scope to the same branch the push targets (if any) so we
    // don't nuke vars on other preview branches.
    const rmArgs = ['env', 'rm', k, vercelTarget]
    if (gitBranch) rmArgs.push(gitBranch)
    rmArgs.push('--yes')

    // Add args — scope to the same branch for preview pushes, pass value +
    // --yes for non-interactive operation.
    const addArgs = ['env', 'add', k, vercelTarget]
    if (gitBranch) addArgs.push(gitBranch)
    addArgs.push('--value', v, '--yes')

    // `shell: true` for Windows compat (vercel is a .cmd shim under npm global).
    spawnSync('vercel', rmArgs, {
      cwd: webDir,
      stdio: 'ignore',
      shell: true,
    })
    const result = spawnSync('vercel', addArgs, {
      cwd: webDir,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: true,
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
}
