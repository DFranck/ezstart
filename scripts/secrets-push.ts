#!/usr/bin/env tsx
/**
 * Push root `.env.{env}` → Railway services + Vercel projects.
 *
 * Terraform-style workflow:
 *
 *   1. `--preflight`          — validate local `.env.{env}` only (no I/O)
 *   2. `--plan` (default)     — diff cloud vs local, show ADD/UPDATE/NOOP/DELETE
 *   3. `--canary <service>`   — apply the push to a SINGLE service (requires --confirm)
 *   4. `--confirm`            — apply ADD + UPDATE everywhere
 *   5. `--confirm-delete`     — ALSO apply DELETE ops (double opt-in, destructive)
 *   6. `--from-backup <file>` — read backup instead of `.env.{env}` (rollback)
 *
 * Legacy `--dry-run` is kept as a deprecated alias for `--plan`.
 *
 * Source of truth: `.env.{env}` at the monorepo root (or a backup file via
 * --from-backup). Target matrix comes from `VAR_TARGETS` in `@ezstart/config`.
 *
 * Sensitive values are always masked in stdout.
 */

import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ROOT,
  buildPushPlan,
  cliAvailable,
  computePlan,
  envFilePath,
  envFileName,
  findMissingRequired,
  findPlaceholderIssues,
  findRecentBackup,
  findUnknownVars,
  isPlatformVar,
  parseEnvContent,
  parseEnvFile,
  parseFlags,
  railwayDeleteVar,
  railwayLink,
  railwayListVars,
  railwaySetVar,
  railwayTargetForApp,
  relPath,
  say,
  targetLabel,
  validateKnownFormats,
  vercelEnvAdd,
  vercelEnvPull,
  vercelEnvRm,
  vercelLink,
  vercelTargetForApp,
  allAppNames,
  type DeployTarget,
  type PlanRow,
  type PushEntry,
  type CommonFlags,
  type EnvName,
} from './lib/secrets-cli.js'

/**
 * Mode derived from the CLI flags. `plan` is the default when nothing
 * destructive is requested.
 */
type Mode = 'preflight' | 'plan' | 'apply'

function resolveMode(flags: CommonFlags): Mode {
  if (flags.preflight) return 'preflight'
  if (flags.confirm) return 'apply'
  // --dry-run is a deprecated alias for --plan
  return 'plan'
}

function loadSource(flags: CommonFlags): Record<string, string> | null {
  if (flags.fromBackup) {
    const p = resolve(ROOT, flags.fromBackup)
    if (!existsSync(p)) {
      say(`\n[x] backup file not found: ${relPath(p)}\n`)
      return null
    }
    return parseEnvFile(p)
  }
  const file = envFilePath(flags.env)
  const src = parseEnvFile(file)
  if (!src) {
    say(`\n[x] ${relPath(file)} not found.`)
    say(`    Create it from .env.example with your ${flags.env} values.\n`)
    return null
  }
  return src
}

function stripPlatformFromSource(raw: Record<string, string>): {
  source: Record<string, string>
  dropped: string[]
} {
  const source: Record<string, string> = {}
  const dropped: string[] = []
  for (const [k, v] of Object.entries(raw)) {
    if (isPlatformVar(k)) {
      dropped.push(k)
      continue
    }
    source[k] = v
  }
  return { source, dropped }
}

/**
 * Preflight: validate local `.env.{env}` only — NO cloud I/O.
 *
 * Exits non-zero when any check fails so CI can block.
 */
function runPreflight(flags: CommonFlags, source: Record<string, string>): number {
  say(`\n[preflight] local validation — env=${flags.env}\n`)

  const placeholders = findPlaceholderIssues(source)
  const missing = findMissingRequired(source)
  const formats = validateKnownFormats(source)

  const allIssues = [...placeholders, ...missing, ...formats]

  // Backup freshness: warn (not fail) when no recent pull exists
  const recent = findRecentBackup(flags.env)

  if (placeholders.length > 0) {
    say('── Placeholder / empty values ──')
    for (const i of placeholders) say(`  [x] ${i.key}  ${i.detail}`)
    say('')
  }

  if (missing.length > 0) {
    say('── Missing required vars ──')
    for (const i of missing) say(`  [x] ${i.key}  ${i.detail}`)
    say('')
  }

  if (formats.length > 0) {
    say('── Invalid formats ──')
    for (const i of formats) say(`  [x] ${i.key}  ${i.detail}`)
    say('')
  }

  if (!recent) {
    say('── Backup freshness ──')
    say('  [warn] no pull backup < 1h old in tmp/')
    say('         recommended: pnpm secrets:pull --env ' + flags.env)
    say('')
  } else {
    say(`── Backup freshness ──`)
    say(`  [ok] recent backup: ${relPath(recent)}`)
    say('')
  }

  if (allIssues.length === 0) {
    say('[preflight] OK — no blocking issues\n')
    return 0
  }
  say(`[preflight] FAIL — ${allIssues.length} issue(s)\n`)
  return 1
}

/**
 * Fetch current cloud state for every target relevant to the push plan.
 */
function fetchCloudState(
  entries: readonly PushEntry[],
  env: EnvName,
  includeRailway: boolean,
  includeVercel: boolean
): Map<string, Record<string, string>> {
  const cloudByLabel = new Map<string, Record<string, string>>()

  // Distinct labels from the plan (saves fetching things we don't care about)
  const needed = new Set<string>()
  for (const e of entries) needed.add(targetLabel(e.target))

  if (needed.size === 0) return cloudByLabel

  const apps = allAppNames()

  if (includeRailway && cliAvailable('railway')) {
    for (const app of apps) {
      const rw = railwayTargetForApp(app)
      if (!rw) continue
      const label = targetLabel(rw)
      if (!needed.has(label)) continue
      const link = railwayLink(rw, env)
      if (!link.ok) continue
      const list = railwayListVars()
      if (!list.ok) continue
      cloudByLabel.set(label, parseEnvContent(list.stdout))
    }
  }

  if (includeVercel && cliAvailable('vercel')) {
    const tmpRoot = resolve(ROOT, 'tmp', 'secrets-push-vercel')
    mkdirSync(tmpRoot, { recursive: true })
    for (const app of apps) {
      const vc = vercelTargetForApp(app)
      const label = targetLabel(vc)
      if (!needed.has(label)) continue
      const projDir = resolve(tmpRoot, vc.project)
      mkdirSync(projDir, { recursive: true })
      const link = vercelLink(vc, projDir)
      if (!link.ok) continue
      const outFile = resolve(projDir, '.env.pull')
      const pull = vercelEnvPull(outFile, env, projDir)
      if (!pull.ok) continue
      const parsed = parseEnvFile(outFile)
      if (!parsed) continue
      cloudByLabel.set(label, parsed)
    }
    try {
      rmSync(tmpRoot, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }

  return cloudByLabel
}

function canaryMatches(label: string, canary: string): boolean {
  // Accept `railway/ezbill-api`, `ezbill-api`, or `vercel/web-ezbill`
  return label === canary || label.endsWith(`/${canary}`)
}

function renderPlan(rows: readonly PlanRow[], env: EnvName): void {
  say(`\n== PLAN (env=${env}) ==\n`)
  if (rows.length === 0) {
    say('  (no targets matched)\n')
    return
  }

  const byTarget = new Map<string, PlanRow[]>()
  for (const row of rows) {
    const list = byTarget.get(row.target)
    if (list) list.push(row)
    else byTarget.set(row.target, [row])
  }

  const summary = { add: 0, update: 0, noop: 0, delete: 0 }
  for (const [label, list] of byTarget) {
    say(`${label}:`)
    for (const r of list) {
      const badge =
        r.op === 'add'
          ? '+ ADD    '
          : r.op === 'update'
            ? '~ UPDATE '
            : r.op === 'delete'
              ? '- DELETE '
              : '= NOOP   '
      const detail =
        r.op === 'add'
          ? '(new)'
          : r.op === 'update'
            ? '(value changed)'
            : r.op === 'delete'
              ? '(not in VAR_TARGETS plan for this target)'
              : '(unchanged)'
      say(`  ${badge} ${r.key.padEnd(28)} ${detail}`)
    }
    say('')
  }

  for (const r of rows) summary[r.op]++
  say('== SUMMARY ==')
  say(`  Add    : ${summary.add}`)
  say(`  Update : ${summary.update}`)
  say(`  Delete : ${summary.delete}`)
  say(`  Noop   : ${summary.noop}`)
  say('')
}

/**
 * Apply the plan: ADD + UPDATE (+ DELETE when --confirm-delete).
 */
type ApplyResult = {
  pushed: number
  failed: number
  deleted: number
  manualRequired: number
  manualOps: string[]
}

function applyPlan(
  flags: CommonFlags,
  rows: readonly PlanRow[],
  entries: readonly PushEntry[]
): ApplyResult {
  const railwayOK = !flags.vercelOnly && cliAvailable('railway')
  const vercelOK = !flags.railwayOnly && cliAvailable('vercel')
  if (!flags.vercelOnly && !railwayOK) {
    say('[warn] Railway CLI not found. Install: npm i -g @railway/cli')
  }
  if (!flags.railwayOnly && !vercelOK) {
    say('[warn] Vercel CLI not found. Install: pnpm add -g vercel')
  }

  const tmpRoot = resolve(ROOT, 'tmp', 'secrets-push')
  mkdirSync(tmpRoot, { recursive: true })

  // Index push entries by target + key for quick lookup during apply
  const entryByKey = new Map<string, PushEntry>()
  for (const e of entries) {
    entryByKey.set(`${targetLabel(e.target)}::${e.exportedKey}`, e)
  }

  // Cache link state (railway link is global per process, vercel link is per dir)
  const linkedRailway = new Set<string>()
  const linkedVercel = new Map<string, string>()

  // Apply the relevant targets only. Canary → skip non-matching.
  const applicable = rows.filter(r => {
    if (flags.canary && !canaryMatches(r.target, flags.canary)) return false
    if (r.op === 'noop') return false
    if (r.op === 'delete' && !flags.confirmDelete) return false
    return true
  })

  const byTarget = new Map<string, PlanRow[]>()
  for (const r of applicable) {
    const list = byTarget.get(r.target)
    if (list) list.push(r)
    else byTarget.set(r.target, [r])
  }

  let pushed = 0
  let failed = 0
  let deleted = 0
  let manualRequired = 0
  const manualOps: string[] = []

  /** Detects Railway CLI output that means "this op cannot run non-interactively". */
  const isManualRequired = (stderr: string): boolean => {
    const s = stderr.toLowerCase()
    return s.includes('not supported') || s.includes('deprecated') || s.includes('unknown command')
  }

  for (const [label, list] of byTarget) {
    const kind: 'railway' | 'vercel' = label.startsWith('railway/') ? 'railway' : 'vercel'

    if (kind === 'railway') {
      if (!railwayOK) continue
      // Need the original PushEntry to resolve the target
      const firstEntry = list
        .map(r => entryByKey.get(`${label}::${r.key}`))
        .find((x): x is PushEntry => x !== undefined)
      // Fall back: delete-only target — reconstruct the railway target from label
      if (!linkedRailway.has(label)) {
        let target: DeployTarget | null = firstEntry?.target ?? null
        if (!target) {
          // delete-only case: resolve railway target from label's service segment
          const service = label.slice('railway/'.length)
          for (const app of allAppNames()) {
            const rw = railwayTargetForApp(app)
            if (rw && rw.service === service) {
              target = rw
              break
            }
          }
        }
        if (!target || target.kind !== 'railway') {
          say(`  ${label} [x] cannot resolve Railway target for delete op`)
          failed += list.length
          continue
        }
        const linkRes = railwayLink(target, flags.env)
        if (!linkRes.ok) {
          say(`  ${label} [x] link failed: ${linkRes.stderr.split('\n')[0] ?? 'unknown'}`)
          failed += list.length
          continue
        }
        linkedRailway.add(label)
      }

      for (const r of list) {
        if (r.op === 'delete') {
          const delRes = railwayDeleteVar(r.key)
          if (delRes.ok) {
            deleted++
          } else if (isManualRequired(delRes.stderr)) {
            manualRequired++
            const msg = `  ${label} [manual] delete ${r.key} via Railway dashboard (CLI unsupported)`
            manualOps.push(`${label} :: DELETE ${r.key}`)
            say(msg)
          } else {
            failed++
            say(`  ${label} [x] DELETE ${r.key}: ${delRes.stderr.split('\n')[0] ?? 'unknown'}`)
          }
          continue
        }
        const entry = entryByKey.get(`${label}::${r.key}`)
        if (!entry) {
          failed++
          continue
        }
        const setRes = railwaySetVar(entry.exportedKey, entry.value)
        if (setRes.ok) {
          pushed++
        } else {
          failed++
          const firstErr = setRes.stderr.split('\n').find(l => l.trim().length > 0) ?? 'unknown'
          say(`  ${label} [x] ${entry.exportedKey}: ${firstErr}`)
        }
      }
      say(`  ${label} [ok] ops=${list.length}`)
      continue
    }

    // vercel
    if (!vercelOK) continue
    const firstEntry = list
      .map(r => entryByKey.get(`${label}::${r.key}`))
      .find((x): x is PushEntry => x !== undefined)
    let projectName: string | null = null
    if (firstEntry && firstEntry.target.kind === 'vercel') {
      projectName = firstEntry.target.project
    } else {
      // delete-only: resolve vercel project from label
      const proj = label.slice('vercel/'.length)
      projectName = proj
    }
    if (!projectName) {
      say(`  ${label} [x] cannot resolve Vercel project`)
      failed += list.length
      continue
    }
    const projDir = linkedVercel.get(projectName) ?? resolve(tmpRoot, projectName)
    if (!linkedVercel.has(projectName)) {
      mkdirSync(projDir, { recursive: true })
      // We need a VercelTarget; get it from entry or reconstruct
      let vcTarget = firstEntry?.target.kind === 'vercel' ? firstEntry.target : null
      if (!vcTarget) {
        for (const app of allAppNames()) {
          const cand = vercelTargetForApp(app)
          if (cand.project === projectName) {
            vcTarget = cand
            break
          }
        }
      }
      if (!vcTarget) {
        say(`  ${label} [x] cannot link Vercel project`)
        failed += list.length
        continue
      }
      const linkRes = vercelLink(vcTarget, projDir)
      if (!linkRes.ok) {
        say(`  ${label} [x] link failed: ${linkRes.stderr.split('\n')[0] ?? 'unknown'}`)
        failed += list.length
        continue
      }
      linkedVercel.set(projectName, projDir)
    }

    /**
     * Extract the meaningful error message from a Vercel CLI failure.
     * The CLI can emit:
     *   - a `<claude-code-hint ... />` plugin banner (noise → skip)
     *   - an `Error: ...` line on stderr (use it)
     *   - a JSON `{"message": "..."}` error on stdout (extract it)
     */
    const parseVercelError = (res: {
      stdout: string
      stderr: string
      status: number | null
    }): string => {
      const combined = [...res.stderr.split('\n'), ...res.stdout.split('\n')].map(l => l.trim())
      // First, try to locate a JSON message block (CLI spits `{"message": "..."}`)
      const joined = `${res.stdout}\n${res.stderr}`
      const msgMatch = joined.match(/"message"\s*:\s*"([^"]+)"/)
      if (msgMatch && msgMatch[1]) return msgMatch[1]
      // Next, an `Error: …` line
      const errLine = combined.find(l => /^(error|err):/i.test(l))
      if (errLine) return errLine
      // Next, first non-empty line that isn't a plugin hint banner
      const meaningful = combined.find(
        l =>
          l.length > 0 && !l.startsWith('<claude-code-hint') && !l.startsWith('Retrieving project')
      )
      return meaningful ?? `exit ${res.status}`
    }

    let ok = 0
    let ko = 0
    const errorLines: string[] = []
    for (const r of list) {
      if (r.op === 'delete') {
        const rmRes = vercelEnvRm(r.key, flags.env, projDir)
        if (rmRes.ok) {
          deleted++
        } else {
          ko++
          failed++
          errorLines.push(`DELETE ${r.key}: ${parseVercelError(rmRes)}`)
        }
        continue
      }
      const entry = entryByKey.get(`${label}::${r.key}`)
      if (!entry) {
        ko++
        failed++
        errorLines.push(`${r.key}: no push entry resolved`)
        continue
      }
      // With --force, vercelEnvAdd overwrites existing, no need to rm first
      const addRes = vercelEnvAdd(entry.exportedKey, entry.value, flags.env, projDir)
      if (addRes.ok) {
        ok++
        pushed++
      } else {
        ko++
        failed++
        errorLines.push(`${entry.exportedKey}: ${parseVercelError(addRes)}`)
      }
    }
    say(`  ${label} [${ko === 0 ? 'ok' : 'warn'}] ${ok} pushed${ko ? `, ${ko} failed` : ''}`)
    for (const err of errorLines) {
      say(`    ${label} [x] ${err}`)
    }
  }

  try {
    rmSync(tmpRoot, { recursive: true, force: true })
  } catch {
    /* ignore */
  }

  return { pushed, failed, deleted, manualRequired, manualOps }
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2))

  if (flags.dryRun && !flags.plan) {
    say('[deprecated] --dry-run is an alias for --plan. Prefer --plan.')
  }

  const rawSource = loadSource(flags)
  if (!rawSource) {
    process.exit(1)
  }

  const { source, dropped } = stripPlatformFromSource(rawSource)
  if (dropped.length > 0) {
    say('')
    say('[info] Platform-injected vars ignored from source:')
    for (const k of dropped) say(`  - ${k}`)
  }

  const mode = resolveMode(flags)

  if (mode === 'preflight') {
    const code = runPreflight(flags, source)
    process.exit(code)
  }

  const unknown = findUnknownVars(source)
  if (unknown.length > 0) {
    say('')
    say('[warn] Unknown vars in source (not in VAR_TARGETS, skipped):')
    for (const k of unknown) say(`  - ${k}`)
  }

  const entries = buildPushPlan(source, {
    env: flags.env,
    restrict: flags.vars,
    includeRailway: !flags.vercelOnly,
    includeVercel: !flags.railwayOnly,
  })

  // Always compute the plan (needs cloud state)
  say(`\n[push] root ${envFileName(flags.env)} → platforms (env=${flags.env}, mode=${mode})`)
  if (flags.fromBackup) say(`Source : ${relPath(flags.fromBackup)} (backup)`)
  else say(`Source : ${relPath(envFilePath(flags.env))}`)
  if (flags.vars) say(`Filter : ${flags.vars.join(', ')}`)
  if (flags.canary) say(`Canary : ${flags.canary}`)

  const cloudByLabel = fetchCloudState(entries, flags.env, !flags.vercelOnly, !flags.railwayOnly)

  const { rows } = computePlan(entries, cloudByLabel)
  renderPlan(rows, flags.env)

  if (mode === 'plan') {
    say('[plan] dry run complete. Re-run with --confirm to apply.')
    if (rows.some(r => r.op === 'delete')) {
      say('[plan] DELETE ops present → also pass --confirm-delete to apply them.')
    }
    say('')
    return
  }

  // mode === 'apply'
  if (flags.canary) {
    say(`[apply] canary → ${flags.canary} only`)
  } else {
    say('[apply] full rollout')
  }
  if (flags.confirmDelete) say('[apply] DELETE ops enabled (--confirm-delete)')
  say('')

  const res = applyPlan(flags, rows, entries)
  say('')
  say(
    `[done] pushed=${res.pushed} deleted=${res.deleted} failed=${res.failed}` +
      (res.manualRequired > 0 ? ` manual-required=${res.manualRequired}` : '')
  )
  if (res.manualRequired > 0) {
    say('')
    say('── Manual dashboard actions required ──')
    say('  The Railway/Vercel CLI does not support these ops non-interactively.')
    say('  Apply them via the web dashboard:')
    for (const op of res.manualOps) say(`    - ${op}`)
    say('  Dashboard: https://railway.app/dashboard')
  }
  say('')
  say(
    'Next step: pnpm secrets:healthcheck' + (flags.canary ? ` --service ${flags.canary}` : ' --all')
  )

  if (res.failed > 0) process.exit(1)
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[fatal] ${msg}\n`)
  process.exit(1)
})
