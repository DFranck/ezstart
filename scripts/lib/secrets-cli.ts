/**
 * Shared helpers for `secrets-push` / `secrets-pull` / `secrets-audit`.
 *
 * Provides:
 *   - flag parsing (--env, --dry-run, --vercel-only, --railway-only, --vars, --strict, --json)
 *   - root env file load/save (masked logging)
 *   - Railway / Vercel CLI wrappers (link + variable get/set)
 *   - VAR_TARGETS → (railway service | vercel project) resolution
 *
 * All values printed to stdout are masked for sensitive keys.
 */

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  VAR_TARGETS,
  resolveTargetApps,
  type VarName,
  type VarTarget,
  type AppName,
  URLS,
  appToEnvSuffix,
} from '@ezstart/config'
import { SHARED_REQUIRED, ENV_MANIFESTS, hasEnvManifest } from '@ezstart/config'

// ─────────────────────────────────────────────────────────────
// Paths + env file names
// ─────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const ROOT = resolve(__dirname, '..', '..')

export type EnvName = 'local' | 'staging' | 'production'

export function envFileName(env: EnvName): string {
  return `.env.${env}`
}

export function envFilePath(env: EnvName): string {
  return resolve(ROOT, envFileName(env))
}

// ─────────────────────────────────────────────────────────────
// Flag parsing
// ─────────────────────────────────────────────────────────────

export type CommonFlags = {
  dryRun: boolean
  vercelOnly: boolean
  railwayOnly: boolean
  env: EnvName
  vars: readonly string[] | null
  strict: boolean
  json: boolean
  merge: boolean
  // Terraform-style phase flags (push only — ignored elsewhere)
  preflight: boolean
  plan: boolean
  canary: string | null
  confirm: boolean
  confirmDelete: boolean
  fromBackup: string | null
}

export function parseFlags(argv: readonly string[]): CommonFlags {
  const has = (name: string): boolean => argv.includes(name)
  const valueOf = (name: string): string | null => {
    const idx = argv.indexOf(name)
    if (idx < 0 || idx + 1 >= argv.length) return null
    return argv[idx + 1] ?? null
  }

  const envRaw = valueOf('--env') ?? 'production'
  if (envRaw !== 'local' && envRaw !== 'staging' && envRaw !== 'production') {
    throw new Error(`Invalid --env "${envRaw}". Expected local|staging|production.`)
  }
  const env: EnvName = envRaw

  const varsRaw = valueOf('--vars')
  const vars =
    varsRaw !== null
      ? varsRaw
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : null

  return {
    dryRun: has('--dry-run'),
    vercelOnly: has('--vercel-only'),
    railwayOnly: has('--railway-only'),
    env,
    vars,
    strict: has('--strict'),
    json: has('--json'),
    merge: has('--merge'),
    preflight: has('--preflight'),
    plan: has('--plan'),
    canary: valueOf('--canary'),
    confirm: has('--confirm'),
    confirmDelete: has('--confirm-delete'),
    fromBackup: valueOf('--from-backup'),
  }
}

// ─────────────────────────────────────────────────────────────
// .env parsing + rendering
// ─────────────────────────────────────────────────────────────

export function parseEnvContent(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

export function parseEnvFile(filePath: string): Record<string, string> | null {
  if (!existsSync(filePath)) return null
  return parseEnvContent(readFileSync(filePath, 'utf8'))
}

export function renderEnvFile(
  vars: Record<string, string>,
  opts: { header?: string } = {}
): string {
  const lines: string[] = []
  if (opts.header) {
    for (const l of opts.header.split('\n')) lines.push(`# ${l}`)
    lines.push('')
  }
  for (const [key, value] of Object.entries(vars)) {
    lines.push(`${key}=${value}`)
  }
  lines.push('')
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────
// Masking
// ─────────────────────────────────────────────────────────────

const SENSITIVE_RE = /(SECRET|KEY|TOKEN|PASSWORD|DSN|MONGO_URL|JWT_SECRET|PRIVATE)/i

export function mask(value: string | undefined | null): string {
  if (value === undefined || value === null) return '(undefined)'
  if (value === '') return '(empty)'
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

export function display(key: string, value: string | undefined | null): string {
  if (!value) return mask(value)
  return SENSITIVE_RE.test(key) ? mask(value) : mask(value)
}

// ─────────────────────────────────────────────────────────────
// Target resolution
// ─────────────────────────────────────────────────────────────

export type RailwayTarget = {
  kind: 'railway'
  app: AppName
  service: string
  project: string
}

export type VercelTarget = {
  kind: 'vercel'
  app: AppName
  project: string
}

export type DeployTarget = RailwayTarget | VercelTarget

/**
 * Railway services keyed by AppName.
 * Kept in sync with the monorepo's deploy topology.
 */
const RAILWAY_BY_APP: Partial<Record<AppName, { service: string; project: string }>> = {
  ezauth: { service: 'ezauth-api', project: 'ezstart-apis' },
  ezbill: { service: 'ezbill-api', project: 'ezstart-apis' },
  ezpay: { service: 'ezpay-api', project: 'ezstart-apis' },
  ezstart: { service: 'ezstart-api', project: 'ezstart-apis' },
  'gacha-analyzer': { service: 'gacha-analyzer-api', project: 'ezstart-apis' },
  'green-pulse': { service: 'greenpulse-api', project: 'TeamProjects' },
  // fengshui / asc-tcd have no API service
}

const VERCEL_PROJECT_BY_APP: Record<AppName, string> = {
  ezstart: 'web-ezstart',
  ezauth: 'web-ezauth',
  ezbill: 'web-ezbill',
  ezpay: 'web-ezpay',
  'green-pulse': 'web-green-pulse',
  fengshui: 'web-fengshui',
  'asc-tcd': 'web-asc-tcd',
  'gacha-analyzer': 'web-gacha-analyzer',
}

export function allAppNames(): readonly AppName[] {
  return Object.keys(URLS) as AppName[]
}

export function railwayTargetForApp(app: AppName): RailwayTarget | null {
  const meta = RAILWAY_BY_APP[app]
  if (!meta) return null
  return { kind: 'railway', app, service: meta.service, project: meta.project }
}

export function vercelTargetForApp(app: AppName): VercelTarget {
  return { kind: 'vercel', app, project: VERCEL_PROJECT_BY_APP[app] }
}

export function targetLabel(t: DeployTarget): string {
  return t.kind === 'railway' ? `railway/${t.service}` : `vercel/${t.project}`
}

/**
 * Resolve the full push plan for a root source map.
 *
 * For every (var, target) pair, emits the EXPORTED key + EXPORTED value that
 * should land on the platform — already stripped of suffix / resolved from
 * templates / filtered by layer.
 */
export type PushEntry = {
  target: DeployTarget
  exportedKey: string
  value: string
  rootKey: string // for logging
  varName: VarName
}

export function buildPushPlan(
  source: Record<string, string>,
  opts: {
    env: EnvName
    restrict?: readonly string[] | null
    includeRailway: boolean
    includeVercel: boolean
  }
): readonly PushEntry[] {
  const plan: PushEntry[] = []
  const allApps = allAppNames()
  const restrict = opts.restrict
  const envSuffix: 'dev' | 'staging' | 'prod' =
    opts.env === 'local' ? 'dev' : opts.env === 'staging' ? 'staging' : 'prod'

  for (const rawName of Object.keys(VAR_TARGETS)) {
    const varName = rawName as VarName
    const target = VAR_TARGETS[varName] satisfies VarTarget

    // --vars filter (case-sensitive match on declared var name)
    if (restrict && !restrict.includes(varName)) continue

    // ── Suffixed vars (SENTRY_DSN → SENTRY_DSN_EZAUTH per app) ──
    if (target.suffixed) {
      const apiApps = resolveTargetApps(varName, allApps, { layer: 'api' })
      for (const app of apiApps) {
        if (!opts.includeRailway) continue
        const rw = railwayTargetForApp(app)
        if (!rw) continue
        const rootKey = `${varName}_${appToEnvSuffix(app)}`
        const value = source[rootKey]
        if (!value) continue
        plan.push({
          target: rw,
          exportedKey: varName, // strip suffix on the platform
          value,
          rootKey,
          varName,
        })
      }
      continue
    }

    // ── Templated vars (MONGO_URL with {app}/{env}) ──
    if (target.template) {
      const tpl = source[varName]
      if (!tpl) continue
      const resolveTpl = (app: AppName): string =>
        tpl.replace(/\{app\}/g, app).replace(/\{env\}/g, envSuffix)

      if (opts.includeRailway) {
        const apiApps = resolveTargetApps(varName, allApps, { layer: 'api' })
        for (const app of apiApps) {
          const rw = railwayTargetForApp(app)
          if (!rw) continue
          plan.push({
            target: rw,
            exportedKey: varName,
            value: resolveTpl(app),
            rootKey: varName,
            varName,
          })
        }
      }

      if (opts.includeVercel) {
        const webApps = resolveTargetApps(varName, allApps, {
          layer: 'web',
          withWebOverrides: true,
        })
        for (const app of webApps) {
          const vc = vercelTargetForApp(app)
          plan.push({
            target: vc,
            exportedKey: varName,
            value: resolveTpl(app),
            rootKey: varName,
            varName,
          })
        }
      }
      continue
    }

    // ── Plain vars ──
    const value = source[varName]
    if (value === undefined || value === '') continue

    if (opts.includeRailway) {
      const apiApps = resolveTargetApps(varName, allApps, { layer: 'api' })
      for (const app of apiApps) {
        const rw = railwayTargetForApp(app)
        if (!rw) continue
        plan.push({ target: rw, exportedKey: varName, value, rootKey: varName, varName })
      }
    }
    if (opts.includeVercel) {
      const webApps = resolveTargetApps(varName, allApps, {
        layer: 'web',
        withWebOverrides: true,
      })
      for (const app of webApps) {
        const vc = vercelTargetForApp(app)
        plan.push({ target: vc, exportedKey: varName, value, rootKey: varName, varName })
      }
    }
  }

  return plan
}

/**
 * Warn about vars present in the local source that are NOT declared in
 * VAR_TARGETS. These are passed through untouched (no push).
 */
export function findUnknownVars(source: Record<string, string>): string[] {
  const known = new Set<string>(Object.keys(VAR_TARGETS))
  const suffixed: VarName[] = (Object.keys(VAR_TARGETS) as VarName[]).filter(
    k => VAR_TARGETS[k].suffixed === true
  )
  return Object.keys(source).filter(k => {
    if (known.has(k)) return false
    // SENTRY_DSN_EZAUTH matches the suffixed family
    for (const base of suffixed) {
      if (k.startsWith(`${base}_`)) return false
    }
    // Platform-injected vars are never user-set, ignore them entirely
    if (isPlatformVar(k)) return false
    return true
  })
}

// ─────────────────────────────────────────────────────────────
// Platform-injected env vars filter
// ─────────────────────────────────────────────────────────────

/**
 * Platform-injected env var patterns (Vercel + Railway + tooling).
 * These are set by the hosting platform at build/runtime, never by the user.
 * The sync scripts ignore them on both sides (pull / push / audit).
 *
 * IMPORTANT: `RAILWAY_TOKEN` is user-set (for ezstart monitoring), not
 * platform-injected — it is NOT matched here because we only strip vars
 * that follow strict prefixes like `RAILWAY_PROJECT_*`, `RAILWAY_SERVICE_*`,
 * etc. `RAILWAY_TOKEN` does not match any of these patterns.
 */
export const PLATFORM_VAR_PATTERNS: readonly RegExp[] = [
  // Vercel platform
  /^VERCEL$/,
  /^VERCEL_ENV$/,
  /^VERCEL_URL$/,
  /^VERCEL_BRANCH_URL$/,
  /^VERCEL_DEPLOYMENT_ID$/,
  /^VERCEL_PROJECT_.+$/,
  /^VERCEL_REGION$/,
  /^VERCEL_TARGET_ENV$/,
  /^VERCEL_OIDC_TOKEN$/,
  /^VERCEL_GIT_.+$/,
  // Turbo / Nx tooling
  /^NX_DAEMON$/,
  /^TURBO_.+$/,
  // Railway platform (but NOT user tokens — those are namespaced)
  /^RAILWAY_PROJECT_.+$/,
  /^RAILWAY_SERVICE_.+$/,
  /^RAILWAY_ENVIRONMENT.*$/,
  /^RAILWAY_DEPLOYMENT.+$/,
  /^RAILWAY_PRIVATE_DOMAIN$/,
  /^RAILWAY_PUBLIC_DOMAIN$/,
  /^RAILWAY_STATIC_URL$/,
  /^RAILWAY_REPLICA_.+$/,
  /^RAILWAY_GIT_.+$/,
  /^RAILWAY_RUN_.+$/,
  /^RAILWAY_BETA_.+$/,
  /^RAILWAY_VOLUME_.+$/,
  // Build tooling
  /^NIXPACKS_.+$/,
  /^NODE_VERSION$/,
  /^PNPM_HOME$/,
  /^PNPM_VERSION$/,
  /^NPM_.+$/,
  /^YARN_.+$/,
  // System
  /^PATH$/,
  /^HOME$/,
  /^USER$/,
  /^SHELL$/,
  /^PWD$/,
  /^LANG$/,
  /^TZ$/,
  // Runtime-injected (Railway/Vercel set these automatically per deploy env)
  /^NODE_ENV$/,
]

/**
 * Returns `true` when the env var name is injected by the hosting platform
 * (Vercel/Railway) or by the local build tooling (Turbo/Nx/Nixpacks/pnpm).
 *
 * These vars must never be written to a local `.env.*` file (pull), never
 * sent to a platform (push), and never reported as drift (audit).
 */
export function isPlatformVar(name: string): boolean {
  return PLATFORM_VAR_PATTERNS.some(re => re.test(name))
}

// ─────────────────────────────────────────────────────────────
// CLI invocations (Railway + Vercel)
// ─────────────────────────────────────────────────────────────

export function cliAvailable(cmd: string): boolean {
  const r = spawnSync(cmd, ['--version'], { stdio: 'pipe', shell: true })
  return r.status === 0
}

export type ExecResult = {
  ok: boolean
  stdout: string
  stderr: string
  status: number | null
}

/**
 * On Windows, `spawnSync(..., { shell: true })` routes every arg through
 * cmd.exe, which DROPS empty-string args entirely (`foo "" bar` → `foo bar`).
 * Some CLIs (notably `vercel env add <name> <environment> <gitbranch>`)
 * rely on positional empty-string to mean "default / all branches".
 * Emit `""` verbatim in that case so cmd.exe preserves the positional.
 */
function normalizeShellArgs(args: readonly string[]): readonly string[] {
  if (process.platform !== 'win32') return args
  return args.map(a => (a === '' ? '""' : a))
}

export function execCapture(
  cmd: string,
  args: readonly string[],
  opts: { cwd?: string; timeoutMs?: number; input?: string } = {}
): ExecResult {
  const r = spawnSync(cmd, normalizeShellArgs(args), {
    cwd: opts.cwd ?? ROOT,
    shell: true,
    timeout: opts.timeoutMs ?? 60_000,
    input: opts.input,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const stdout = r.stdout ? r.stdout.toString('utf8') : ''
  const stderr = r.stderr ? r.stderr.toString('utf8') : ''
  return { ok: r.status === 0, stdout, stderr, status: r.status }
}

// ─────────────────────────────────────────────────────────────
// Railway helpers
// ─────────────────────────────────────────────────────────────

export function railwayLink(t: RailwayTarget, envName: EnvName): ExecResult {
  return execCapture(
    'railway',
    ['link', '-p', t.project, '-s', t.service, '-e', envName === 'local' ? 'production' : envName],
    { timeoutMs: 20_000 }
  )
}

/**
 * Set a Railway variable by piping the value via stdin.
 *
 * Why `--stdin` + input (not `KEY=VALUE` inline):
 *   - On Windows, `spawnSync(..., { shell: true })` routes through cmd.exe
 *     which interprets `&`, `|`, `<`, `>`, `^` as shell metacharacters.
 *     Values like `mongodb+srv://u:p@h/db?retryWrites=true&w=majority` are
 *     truncated at the first `&` and cmd.exe tries to execute `w=majority`
 *     as a command (`'w' is not recognized as an internal or external command`).
 *   - `railway variable set --stdin KEY` reads the value from process stdin,
 *     bypassing every shell quoting/escaping concern, on every platform.
 *
 * Source: https://docs.railway.app/reference/cli-api#variable-set
 */
export function railwaySetVar(key: string, value: string): ExecResult {
  return execCapture('railway', ['variable', 'set', '--stdin', key], {
    timeoutMs: 30_000,
    input: value,
  })
}

export function railwayDeleteVar(key: string): ExecResult {
  return execCapture('railway', ['variable', 'delete', key], {
    timeoutMs: 30_000,
  })
}

export function railwayListVars(): ExecResult {
  return execCapture('railway', ['variables', '--kv'], { timeoutMs: 30_000 })
}

// ─────────────────────────────────────────────────────────────
// Vercel helpers
// ─────────────────────────────────────────────────────────────

function vercelEnvTarget(env: EnvName): 'development' | 'preview' | 'production' {
  if (env === 'local') return 'development'
  if (env === 'staging') return 'preview'
  return 'production'
}

function vercelScope(): string | null {
  return (
    process.env.VERCEL_SCOPE ?? process.env.VERCEL_TEAM_SLUG ?? process.env.VERCEL_TEAM_ID ?? null
  )
}

export function vercelLink(t: VercelTarget, cwd: string): ExecResult {
  const scope = vercelScope()
  const args = ['link', '-p', t.project, '--yes', '--cwd', cwd]
  if (scope) {
    args.push('--scope', scope)
  }
  return execCapture('vercel', args, { timeoutMs: 30_000 })
}

export function vercelEnvPull(file: string, envName: EnvName, cwd: string): ExecResult {
  const target = vercelEnvTarget(envName)
  return execCapture(
    'vercel',
    ['env', 'pull', file, `--environment=${target}`, '--yes', '--cwd', cwd],
    { timeoutMs: 60_000 }
  )
}

export function vercelEnvRm(key: string, envName: EnvName, cwd: string): ExecResult {
  const target = vercelEnvTarget(envName)
  const scope = vercelScope()
  const args = ['env', 'rm', key, target, '--yes', '--cwd', cwd]
  if (scope) args.push('--scope', scope)
  return execCapture('vercel', args, { timeoutMs: 30_000 })
}

/**
 * Add an env var to a Vercel project.
 *
 * Why stdin (not `--value`):
 *   - On Windows, `spawnSync(..., { shell: true })` routes every arg through
 *     cmd.exe. Values containing `&`, `|`, `<`, `>`, `^` (e.g. MongoDB SRV
 *     connection strings with `?retryWrites=true&w=majority`) are interpreted
 *     as shell metacharacters and the command is truncated.
 *   - `vercel env add <name> <environment> <gitbranch> < <file>` reads the
 *     value from stdin instead, bypassing shell quoting entirely.
 *   - Empty gitbranch positional (`""`) is still required for `preview`
 *     in non-interactive mode (CLI 50+). `normalizeShellArgs()` maps `''`
 *     to `'""'` on Windows so cmd.exe preserves it.
 *
 * Source: https://vercel.com/docs/cli/env (vercel env add [name] [environment] [gitbranch] < [file])
 */
export function vercelEnvAdd(
  key: string,
  value: string,
  envName: EnvName,
  cwd: string
): ExecResult {
  const target = vercelEnvTarget(envName)
  const scope = vercelScope()
  // Positional gitbranch="" = "all preview branches" / no-op for dev+prod
  const args = ['env', 'add', key, target, '', '--force', '--yes', '--cwd', cwd]
  if (scope) args.push('--scope', scope)
  return execCapture('vercel', args, { timeoutMs: 30_000, input: value })
}

// ─────────────────────────────────────────────────────────────
// Backup helper
// ─────────────────────────────────────────────────────────────

export function backupEnvFile(env: EnvName): string | null {
  const src = envFilePath(env)
  if (!existsSync(src)) return null
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = resolve(ROOT, 'tmp')
  mkdirSync(dir, { recursive: true })
  const dst = resolve(dir, `secrets-pull-backup-${ts}.env.${env}`)
  copyFileSync(src, dst)
  return dst
}

export function writeEnvFile(env: EnvName, vars: Record<string, string>, header: string): void {
  const content = renderEnvFile(vars, { header })
  writeFileSync(envFilePath(env), content, { encoding: 'utf8' })
}

// ─────────────────────────────────────────────────────────────
// Logging helpers (scripts only — no @ezstart/logger dependency)
// ─────────────────────────────────────────────────────────────

export function say(msg = ''): void {
  process.stdout.write(`${msg}\n`)
}

export function relPath(p: string): string {
  return relative(ROOT, p) || p
}

// ─────────────────────────────────────────────────────────────
// Preflight validation
// ─────────────────────────────────────────────────────────────

/**
 * Placeholder detection patterns. A value matching ANY of these is considered
 * a template leftover (never intended for real deployment).
 */
const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /^<[A-Z0-9_\s-]+>$/i, // <PASTE_HERE>
  /^your[-_\s]?/i, // your-secret / your_secret / yoursecret
  /^changeme$/i,
  /^change[-_]?me$/i,
  /^xxx+$/i,
  /^placeholder$/i,
  /^todo$/i,
  /^tbd$/i,
  /^replace[-_]?me$/i,
  /\*{3,}/, // sky***4s7 masks
]

export type PreflightIssue = {
  kind:
    | 'placeholder'
    | 'empty'
    | 'missing_required'
    | 'invalid_template'
    | 'invalid_format'
    | 'stale_backup'
  key: string
  detail: string
}

export function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return true
  return PLACEHOLDER_PATTERNS.some(re => re.test(trimmed))
}

/**
 * Validate format rules for well-known var families.
 *
 * Returns an array of issues (never throws). Unknown vars pass through silently.
 */
export function validateKnownFormats(vars: Record<string, string>): PreflightIssue[] {
  const issues: PreflightIssue[] = []
  for (const [key, value] of Object.entries(vars)) {
    if (value === '' || isPlaceholderValue(value)) continue

    if (key === 'JWT_SECRET' && value.length < 32) {
      issues.push({
        kind: 'invalid_format',
        key,
        detail: `JWT_SECRET must be at least 32 chars (got ${value.length})`,
      })
      continue
    }

    if (key === 'MONGO_URL') {
      if (!value.includes('{app}') || !value.includes('{env}')) {
        issues.push({
          kind: 'invalid_template',
          key,
          detail: 'MONGO_URL must contain {app} and {env} placeholders',
        })
        continue
      }
    }

    if (key.startsWith('SENTRY_DSN')) {
      // Accept https://... URLs hosted on any Sentry domain
      if (!/^https:\/\/[^@]+@[^/]+\/\d+$/.test(value)) {
        issues.push({
          kind: 'invalid_format',
          key,
          detail: 'SENTRY_DSN must match https://<key>@<host>/<project-id>',
        })
      }
      continue
    }

    // Anything ending with _URL or explicitly URL-shaped — try parsing
    if (/_URL$|^(OPENAI|ANTHROPIC)_/.test(key) && /^https?:\/\//.test(value)) {
      try {
        new URL(value)
      } catch {
        issues.push({ kind: 'invalid_format', key, detail: `not a parseable URL` })
      }
    }
  }
  return issues
}

/**
 * Scan the env source for placeholder / empty values.
 */
export function findPlaceholderIssues(vars: Record<string, string>): PreflightIssue[] {
  const issues: PreflightIssue[] = []
  for (const [key, value] of Object.entries(vars)) {
    if (value.trim() === '') {
      issues.push({ kind: 'empty', key, detail: 'value is empty' })
      continue
    }
    if (isPlaceholderValue(value)) {
      issues.push({
        kind: 'placeholder',
        key,
        detail: `value "${mask(value)}" looks like a placeholder`,
      })
    }
  }
  return issues
}

/**
 * Ensure every `required` var (SHARED_REQUIRED + per-app manifest) is present
 * in the root env source under its generic name.
 *
 * MONGO_URL is templated, so presence = the template itself, not a resolved URL.
 */
export function findMissingRequired(vars: Record<string, string>): PreflightIssue[] {
  const issues: PreflightIssue[] = []
  const seen = new Set<string>()
  // Shared requirements apply globally
  for (const key of SHARED_REQUIRED) {
    if (seen.has(key)) continue
    seen.add(key)
    const val = vars[key]
    if (val === undefined || val.trim() === '') {
      issues.push({ kind: 'missing_required', key, detail: 'required by SHARED_REQUIRED' })
    }
  }
  // Per-app requirements (each app's generic-name vars must exist in root)
  for (const app of Object.keys(ENV_MANIFESTS)) {
    if (!hasEnvManifest(app)) continue
    for (const key of ENV_MANIFESTS[app].required) {
      if (seen.has(key)) continue
      seen.add(key)
      const val = vars[key]
      if (val === undefined || val.trim() === '') {
        issues.push({
          kind: 'missing_required',
          key,
          detail: `required by app "${app}"`,
        })
      }
    }
  }
  return issues
}

/**
 * Look under `tmp/` for a recent pull backup (< 1h) matching the env.
 *
 * Returns the absolute path of the most recent matching backup, or `null`.
 */
export function findRecentBackup(env: EnvName, maxAgeMs = 60 * 60 * 1000): string | null {
  const dir = resolve(ROOT, 'tmp')
  if (!existsSync(dir)) return null
  const prefix = 'secrets-pull-backup-'
  const suffix = `.env.${env}`
  const now = Date.now()
  let best: { path: string; mtime: number } | null = null
  let bestAny: { path: string; mtime: number } | null = null
  for (const name of readdirSync(dir)) {
    if (!name.startsWith(prefix) || !name.endsWith(suffix)) continue
    const full = resolve(dir, name)
    try {
      const s = statSync(full)
      const age = now - s.mtimeMs
      if (!bestAny || s.mtimeMs > bestAny.mtime) {
        bestAny = { path: full, mtime: s.mtimeMs }
      }
      if (age <= maxAgeMs) {
        if (!best || s.mtimeMs > best.mtime) {
          best = { path: full, mtime: s.mtimeMs }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return best?.path ?? null
}

export function findAnyBackup(env: EnvName): string | null {
  const dir = resolve(ROOT, 'tmp')
  if (!existsSync(dir)) return null
  const prefix = 'secrets-pull-backup-'
  const suffix = `.env.${env}`
  let best: { path: string; mtime: number } | null = null
  for (const name of readdirSync(dir)) {
    if (!name.startsWith(prefix) || !name.endsWith(suffix)) continue
    const full = resolve(dir, name)
    try {
      const s = statSync(full)
      if (!best || s.mtimeMs > best.mtime) {
        best = { path: full, mtime: s.mtimeMs }
      }
    } catch {
      /* ignore */
    }
  }
  return best?.path ?? null
}

// ─────────────────────────────────────────────────────────────
// Plan (diff cloud vs local push plan)
// ─────────────────────────────────────────────────────────────

export type PlanOp = 'add' | 'update' | 'noop' | 'delete'

export type PlanRow = {
  op: PlanOp
  target: string // targetLabel
  key: string
  localValue: string | null
  cloudValue: string | null
}

export type PlanSummary = {
  add: number
  update: number
  noop: number
  delete: number
}

/**
 * Compute a diff between the push plan (local → cloud) and the CURRENT
 * cloud state (previously fetched per target).
 *
 * A DELETE is emitted when the cloud has a var the local plan doesn't push
 * AND the var isn't platform-injected AND it IS declared in VAR_TARGETS
 * (otherwise we'd churn on every user-managed ancillary var we don't manage).
 */
export function computePlan(
  entries: readonly PushEntry[],
  cloudByLabel: ReadonlyMap<string, Record<string, string>>
): { rows: PlanRow[]; summary: PlanSummary } {
  const rows: PlanRow[] = []
  const summary: PlanSummary = { add: 0, update: 0, noop: 0, delete: 0 }

  const planned = new Set<string>()
  for (const e of entries) {
    const label = targetLabel(e.target)
    planned.add(`${label}::${e.exportedKey}`)
    const cloud = cloudByLabel.get(label)
    const cloudVal = cloud ? cloud[e.exportedKey] : undefined
    if (cloudVal === undefined) {
      rows.push({
        op: 'add',
        target: label,
        key: e.exportedKey,
        localValue: e.value,
        cloudValue: null,
      })
      summary.add++
    } else if (cloudVal !== e.value) {
      rows.push({
        op: 'update',
        target: label,
        key: e.exportedKey,
        localValue: e.value,
        cloudValue: cloudVal,
      })
      summary.update++
    } else {
      rows.push({
        op: 'noop',
        target: label,
        key: e.exportedKey,
        localValue: e.value,
        cloudValue: cloudVal,
      })
      summary.noop++
    }
  }

  // Delete candidates: in cloud but not in our plan, AND declared in VAR_TARGETS,
  // AND not platform-injected. We never auto-delete unknown vars (user owns those).
  const known = new Set<string>(Object.keys(VAR_TARGETS))
  const suffixed = (Object.keys(VAR_TARGETS) as VarName[]).filter(
    k => VAR_TARGETS[k].suffixed === true
  )
  const isManagedKey = (key: string): boolean => {
    if (known.has(key)) return true
    for (const base of suffixed) {
      if (key.startsWith(`${base}_`)) return true
    }
    return false
  }

  for (const [label, cloud] of cloudByLabel) {
    for (const key of Object.keys(cloud)) {
      if (planned.has(`${label}::${key}`)) continue
      if (isPlatformVar(key)) continue
      if (key === 'PORT') continue
      if (!isManagedKey(key)) continue
      rows.push({
        op: 'delete',
        target: label,
        key,
        localValue: null,
        cloudValue: cloud[key] ?? null,
      })
      summary.delete++
    }
  }

  return { rows, summary }
}
