/**
 * Tests for PUSH-VERCEL-EMPTY-AS-DELETE-001 — the 3-way value semantics
 * (undefined / '' / value) in push-vercel.ts and push-railway.ts.
 *
 * Run :
 *   pnpm tsx --test scripts/env/__tests__/push-empty-delete.test.ts
 *
 * Coverage :
 *   - dotenv.parse() distinguishes absent keys (undefined) from explicitly
 *     empty values ('') — sanity check the upstream parser we rely on.
 *   - loadMergedEnv() preserves empty strings through the cascade for both
 *     Vercel and Railway scripts.
 *   - Empty values in a higher-precedence layer CORRECTLY override a populated
 *     lower layer (so the operator can DELETE a value previously set in
 *     `.env.local` by writing `KEY=` in `.env.staging` or `.env.production`).
 *
 * The CLI body itself (rm vs add dispatch, Promise.all parallel run, Railway
 * batch + remove) is integration-level and not unit-tested here — running it
 * requires a live Vercel / Railway CLI. The dispatch logic is small enough
 * (`if (v === '') toDelete.push(k); else entries.push([k, v])`) that the unit
 * tests on `loadMergedEnv()` + the dotenv sanity check are sufficient to lock
 * the cascade behavior in.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import * as dotenv from 'dotenv'
import { loadMergedEnv as loadVercelMergedEnv } from '../push-vercel.js'
import { loadMergedEnv as loadRailwayMergedEnv } from '../push-railway.js'

const ROOT = path.resolve('/repo')
const APP = 'ezpay'

function vercelPath(level: 'local' | 'staging' | 'production'): string {
  return path.join(ROOT, 'apps', APP, 'web', `.env.${level}`)
}
function railwayPath(level: 'local' | 'staging' | 'production'): string {
  return path.join(ROOT, 'apps', APP, 'api', `.env.${level}`)
}

function makeReadEnv(files: Record<string, Record<string, string>>) {
  return (absPath: string): Record<string, string> | null =>
    Object.prototype.hasOwnProperty.call(files, absPath) ? files[absPath] : null
}

// ────────────────────────────────────────────────────────────
// Sanity check : dotenv distinguishes undefined from empty string
// ────────────────────────────────────────────────────────────

describe('dotenv.parse() — undefined vs empty string distinction', () => {
  it('returns "" for `KEY=` (explicit empty)', () => {
    const parsed = dotenv.parse('KEY=')
    assert.equal(parsed.KEY, '')
    assert.equal(typeof parsed.KEY, 'string')
  })

  it('returns "" for `KEY=""` (quoted empty)', () => {
    const parsed = dotenv.parse('KEY=""')
    assert.equal(parsed.KEY, '')
  })

  it('does NOT include absent keys (they are missing, not undefined)', () => {
    const parsed = dotenv.parse('FOO=bar')
    assert.equal(parsed.KEY, undefined)
    assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'KEY'), false)
  })

  it('preserves a populated value', () => {
    const parsed = dotenv.parse('KEY=value')
    assert.equal(parsed.KEY, 'value')
  })
})

// ────────────────────────────────────────────────────────────
// Vercel cascade — empty string semantics
// ────────────────────────────────────────────────────────────

describe('loadMergedEnv (vercel) — empty values are preserved as ""', () => {
  it('an empty value in .env.local survives a single-layer cascade', () => {
    const readEnv = makeReadEnv({
      [vercelPath('local')]: { OLD_VAR: '', LIVE_VAR: 'something' },
    })
    const { merged } = loadVercelMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'local',
      readEnv,
    })
    assert.equal(merged.OLD_VAR, '')
    assert.equal(merged.LIVE_VAR, 'something')
    assert.equal(Object.prototype.hasOwnProperty.call(merged, 'OLD_VAR'), true)
  })

  it('empty in .env.staging OVERRIDES populated .env.local (operator clears the var on push)', () => {
    const readEnv = makeReadEnv({
      [vercelPath('local')]: { LEAKED_KEY: 'sk_test_xxx_leaked_value' },
      [vercelPath('staging')]: { LEAKED_KEY: '' },
    })
    const { merged } = loadVercelMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'staging',
      readEnv,
    })
    // The empty value wins → push-vercel will DELETE the var on Vercel.
    assert.equal(merged.LEAKED_KEY, '')
  })

  it('empty in .env.production overrides cascade (final say)', () => {
    const readEnv = makeReadEnv({
      [vercelPath('local')]: { LIVE_ONLY: 'local-value' },
      [vercelPath('staging')]: { LIVE_ONLY: 'staging-value' },
      [vercelPath('production')]: { LIVE_ONLY: '' },
    })
    const { merged } = loadVercelMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'production',
      readEnv,
    })
    assert.equal(merged.LIVE_ONLY, '')
  })

  it('a key absent from every layer is absent from merged (not "")', () => {
    const readEnv = makeReadEnv({
      [vercelPath('local')]: { ONLY_KEY: 'value' },
    })
    const { merged } = loadVercelMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'local',
      readEnv,
    })
    assert.equal(merged.NEVER_DEFINED, undefined)
    assert.equal(Object.prototype.hasOwnProperty.call(merged, 'NEVER_DEFINED'), false)
  })

  it('--override KEY= (empty value) wins over the cascade and triggers DELETE intent', () => {
    const readEnv = makeReadEnv({
      [vercelPath('local')]: { OLD_KEY: 'still-here' },
    })
    const { merged } = loadVercelMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'local',
      readEnv,
      overrides: { OLD_KEY: '' },
    })
    assert.equal(merged.OLD_KEY, '')
  })

  it('empty in lower layer is overridden by populated higher layer (no DELETE)', () => {
    // The reverse direction : `.env.local` clears it, `.env.staging` sets it
    // back. The push should TREAT this as upsert (the higher layer wins, the
    // var is meant to exist with a value).
    const readEnv = makeReadEnv({
      [vercelPath('local')]: { KEY: '' },
      [vercelPath('staging')]: { KEY: 'staging-value' },
    })
    const { merged } = loadVercelMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'staging',
      readEnv,
    })
    assert.equal(merged.KEY, 'staging-value')
  })
})

// ────────────────────────────────────────────────────────────
// Railway cascade — symmetric coverage
// ────────────────────────────────────────────────────────────

describe('loadMergedEnv (railway) — empty values are preserved as ""', () => {
  it('an empty value in .env.local survives a single-layer cascade', () => {
    const readEnv = makeReadEnv({
      [railwayPath('local')]: { OLD_VAR: '', LIVE_VAR: 'something' },
    })
    const { merged } = loadRailwayMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'local',
      readEnv,
    })
    assert.equal(merged.OLD_VAR, '')
    assert.equal(merged.LIVE_VAR, 'something')
  })

  it('empty in .env.staging overrides populated .env.local (operator clears on push)', () => {
    const readEnv = makeReadEnv({
      [railwayPath('local')]: { ROTATED_SECRET: 'sk_old_to_remove' },
      [railwayPath('staging')]: { ROTATED_SECRET: '' },
    })
    const { merged } = loadRailwayMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'staging',
      readEnv,
    })
    assert.equal(merged.ROTATED_SECRET, '')
  })

  it('empty in .env.production overrides cascade (final say)', () => {
    const readEnv = makeReadEnv({
      [railwayPath('local')]: { CHATTY_DEBUG_FLAG: 'true' },
      [railwayPath('staging')]: { CHATTY_DEBUG_FLAG: 'true' },
      [railwayPath('production')]: { CHATTY_DEBUG_FLAG: '' },
    })
    const { merged } = loadRailwayMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'production',
      readEnv,
    })
    assert.equal(merged.CHATTY_DEBUG_FLAG, '')
  })

  it('--override KEY= wins (DELETE intent) over the cascade', () => {
    const readEnv = makeReadEnv({
      [railwayPath('local')]: { OLD_KEY: 'still-here' },
    })
    const { merged } = loadRailwayMergedEnv({
      root: ROOT,
      app: APP,
      targetEnv: 'local',
      readEnv,
      overrides: { OLD_KEY: '' },
    })
    assert.equal(merged.OLD_KEY, '')
  })
})

// ────────────────────────────────────────────────────────────
// Dispatch shape check — the partition logic the CLI uses
// ────────────────────────────────────────────────────────────

describe('3-way partition (the CLI dispatch logic mirrored here for documentation)', () => {
  it('partitions a merged record into {toDelete, entries} based on value === ""', () => {
    // Mirrors the partition done inline in push-vercel.ts main() and
    // push-railway.ts. Documented here so the contract is locked even though
    // the partition is inline in the CLI body (no extracted helper to import).
    const merged: Record<string, string> = {
      KEEP_ME: 'value',
      DELETE_ME: '',
      ALSO_KEEP: 'another',
      ALSO_DELETE: '',
    }
    const toDelete: string[] = []
    const entries: Array<[string, string]> = []
    for (const [k, v] of Object.entries(merged)) {
      if (v === '') toDelete.push(k)
      else entries.push([k, v])
    }
    assert.deepEqual(toDelete.sort(), ['ALSO_DELETE', 'DELETE_ME'])
    assert.deepEqual(
      entries.sort(),
      [
        ['ALSO_KEEP', 'another'],
        ['KEEP_ME', 'value'],
      ].sort()
    )
  })
})
