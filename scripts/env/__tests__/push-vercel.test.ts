/**
 * Tests for the cascade merge logic of `scripts/env/push-vercel.ts`.
 *
 * Run:
 *   pnpm tsx --test scripts/env/__tests__/push-vercel.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {
  cascadeLayers,
  loadMergedEnv,
  parseFlags,
  type LoadMergedEnvInput,
} from '../push-vercel.js'

// ────────────────────────────────────────────────────────────
// Fixtures: fake per-app env files, keyed by absolute path
// ────────────────────────────────────────────────────────────

const ROOT = path.resolve('/repo')
const APP = 'ezpay'

function appPath(level: 'local' | 'staging' | 'production'): string {
  return path.join(ROOT, 'apps', APP, 'web', `.env.${level}`)
}

function makeReadEnv(files: Record<string, Record<string, string>>) {
  // Returns null for files that are not in the fixture (== not on disk).
  // Returns the record for files that "exist", even if empty.
  return (absPath: string): Record<string, string> | null =>
    Object.prototype.hasOwnProperty.call(files, absPath) ? files[absPath] : null
}

function baseInput(
  overrides: Partial<LoadMergedEnvInput> & Pick<LoadMergedEnvInput, 'targetEnv' | 'readEnv'>
): LoadMergedEnvInput {
  return {
    root: ROOT,
    app: APP,
    ...overrides,
  }
}

// ────────────────────────────────────────────────────────────
// cascadeLayers — pure function
// ────────────────────────────────────────────────────────────

describe('cascadeLayers', () => {
  it('returns [local] for local', () => {
    assert.deepEqual(cascadeLayers('local'), ['local'])
  })
  it('returns [local, staging] for staging', () => {
    assert.deepEqual(cascadeLayers('staging'), ['local', 'staging'])
  })
  it('returns [local, staging, production] for production (staging cascades into prod)', () => {
    assert.deepEqual(cascadeLayers('production'), ['local', 'staging', 'production'])
  })
})

// ────────────────────────────────────────────────────────────
// loadMergedEnv — cascade behavior (per-app only, no root layer)
// ────────────────────────────────────────────────────────────

describe('loadMergedEnv — local only', () => {
  it('loads only per-app .env.local', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: {
        NEXT_PUBLIC_EZPAY_KEY: 'app-local',
        DEPLOY_ENV: 'local',
      },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'local', readEnv }))
    assert.equal(merged.DEPLOY_ENV, 'local')
    assert.equal(merged.NEXT_PUBLIC_EZPAY_KEY, 'app-local')
    assert.equal(Object.keys(merged).length, 2)
  })

  it('returns empty when per-app file is missing', () => {
    const readEnv = makeReadEnv({})
    const { merged, sources } = loadMergedEnv(baseInput({ targetEnv: 'local', readEnv }))
    assert.equal(Object.keys(merged).length, 0)
    assert.equal(sources.length, 1)
    assert.equal(sources[0].exists, false)
  })
})

describe('loadMergedEnv — staging cascade (local + staging, per-app only)', () => {
  it('staging overrides local', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: {
        NEXT_PUBLIC_EZPAY_API_URL: 'http://localhost:6130',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_xxx',
        DEPLOY_ENV: 'local',
      },
      [appPath('staging')]: {
        NEXT_PUBLIC_EZPAY_API_URL: 'https://ezpay-api-staging.up.railway.app',
        DEPLOY_ENV: 'staging',
      },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'staging', readEnv }))

    // Staging overrides local
    assert.equal(merged.NEXT_PUBLIC_EZPAY_API_URL, 'https://ezpay-api-staging.up.railway.app')
    assert.equal(merged.DEPLOY_ENV, 'staging')
    // Local not overridden still present
    assert.equal(merged.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, 'pk_test_xxx')
  })

  it('missing staging file falls back to local cleanly', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: { NEXT_PUBLIC_X: 'local', DEPLOY_ENV: 'local' },
      // No staging file
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'staging', readEnv }))
    assert.equal(merged.NEXT_PUBLIC_X, 'local')
    assert.equal(merged.DEPLOY_ENV, 'local') // no override available
  })
})

describe('loadMergedEnv — production cascade (local + staging + production, per-app only)', () => {
  it('production overrides staging overrides local (3-layer cascade)', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: {
        NEXT_PUBLIC_EZPAY_KEY: 'ez_pk_test_local',
        DEPLOY_ENV: 'local',
      },
      [appPath('staging')]: {
        // staging overrides local and is INHERITED by production
        NEXT_PUBLIC_EZPAY_KEY: 'ez_pk_test_staging',
        DEPLOY_ENV: 'staging',
      },
      [appPath('production')]: {
        NEXT_PUBLIC_EZPAY_KEY: 'ez_pk_live_prod',
        DEPLOY_ENV: 'production',
      },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'production', readEnv }))
    assert.equal(merged.NEXT_PUBLIC_EZPAY_KEY, 'ez_pk_live_prod')
    assert.equal(merged.DEPLOY_ENV, 'production')
  })

  it('staging defaults cascade into production when production does not override', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: {
        DEPLOY_ENV: 'local',
        API_URL: 'http://localhost:6130',
        COOKIE_DOMAIN: '.localhost',
      },
      [appPath('staging')]: {
        // shared staging+prod defaults (non-dev)
        DEPLOY_ENV: 'production',
        API_URL: 'https://api-staging.example.com',
        COOKIE_DOMAIN: '.example.com',
      },
      [appPath('production')]: {
        // only the deltas from staging
        API_URL: 'https://api.example.com',
      },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'production', readEnv }))
    // staging value cascades in
    assert.equal(merged.DEPLOY_ENV, 'production')
    assert.equal(merged.COOKIE_DOMAIN, '.example.com')
    // production overrides staging
    assert.equal(merged.API_URL, 'https://api.example.com')
  })

  it('keeps values from .env.local when neither staging nor production override them', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: { KEEP_ME: 'from-local', A: 'local-a' },
      [appPath('production')]: { A: 'prod-a', C: 'prod-c' },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'production', readEnv }))
    assert.equal(merged.KEEP_ME, 'from-local')
    assert.equal(merged.A, 'prod-a')
    assert.equal(merged.C, 'prod-c')
  })
})

describe('loadMergedEnv — --from single-source override', () => {
  it('--from staging loads ONLY staging file (cascade bypassed)', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: { SHOULD_NOT_APPEAR: 'from-local' },
      [appPath('staging')]: { ONLY_STAGING: 'yes' },
    })
    const { merged } = loadMergedEnv(
      baseInput({ targetEnv: 'production', fromOverride: 'staging', readEnv })
    )
    assert.equal(merged.ONLY_STAGING, 'yes')
    assert.equal(merged.SHOULD_NOT_APPEAR, undefined)
  })

  it('--from local behaves like legacy single-source push', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: { FOO: 'local' },
      [appPath('staging')]: { FOO: 'staging-should-not-appear' },
    })
    const { merged } = loadMergedEnv(
      baseInput({ targetEnv: 'staging', fromOverride: 'local', readEnv })
    )
    assert.equal(merged.FOO, 'local')
    assert.equal(Object.keys(merged).length, 1)
  })
})

describe('loadMergedEnv — --override is applied LAST', () => {
  it('--override beats every cascade level', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: { KEY: 'local' },
      [appPath('production')]: { KEY: 'prod' },
    })
    const { merged } = loadMergedEnv(
      baseInput({
        targetEnv: 'production',
        readEnv,
        overrides: { KEY: 'override-wins' },
      })
    )
    assert.equal(merged.KEY, 'override-wins')
  })

  it('--override adds brand-new keys not in any file', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: { EXISTING: 'yes' },
    })
    const { merged } = loadMergedEnv(
      baseInput({
        targetEnv: 'local',
        readEnv,
        overrides: { NEW_KEY: 'injected' },
      })
    )
    assert.equal(merged.EXISTING, 'yes')
    assert.equal(merged.NEW_KEY, 'injected')
  })

  it('combines --from with --override', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: { KEY: 'local' },
      [appPath('staging')]: { KEY: 'staging' },
    })
    const { merged } = loadMergedEnv(
      baseInput({
        targetEnv: 'production',
        fromOverride: 'local',
        readEnv,
        overrides: { KEY: 'manual' },
      })
    )
    assert.equal(merged.KEY, 'manual')
    assert.equal(Object.keys(merged).length, 1)
  })
})

// ────────────────────────────────────────────────────────────
// sources metadata
// ────────────────────────────────────────────────────────────

describe('loadMergedEnv — sources metadata', () => {
  it('reports one entry per cascade level (per-app only, no root)', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: { X: '1' },
    })
    const { sources } = loadMergedEnv(baseInput({ targetEnv: 'production', readEnv }))
    // production cascade = [local, staging, production] → 3 source entries
    assert.equal(sources.length, 3)
    const order = sources.map(s => s.level)
    assert.deepEqual(order, ['local', 'staging', 'production'])
  })

  it('marks missing files as exists:false', () => {
    const readEnv = makeReadEnv({
      [appPath('local')]: { X: '1' },
    })
    const { sources } = loadMergedEnv(baseInput({ targetEnv: 'staging', readEnv }))
    const local = sources.find(s => s.level === 'local')!
    const staging = sources.find(s => s.level === 'staging')!
    assert.equal(local.exists, true)
    assert.equal(staging.exists, false)
  })
})

// ────────────────────────────────────────────────────────────
// parseFlags
// ────────────────────────────────────────────────────────────

describe('parseFlags', () => {
  it('parses --from', () => {
    const f = parseFlags(['--from', 'local'])
    assert.equal(f.from, 'local')
    assert.equal(f.dryRun, false)
  })

  it('parses --dry-run', () => {
    const f = parseFlags(['--dry-run'])
    assert.equal(f.dryRun, true)
  })

  it('parses multiple --override pairs', () => {
    const f = parseFlags(['--override', 'A=1,B=two,C=has=equals'])
    assert.deepEqual(f.overrides, { A: '1', B: 'two', C: 'has=equals' })
  })

  it('combines flags', () => {
    const f = parseFlags(['--from', 'staging', '--override', 'K=v', '--dry-run'])
    assert.equal(f.from, 'staging')
    assert.equal(f.dryRun, true)
    assert.deepEqual(f.overrides, { K: 'v' })
  })
})
