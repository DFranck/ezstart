#!/usr/bin/env tsx
/**
 * Pull secrets from Railway services + Vercel projects → write root `.env.{env}`.
 *
 * Inverse of secrets-push. Source of truth stays on the platforms; we
 * reconstruct a single root env file using `VAR_TARGETS` to know which var
 * belongs where.
 *
 * Rules:
 *   - `suffixed` vars (SENTRY_DSN): each Railway service's SENTRY_DSN is
 *     rewritten to `SENTRY_DSN_{APP}` in the root file.
 *   - `template` vars (MONGO_URL): NOT pulled (template lives in root, each
 *     platform stores its resolved value — pulling would lose the template).
 *     Instead, we emit a warning if one is missing from the root.
 *   - Every other var: pulled as-is; if it's present on multiple targets with
 *     the same value → kept shared; divergent values → flagged as drift (not
 *     written).
 *   - Unknown vars (not declared in VAR_TARGETS): passed through if already in
 *     the local file under --merge, otherwise ignored.
 *
 * Usage:
 *   pnpm tsx scripts/secrets-pull.ts --env production
 *   pnpm tsx scripts/secrets-pull.ts --dry-run
 *   pnpm tsx scripts/secrets-pull.ts --vercel-only
 *   pnpm tsx scripts/secrets-pull.ts --merge           # preserve local-only keys
 *
 * A timestamped backup of the target file is ALWAYS written to `tmp/` before
 * overwriting.
 */

import { mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ROOT,
  allAppNames,
  backupEnvFile,
  cliAvailable,
  envFileName,
  envFilePath,
  isPlatformVar,
  mask,
  parseEnvContent,
  parseEnvFile,
  parseFlags,
  railwayLink,
  railwayListVars,
  relPath,
  say,
  vercelEnvPull,
  vercelLink,
  vercelTargetForApp,
  railwayTargetForApp,
  writeEnvFile,
} from './lib/secrets-cli.js'
import { VAR_TARGETS, resolveTargetApps, appToEnvSuffix, type VarName } from '@ezstart/config'

type Occurrence = { source: string; value: string }

/**
 * Remove platform-injected vars from a cloud var map before merging into
 * the local `.env.*`. These vars are set by Vercel/Railway themselves and
 * must never leak into the committed-off-cluster source of truth.
 */
function stripPlatformVars(vars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(vars)) {
    if (isPlatformVar(k)) continue
    out[k] = v
  }
  return out
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2))

  say(
    flags.dryRun
      ? `\n[dry-run] no file will be written — env=${flags.env}\n`
      : `\n[pull] platforms → root ${envFileName(flags.env)} (env=${flags.env})\n`
  )

  const railwayOK = !flags.vercelOnly && cliAvailable('railway')
  const vercelOK = !flags.railwayOnly && cliAvailable('vercel')
  if (!flags.vercelOnly && !railwayOK) {
    say('[warn] Railway CLI not found. Install: npm i -g @railway/cli')
  }
  if (!flags.railwayOnly && !vercelOK) {
    say('[warn] Vercel CLI not found. Install: pnpm add -g vercel')
  }

  const apps = allAppNames()
  const cloudByApp: Record<string, { api?: Record<string, string>; web?: Record<string, string> }> =
    {}

  // ── Fetch Railway (API layer) ──
  if (railwayOK) {
    say('── Railway ──')
    for (const app of apps) {
      const rw = railwayTargetForApp(app)
      if (!rw) continue
      const linkRes = railwayLink(rw, flags.env)
      if (!linkRes.ok) {
        say(`  [x] railway/${rw.service}: ${linkRes.stderr.split('\n')[0] ?? 'link failed'}`)
        continue
      }
      const listRes = railwayListVars()
      if (!listRes.ok) {
        say(`  [x] railway/${rw.service}: ${listRes.stderr.split('\n')[0] ?? 'list failed'}`)
        continue
      }
      const parsed = parseEnvContent(listRes.stdout)
      const filtered = stripPlatformVars(parsed)
      cloudByApp[app] ??= {}
      cloudByApp[app].api = filtered
      say(`  [ok] railway/${rw.service} — ${Object.keys(filtered).length} var(s)`)
    }
    say('')
  }

  // ── Fetch Vercel (Web layer) ──
  if (vercelOK) {
    say('── Vercel ──')
    const tmpRoot = resolve(ROOT, 'tmp', 'secrets-pull-vercel')
    mkdirSync(tmpRoot, { recursive: true })

    for (const app of apps) {
      const vc = vercelTargetForApp(app)
      const projDir = resolve(tmpRoot, vc.project)
      mkdirSync(projDir, { recursive: true })
      const linkRes = vercelLink(vc, projDir)
      if (!linkRes.ok) {
        say(`  [x] vercel/${vc.project}: ${linkRes.stderr.split('\n')[0] ?? 'link failed'}`)
        continue
      }
      const outFile = resolve(projDir, '.env.pull')
      const pullRes = vercelEnvPull(outFile, flags.env, projDir)
      if (!pullRes.ok) {
        say(`  [x] vercel/${vc.project}: ${pullRes.stderr.split('\n')[0] ?? 'pull failed'}`)
        continue
      }
      const parsed = parseEnvFile(outFile)
      if (!parsed) {
        say(`  [warn] vercel/${vc.project}: empty pull`)
        continue
      }
      const filtered = stripPlatformVars(parsed)
      cloudByApp[app] ??= {}
      cloudByApp[app].web = filtered
      say(`  [ok] vercel/${vc.project} — ${Object.keys(filtered).length} var(s)`)
    }
    try {
      rmSync(tmpRoot, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    say('')
  }

  // ── Reconstruct root env ──
  const allApps = allAppNames()
  const final: Record<string, string> = {}
  const drift: Array<{ key: string; occurrences: Occurrence[] }> = []

  for (const rawName of Object.keys(VAR_TARGETS)) {
    const varName = rawName as VarName
    const t = VAR_TARGETS[varName]

    if (t.template === true) {
      // Don't pull template vars — the root keeps the template form.
      continue
    }

    if (t.suffixed === true) {
      // Each Railway service's {varName} → root as {varName}_{APP}
      const apiApps = resolveTargetApps(varName, allApps, { layer: 'api' })
      for (const app of apiApps) {
        const val = cloudByApp[app]?.api?.[varName]
        if (val === undefined || val === '') continue
        const suffix = appToEnvSuffix(app)
        final[`${varName}_${suffix}`] = val
      }
      continue
    }

    // Plain vars: collect occurrences and look for consensus
    const occurrences: Occurrence[] = []
    const apiApps = resolveTargetApps(varName, allApps, { layer: 'api' })
    for (const app of apiApps) {
      const val = cloudByApp[app]?.api?.[varName]
      if (val === undefined) continue
      occurrences.push({ source: `railway/${app}`, value: val })
    }
    const webApps = resolveTargetApps(varName, allApps, {
      layer: 'web',
      withWebOverrides: true,
    })
    for (const app of webApps) {
      const val = cloudByApp[app]?.web?.[varName]
      if (val === undefined) continue
      occurrences.push({ source: `vercel/${app}`, value: val })
    }

    if (occurrences.length === 0) continue
    const values = new Set(occurrences.map(o => o.value))
    if (values.size === 1) {
      final[varName] = [...values][0] ?? ''
    } else {
      drift.push({ key: varName, occurrences })
    }
  }

  // Merge mode: preserve local-only keys
  const existing = parseEnvFile(envFilePath(flags.env))
  if (flags.merge && existing) {
    for (const [k, v] of Object.entries(existing)) {
      if (!(k in final)) final[k] = v
    }
  }

  // ── Report ──
  say('── Plan ──')
  say(`  vars to write : ${Object.keys(final).length}`)
  for (const [k, v] of Object.entries(final)) {
    say(`    ${k}=${mask(v)}`)
  }
  if (drift.length > 0) {
    say('')
    say(`  [warn] drift (NOT written): ${drift.length}`)
    for (const d of drift) {
      say(`    ${d.key}`)
      for (const o of d.occurrences) {
        say(`      ${o.source} = ${mask(o.value)}`)
      }
    }
  }
  say('')

  if (flags.dryRun) {
    say('[dry-run] complete. Re-run without --dry-run to write.\n')
    return
  }

  if (Object.keys(final).length === 0) {
    say('[info] nothing to write (no vars fetched).\n')
    return
  }

  // Backup existing
  const backup = backupEnvFile(flags.env)
  if (backup) {
    say(`[backup] ${relPath(backup)}`)
  }

  const header =
    `@ezstart — ${flags.env} secrets (pulled from Vercel + Railway)\n` +
    `Generated: ${new Date().toISOString()}\n` +
    'Root-only generic-name architecture. NEVER commit this file.'
  writeEnvFile(flags.env, final, header)
  say(`[done] wrote ${relPath(envFilePath(flags.env))} (${Object.keys(final).length} var(s))\n`)
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[fatal] ${msg}\n`)
  process.exit(1)
})
