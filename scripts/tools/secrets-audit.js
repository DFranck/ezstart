#!/usr/bin/env node
/**
 * Audit secrets drift between root .env.production and Vercel + Railway.
 *
 * Usage:
 *   pnpm secrets:audit                  # full audit
 *   pnpm secrets:audit -- --vercel-only
 *   pnpm secrets:audit -- --railway-only
 *   pnpm secrets:audit -- --strict      # exit 1 if drift detected (CI mode)
 *   pnpm secrets:audit -- --json        # machine-readable output
 *
 * Categories:
 *   OK                — same value local + cloud
 *   MISSING_IN_CLOUD  — in local, absent from cloud (needs push)
 *   MISSING_IN_LOCAL  — absent local, present cloud (pull or ignore)
 *   DRIFT             — present both, values differ
 */

const path = require('path')
const {
  RAILWAY_SERVICES,
  VERCEL_PROJECTS,
  fetchVercelEnv,
  fetchRailwayEnv,
  buildVarIndex,
  classifyVar,
  classifyKeyForTarget,
  parseEnvFile,
  mask,
} = require('./lib/secrets-fetch')

const ROOT = path.resolve(__dirname, '..', '..')
const args = process.argv.slice(2)
const vercelOnly = args.includes('--vercel-only')
const railwayOnly = args.includes('--railway-only')
const strict = args.includes('--strict')
const asJson = args.includes('--json')

const sourceFile = path.join(ROOT, '.env.production')
const rawLocal = parseEnvFile(sourceFile) || {}

// Unprefix per-app vars into per-target views, so we can compare with cloud
// (which stores unprefixed names scoped to each service/project).
//   localByTarget[targetLabel] = { unprefixedKey → value }
const localByTarget = {}
const allTargets = [
  ...VERCEL_PROJECTS.map(p => ({ label: `vercel/${p.project}`, prefix: p.prefix })),
  ...RAILWAY_SERVICES.map(s => ({ label: `railway/${s.service}`, prefix: s.prefix })),
]
for (const t of allTargets) localByTarget[t.label] = {}

for (const [rootKey, value] of Object.entries(rawLocal)) {
  for (const t of allTargets) {
    const { kind, exportedKey } = classifyKeyForTarget(rootKey, t.prefix)
    if (kind === 'foreign') continue
    localByTarget[t.label][exportedKey] = value
  }
}

// Flat "local" view: union of all per-target unprefixed views + shared vars.
// Used by the existing comparison logic below as a best-effort overview.
const local = {}
for (const targetVars of Object.values(localByTarget)) {
  for (const [k, v] of Object.entries(targetVars)) {
    // First writer wins — per-app vars with differing values will be caught
    // as conflicts by the cloud-side classifier anyway.
    if (!(k in local)) local[k] = v
  }
}

// ── Fetch ────────────────────────────────────────────────────────────────
const silentLog = () => {}
const log = asJson ? silentLog : msg => console.log(msg)

if (!asJson) console.log('\n🔍 Auditing secrets: local vs cloud\n')

let vercel = {}
let railway = {}

if (!railwayOnly) {
  if (!asJson) console.log('── VERCEL ──')
  vercel = fetchVercelEnv({ cwd: ROOT, log })
  if (!asJson) console.log('')
}
if (!vercelOnly) {
  if (!asJson) console.log('── RAILWAY ──')
  railway = fetchRailwayEnv({ cwd: ROOT, log })
  if (!asJson) console.log('')
}

// ── Classify ─────────────────────────────────────────────────────────────
const cloudIndex = buildVarIndex({ vercel, railway })
const allKeys = new Set([...Object.keys(local), ...Object.keys(cloudIndex)])

const report = {
  ok: [], // { key }
  missingInCloud: [], // { key, localValue }
  missingInLocal: [], // { key, occurrences }
  drift: [], // { key, localValue, occurrences }
  cloudConflict: [], // { key, occurrences } — differ across cloud targets
}

for (const key of allKeys) {
  const localVal = local[key]
  const occurrences = cloudIndex[key] || {}
  const cloudSources = Object.keys(occurrences)

  if (localVal !== undefined && cloudSources.length === 0) {
    report.missingInCloud.push({ key, localValue: localVal })
    continue
  }

  if (localVal === undefined && cloudSources.length > 0) {
    report.missingInLocal.push({ key, occurrences })
    continue
  }

  // Present both
  const { isConflict, consensusValue } = classifyVar(occurrences)
  if (isConflict) {
    // Cloud itself is inconsistent
    report.cloudConflict.push({ key, localValue: localVal, occurrences })
    // Also flag as drift if local matches none
    if (!Object.values(occurrences).includes(localVal)) {
      report.drift.push({ key, localValue: localVal, occurrences })
    }
    continue
  }

  if (localVal === consensusValue) {
    report.ok.push({ key })
  } else {
    report.drift.push({ key, localValue: localVal, occurrences })
  }
}

// ── Output ───────────────────────────────────────────────────────────────
if (asJson) {
  const masked = {
    ok: report.ok.map(r => r.key),
    missingInCloud: report.missingInCloud.map(r => ({ key: r.key, local: mask(r.localValue) })),
    missingInLocal: report.missingInLocal.map(r => ({
      key: r.key,
      cloud: Object.fromEntries(Object.entries(r.occurrences).map(([s, v]) => [s, mask(v)])),
    })),
    drift: report.drift.map(r => ({
      key: r.key,
      local: mask(r.localValue),
      cloud: Object.fromEntries(Object.entries(r.occurrences).map(([s, v]) => [s, mask(v)])),
    })),
    cloudConflict: report.cloudConflict.map(r => ({
      key: r.key,
      local: mask(r.localValue),
      cloud: Object.fromEntries(Object.entries(r.occurrences).map(([s, v]) => [s, mask(v)])),
    })),
  }
  console.log(JSON.stringify(masked, null, 2))
} else {
  console.log('── REPORT ──')
  console.log(`  ✅ OK                 : ${report.ok.length}`)
  console.log(`  ⬆  MISSING IN CLOUD   : ${report.missingInCloud.length}`)
  console.log(`  ⬇  MISSING IN LOCAL   : ${report.missingInLocal.length}`)
  console.log(`  ⚠  DRIFT              : ${report.drift.length}`)
  console.log(`  ⚠  CLOUD CONFLICT     : ${report.cloudConflict.length}`)
  console.log('')

  if (report.missingInCloud.length) {
    console.log('⬆ MISSING IN CLOUD (run `pnpm secrets:sync`):')
    for (const { key, localValue } of report.missingInCloud) {
      console.log(`  ${key} = ${mask(localValue)}`)
    }
    console.log('')
  }

  if (report.missingInLocal.length) {
    console.log('⬇ MISSING IN LOCAL (run `pnpm secrets:pull` or ignore if app-specific):')
    for (const { key, occurrences } of report.missingInLocal) {
      const sources = Object.keys(occurrences)
      console.log(`  ${key}  (in ${sources.join(', ')})`)
    }
    console.log('')
  }

  if (report.drift.length) {
    console.log('⚠ DRIFT (local ≠ cloud):')
    for (const { key, localValue, occurrences } of report.drift) {
      console.log(`  ${key}`)
      console.log(`    local = ${mask(localValue)}`)
      for (const [src, val] of Object.entries(occurrences)) {
        console.log(`    ${src} = ${mask(val)}`)
      }
    }
    console.log('')
  }

  if (report.cloudConflict.length) {
    console.log('⚠ CLOUD CONFLICT (same key, different values across cloud targets):')
    for (const { key, occurrences } of report.cloudConflict) {
      console.log(`  ${key}`)
      for (const [src, val] of Object.entries(occurrences)) {
        console.log(`    ${src} = ${mask(val)}`)
      }
    }
    console.log('')
  }
}

const hasDrift =
  report.missingInCloud.length > 0 || report.drift.length > 0 || report.cloudConflict.length > 0

if (strict && hasDrift) {
  if (!asJson) console.log('❌ Drift detected (strict mode) — exit 1\n')
  process.exit(1)
}

if (!asJson) {
  console.log(hasDrift ? '⚠  Drift detected.\n' : '✅ No drift.\n')
}
