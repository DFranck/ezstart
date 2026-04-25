#!/usr/bin/env tsx
/**
 * Audit drift between root `.env.{env}` and Railway + Vercel.
 *
 * Never mutates anything. Compares the local source of truth with the
 * resolved values on each platform using `VAR_TARGETS`:
 *
 *   - templated vars (MONGO_URL)   → expected value is the RESOLVED
 *                                    `{app}/{env}` string for each service
 *   - suffixed vars  (currently none) → expected per-service = local {VAR}_{APP}
 *   - plain vars                   → expected = local value pushed to each target
 *
 * Exit code: 0 if clean, 1 when --strict and any drift is found.
 *
 * Usage:
 *   pnpm tsx scripts/secrets-audit.ts --env production
 *   pnpm tsx scripts/secrets-audit.ts --strict
 *   pnpm tsx scripts/secrets-audit.ts --json
 */

import { mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ROOT,
  allAppNames,
  buildPushPlan,
  cliAvailable,
  envFileName,
  envFilePath,
  findUnknownVars,
  isPlatformVar,
  mask,
  parseEnvContent,
  parseEnvFile,
  parseFlags,
  railwayLink,
  railwayListVars,
  railwayTargetForApp,
  relPath,
  say,
  targetLabel,
  vercelEnvPull,
  vercelLink,
  vercelTargetForApp,
} from './lib/secrets-cli.js'

type DriftItem = {
  target: string
  key: string
  local: string | null
  cloud: string | null
  kind: 'ok' | 'missing_in_cloud' | 'missing_in_local' | 'drift'
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2))

  const file = envFilePath(flags.env)
  const source = parseEnvFile(file)
  if (!source) {
    say(`\n[x] ${relPath(file)} not found.\n`)
    process.exit(1)
  }

  if (!flags.json) {
    say(`\n[audit] local ${envFileName(flags.env)} vs cloud (env=${flags.env})\n`)
    const unknown = findUnknownVars(source)
    if (unknown.length > 0) {
      say('[warn] Unknown vars in local (not in VAR_TARGETS, ignored):')
      for (const k of unknown) say(`  - ${k}`)
      say('')
    }
  }

  const railwayOK = !flags.vercelOnly && cliAvailable('railway')
  const vercelOK = !flags.railwayOnly && cliAvailable('vercel')

  // ── Fetch cloud state ──
  const apps = allAppNames()
  const cloudByLabel = new Map<string, Record<string, string>>()

  if (railwayOK) {
    if (!flags.json) say('── Railway ──')
    for (const app of apps) {
      const rw = railwayTargetForApp(app)
      if (!rw) continue
      const label = targetLabel(rw)
      const link = railwayLink(rw, flags.env)
      if (!link.ok) {
        if (!flags.json) say(`  [x] ${label}: ${link.stderr.split('\n')[0] ?? 'link failed'}`)
        continue
      }
      const list = railwayListVars()
      if (!list.ok) {
        if (!flags.json) say(`  [x] ${label}: ${list.stderr.split('\n')[0] ?? 'list failed'}`)
        continue
      }
      const parsed = parseEnvContent(list.stdout)
      cloudByLabel.set(label, parsed)
      if (!flags.json) say(`  [ok] ${label} — ${Object.keys(parsed).length} var(s)`)
    }
    if (!flags.json) say('')
  }

  if (vercelOK) {
    if (!flags.json) say('── Vercel ──')
    const tmpRoot = resolve(ROOT, 'tmp', 'secrets-audit-vercel')
    mkdirSync(tmpRoot, { recursive: true })
    for (const app of apps) {
      const vc = vercelTargetForApp(app)
      const label = targetLabel(vc)
      const projDir = resolve(tmpRoot, vc.project)
      mkdirSync(projDir, { recursive: true })
      const link = vercelLink(vc, projDir)
      if (!link.ok) {
        if (!flags.json) say(`  [x] ${label}: ${link.stderr.split('\n')[0] ?? 'link failed'}`)
        continue
      }
      const outFile = resolve(projDir, '.env.pull')
      const pull = vercelEnvPull(outFile, flags.env, projDir)
      if (!pull.ok) {
        if (!flags.json) say(`  [x] ${label}: ${pull.stderr.split('\n')[0] ?? 'pull failed'}`)
        continue
      }
      const parsed = parseEnvFile(outFile)
      if (!parsed) continue
      cloudByLabel.set(label, parsed)
      if (!flags.json) say(`  [ok] ${label} — ${Object.keys(parsed).length} var(s)`)
    }
    try {
      rmSync(tmpRoot, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    if (!flags.json) say('')
  }

  // ── Compare using the same push-plan logic ──
  const plan = buildPushPlan(source, {
    env: flags.env,
    restrict: flags.vars,
    includeRailway: !flags.vercelOnly,
    includeVercel: !flags.railwayOnly,
  })

  const report: DriftItem[] = []

  for (const entry of plan) {
    const label = targetLabel(entry.target)
    const cloud = cloudByLabel.get(label)
    if (!cloud) continue // skip targets we couldn't fetch
    const cloudVal = cloud[entry.exportedKey]
    if (cloudVal === undefined) {
      report.push({
        target: label,
        key: entry.exportedKey,
        local: entry.value,
        cloud: null,
        kind: 'missing_in_cloud',
      })
    } else if (cloudVal !== entry.value) {
      report.push({
        target: label,
        key: entry.exportedKey,
        local: entry.value,
        cloud: cloudVal,
        kind: 'drift',
      })
    } else {
      report.push({
        target: label,
        key: entry.exportedKey,
        local: entry.value,
        cloud: cloudVal,
        kind: 'ok',
      })
    }
  }

  // Also report cloud-side vars that are NOT in our plan (missing in local)
  const planned = new Set(plan.map(e => `${targetLabel(e.target)}::${e.exportedKey}`))
  for (const [label, vars] of cloudByLabel) {
    for (const key of Object.keys(vars)) {
      if (planned.has(`${label}::${key}`)) continue
      // Ignore platform-injected vars (Vercel/Railway/Turbo/Nixpacks/system)
      if (isPlatformVar(key)) continue
      // Ignore the ambient PORT (Railway sets it, apps read it via @ezstart/config)
      if (key === 'PORT') continue
      report.push({
        target: label,
        key,
        local: null,
        cloud: vars[key] ?? null,
        kind: 'missing_in_local',
      })
    }
  }

  const counts = {
    ok: report.filter(r => r.kind === 'ok').length,
    missing_in_cloud: report.filter(r => r.kind === 'missing_in_cloud').length,
    missing_in_local: report.filter(r => r.kind === 'missing_in_local').length,
    drift: report.filter(r => r.kind === 'drift').length,
  }

  if (flags.json) {
    const masked = report.map(r => ({
      target: r.target,
      key: r.key,
      kind: r.kind,
      local: r.local !== null ? mask(r.local) : null,
      cloud: r.cloud !== null ? mask(r.cloud) : null,
    }))
    process.stdout.write(`${JSON.stringify({ counts, report: masked }, null, 2)}\n`)
  } else {
    say('── Report ──')
    say(`  [ok]  OK                : ${counts.ok}`)
    say(`  [^]   MISSING IN CLOUD  : ${counts.missing_in_cloud}`)
    say(`  [v]   MISSING IN LOCAL  : ${counts.missing_in_local}`)
    say(`  [!]   DRIFT             : ${counts.drift}`)
    say('')

    for (const kind of ['missing_in_cloud', 'drift', 'missing_in_local'] as const) {
      const rows = report.filter(r => r.kind === kind)
      if (rows.length === 0) continue
      say(`── ${kind.replace(/_/g, ' ').toUpperCase()} ──`)
      for (const r of rows) {
        say(`  ${r.target}  ${r.key}`)
        if (r.local !== null) say(`    local = ${mask(r.local)}`)
        if (r.cloud !== null) say(`    cloud = ${mask(r.cloud)}`)
      }
      say('')
    }
  }

  const hasDrift = counts.missing_in_cloud > 0 || counts.drift > 0 || counts.missing_in_local > 0

  if (flags.strict && hasDrift) {
    if (!flags.json) say('[strict] drift detected — exit 1\n')
    process.exit(1)
  }

  if (!flags.json) say(hasDrift ? '[warn] drift detected\n' : '[done] no drift\n')
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[fatal] ${msg}\n`)
  process.exit(1)
})
