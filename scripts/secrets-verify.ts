#!/usr/bin/env tsx
/**
 * Cross-check env var declarations between three sources of truth:
 *
 *   1. Code usage            — grep `process.env.XXX` across apps/<app>/{api,web}/src
 *                              + helper calls: `getMongoUrl('<app>')`,
 *                              `getJwtSecret()` which imply MONGO_URL / JWT_SECRET
 *                              are consumed by that app.
 *   2. `.env.example` files  — per-app stubs under `apps/<app>/{api,web}/.env.example`
 *   3. `VAR_TARGETS`         — declared mapping in `@ezstart/config/secrets-targets`
 *
 * Categorizes every divergence:
 *
 *   - STALE_EXAMPLE     : in .env.example but NOT referenced in code
 *   - MISSING_IN_MAPPING: referenced in code but absent from VAR_TARGETS
 *   - OVER_SCOPED       : VAR_TARGETS scopes to apps that don't use it
 *   - UNDER_SCOPED      : code uses the var in apps outside the VAR_TARGETS scope
 *
 * Usage:
 *   pnpm secrets:verify              # report
 *   pnpm secrets:verify --fix        # emit a candidate VAR_TARGETS JSON patch
 *   pnpm secrets:verify --json       # machine-readable
 *
 * Exit code: 0 when clean, 1 when any divergence is found (CI-friendly).
 *
 * The `--fix` flag NEVER writes files — it only prints a diff you can apply
 * by hand. Over/under-scoping is often intentional, so auto-mutation is unsafe.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT, allAppNames, isPlatformVar, parseEnvContent, say } from './lib/secrets-cli.js'
import { IGNORED_VARS, VAR_TARGETS, type AppName, type VarName } from '@ezstart/config'

const IGNORED_SET: ReadonlySet<string> = new Set(IGNORED_VARS)

type Layer = 'api' | 'web'

type CodeUsage = Record<string, Set<AppName>>

type VerifyFlags = {
  fix: boolean
  json: boolean
}

function parseVerifyFlags(argv: readonly string[]): VerifyFlags {
  return { fix: argv.includes('--fix'), json: argv.includes('--json') }
}

// ─────────────────────────────────────────────────────────────
// File walking
// ─────────────────────────────────────────────────────────────

const SOURCE_EXT = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.jsx'])
const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  '.next',
  '.turbo',
  'coverage',
  '__tests__',
  'tests',
  'test',
  '.vercel',
])

function* walkSource(dir: string): Generator<string> {
  if (!existsSync(dir)) return
  const entries = readdirSync(dir)
  for (const name of entries) {
    const full = resolve(dir, name)
    let s: ReturnType<typeof statSync>
    try {
      s = statSync(full)
    } catch {
      continue
    }
    if (s.isDirectory()) {
      if (IGNORE_DIRS.has(name)) continue
      if (name.startsWith('.')) continue
      yield* walkSource(full)
      continue
    }
    if (!s.isFile()) continue
    const dot = name.lastIndexOf('.')
    if (dot < 0) continue
    const ext = name.slice(dot)
    if (!SOURCE_EXT.has(ext)) continue
    yield full
  }
}

// ─────────────────────────────────────────────────────────────
// Source scan: extract env references + helper calls
// ─────────────────────────────────────────────────────────────

const PROCESS_ENV_RE =
  /process\s*\.\s*env\s*(?:\.\s*([A-Z_][A-Z0-9_]*)|\[\s*['"`]([A-Z_][A-Z0-9_]*)['"`]\s*\])/g
const GET_MONGO_RE = /getMongoUrl\s*\(\s*['"`]([a-z0-9-]+)['"`]\s*\)/g
const GET_JWT_RE = /getJwtSecret\s*\(\s*\)/g

function scanApp(app: AppName, layer: Layer, usage: CodeUsage): void {
  const root = resolve(ROOT, 'apps', app, layer, 'src')
  if (!existsSync(root)) return

  for (const file of walkSource(root)) {
    let content: string
    try {
      content = readFileSync(file, 'utf8')
    } catch {
      continue
    }

    // process.env.FOO / process.env["FOO"]
    PROCESS_ENV_RE.lastIndex = 0
    let m = PROCESS_ENV_RE.exec(content)
    while (m !== null) {
      const name = m[1] ?? m[2]
      if (name && !isPlatformVar(name)) {
        ;(usage[name] ??= new Set()).add(app)
      }
      m = PROCESS_ENV_RE.exec(content)
    }

    // Helper calls — these imply a generic var is consumed by this app
    if (GET_JWT_RE.test(content)) {
      ;(usage.JWT_SECRET ??= new Set()).add(app)
    }
    GET_MONGO_RE.lastIndex = 0
    let mm = GET_MONGO_RE.exec(content)
    while (mm !== null) {
      ;(usage.MONGO_URL ??= new Set()).add(app)
      // If app literal in the call differs from current app, still attribute to current
      mm = GET_MONGO_RE.exec(content)
    }
  }
}

function collectCodeUsage(): CodeUsage {
  const usage: CodeUsage = {}
  for (const app of allAppNames()) {
    scanApp(app, 'api', usage)
    scanApp(app, 'web', usage)
  }
  return usage
}

// ─────────────────────────────────────────────────────────────
// .env.example scan
// ─────────────────────────────────────────────────────────────

type ExampleUsage = Record<string, Set<AppName>>

function collectExampleKeys(): ExampleUsage {
  const out: ExampleUsage = {}
  for (const app of allAppNames()) {
    for (const layer of ['api', 'web'] as const) {
      const file = resolve(ROOT, 'apps', app, layer, '.env.example')
      if (!existsSync(file)) continue
      let content: string
      try {
        content = readFileSync(file, 'utf8')
      } catch {
        continue
      }
      const parsed = parseEnvContent(content)
      for (const k of Object.keys(parsed)) {
        if (isPlatformVar(k)) continue
        ;(out[k] ??= new Set()).add(app)
      }
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────
// Mapping resolution (VAR_TARGETS → per-app set)
// ─────────────────────────────────────────────────────────────

function mappingAppsFor(name: VarName): Set<AppName> {
  const t = VAR_TARGETS[name]
  const base: readonly AppName[] = t.apps === '*' ? allAppNames() : t.apps
  const set = new Set<AppName>(base)
  if (t.webOverrides) for (const a of t.webOverrides) set.add(a)
  return set
}

// ─────────────────────────────────────────────────────────────
// Core diff
// ─────────────────────────────────────────────────────────────

type FindingKind = 'STALE_EXAMPLE' | 'MISSING_IN_MAPPING' | 'OVER_SCOPED' | 'UNDER_SCOPED'

type Finding = {
  kind: FindingKind
  key: string
  detail: string
  codeApps: readonly AppName[]
  mappingApps: readonly AppName[]
  exampleApps: readonly AppName[]
}

function setDiff<T>(a: Set<T>, b: Set<T>): T[] {
  const out: T[] = []
  for (const x of a) if (!b.has(x)) out.push(x)
  return out
}

function stripSuffixKey(key: string): VarName | null {
  const suffixedBases = (Object.keys(VAR_TARGETS) as VarName[]).filter(
    k => VAR_TARGETS[k].suffixed === true
  )
  for (const base of suffixedBases) {
    if (key.startsWith(`${base}_`)) return base
  }
  return null
}

function verify(): { findings: Finding[]; counts: Record<FindingKind, number> } {
  const codeUsage = collectCodeUsage()
  const exampleUsage = collectExampleKeys()
  const findings: Finding[] = []

  // Collect the universe of keys to inspect
  const allKeys = new Set<string>()
  for (const k of Object.keys(VAR_TARGETS)) allKeys.add(k)
  for (const k of Object.keys(codeUsage)) allKeys.add(k)
  for (const k of Object.keys(exampleUsage)) allKeys.add(k)

  for (const key of allKeys) {
    if (isPlatformVar(key)) continue
    if (key === 'PORT') continue
    // Skip intentionally-ignored vars (ALERT_*, ALLOW_PROD_MIGRATION, PAYMENT_PROVIDER)
    if (IGNORED_SET.has(key)) continue

    // Suffixed keys ({VAR}_{APP}) are aliases of their base
    const baseKey = stripSuffixKey(key)
    const resolved = baseKey ?? key

    const mapEntry = VAR_TARGETS[resolved as VarName]
    const mappingApps = mapEntry ? mappingAppsFor(resolved as VarName) : new Set<AppName>()
    const codeApps = codeUsage[key] ?? new Set<AppName>()
    // For suffixed vars, code usage is aggregated under the base via helper detection
    if (baseKey) {
      for (const a of codeUsage[baseKey] ?? []) codeApps.add(a)
    }
    const exampleApps = exampleUsage[key] ?? new Set<AppName>()
    // .env.example may list the SUFFIXED name (e.g. {VAR}_EZAUTH) — still count it
    if (baseKey) {
      for (const a of exampleUsage[baseKey] ?? []) exampleApps.add(a)
    }

    // STALE_EXAMPLE: present in example but never referenced in code AND
    // not declared in mapping — definitely cruft
    if (exampleApps.size > 0 && codeApps.size === 0 && !mapEntry) {
      findings.push({
        kind: 'STALE_EXAMPLE',
        key,
        detail: 'in .env.example but never referenced in code and not in VAR_TARGETS',
        codeApps: [],
        mappingApps: [],
        exampleApps: [...exampleApps],
      })
      continue
    }

    // MISSING_IN_MAPPING: code references it but no VAR_TARGETS entry
    if (codeApps.size > 0 && !mapEntry) {
      findings.push({
        kind: 'MISSING_IN_MAPPING',
        key,
        detail: 'referenced in code but absent from VAR_TARGETS',
        codeApps: [...codeApps],
        mappingApps: [],
        exampleApps: [...exampleApps],
      })
      continue
    }

    // Scope comparisons require a mapping AND code references
    if (mapEntry && codeApps.size > 0) {
      const over = setDiff(mappingApps, codeApps)
      const under = setDiff(codeApps, mappingApps)
      if (over.length > 0 && mapEntry.apps !== '*') {
        findings.push({
          kind: 'OVER_SCOPED',
          key,
          detail: `VAR_TARGETS covers apps the code does not touch: ${over.join(', ')}`,
          codeApps: [...codeApps],
          mappingApps: [...mappingApps],
          exampleApps: [...exampleApps],
        })
      }
      if (under.length > 0) {
        findings.push({
          kind: 'UNDER_SCOPED',
          key,
          detail: `code uses var in apps missing from VAR_TARGETS: ${under.join(', ')}`,
          codeApps: [...codeApps],
          mappingApps: [...mappingApps],
          exampleApps: [...exampleApps],
        })
      }
    }
  }

  const counts: Record<FindingKind, number> = {
    STALE_EXAMPLE: 0,
    MISSING_IN_MAPPING: 0,
    OVER_SCOPED: 0,
    UNDER_SCOPED: 0,
  }
  for (const f of findings) counts[f.kind]++

  return { findings, counts }
}

// ─────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────

function renderReport(findings: readonly Finding[], counts: Record<FindingKind, number>): void {
  say('\n[verify] cross-check code ↔ .env.example ↔ VAR_TARGETS\n')
  say('── Summary ──')
  say(`  STALE_EXAMPLE      : ${counts.STALE_EXAMPLE}`)
  say(`  MISSING_IN_MAPPING : ${counts.MISSING_IN_MAPPING}`)
  say(`  OVER_SCOPED        : ${counts.OVER_SCOPED}`)
  say(`  UNDER_SCOPED       : ${counts.UNDER_SCOPED}`)
  say('')

  if (findings.length === 0) {
    say('[ok] no divergence — code, .env.example files and VAR_TARGETS are in sync.\n')
    return
  }

  const groups: Record<FindingKind, Finding[]> = {
    STALE_EXAMPLE: [],
    MISSING_IN_MAPPING: [],
    OVER_SCOPED: [],
    UNDER_SCOPED: [],
  }
  for (const f of findings) groups[f.kind].push(f)

  for (const kind of Object.keys(groups) as FindingKind[]) {
    const list = groups[kind]
    if (list.length === 0) continue
    say(`── ${kind} (${list.length}) ──`)
    for (const f of list) {
      say(`  ${f.key}`)
      say(`    ${f.detail}`)
      if (f.codeApps.length > 0) say(`    code     : ${f.codeApps.join(', ')}`)
      if (f.mappingApps.length > 0) say(`    mapping  : ${f.mappingApps.join(', ')}`)
      if (f.exampleApps.length > 0) say(`    examples : ${f.exampleApps.join(', ')}`)
    }
    say('')
  }
}

function renderFixSuggestion(findings: readonly Finding[]): void {
  const patch: Record<string, { add?: string[]; remove?: string[] }> = {}
  for (const f of findings) {
    if (f.kind === 'UNDER_SCOPED') {
      const missing = setDiff(new Set(f.codeApps), new Set(f.mappingApps))
      patch[f.key] ??= {}
      patch[f.key].add = missing
    }
    if (f.kind === 'OVER_SCOPED') {
      const extra = setDiff(new Set(f.mappingApps), new Set(f.codeApps))
      patch[f.key] ??= {}
      patch[f.key].remove = extra
    }
    if (f.kind === 'MISSING_IN_MAPPING') {
      patch[f.key] ??= {}
      patch[f.key].add = [...f.codeApps]
    }
  }
  if (Object.keys(patch).length === 0) return
  say('── Suggested VAR_TARGETS patch (APPLY MANUALLY — review each change) ──')
  process.stdout.write(`${JSON.stringify(patch, null, 2)}\n\n`)
}

async function main(): Promise<void> {
  const flags = parseVerifyFlags(process.argv.slice(2))
  const { findings, counts } = verify()

  if (flags.json) {
    process.stdout.write(`${JSON.stringify({ counts, findings }, null, 2)}\n`)
  } else {
    renderReport(findings, counts)
    if (flags.fix) renderFixSuggestion(findings)
  }

  process.exit(findings.length === 0 ? 0 : 1)
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[fatal] ${msg}\n`)
  process.exit(1)
})
