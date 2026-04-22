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
// Fixtures: fake root + per-app env files, keyed by absolute path
// ────────────────────────────────────────────────────────────

const ROOT = path.resolve('/repo')
const APP = 'ezpay'

function appPath(level: 'local' | 'staging' | 'production'): string {
  return path.join(ROOT, 'apps', APP, 'web', `.env.${level}`)
}
function rootPath(level: 'local' | 'staging' | 'production'): string {
  return path.join(ROOT, `.env.${level}`)
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
  it('returns [local, staging, production] for production', () => {
    assert.deepEqual(cascadeLayers('production'), ['local', 'staging', 'production'])
  })
})

// ────────────────────────────────────────────────────────────
// loadMergedEnv — cascade behavior
// ────────────────────────────────────────────────────────────

describe('loadMergedEnv — local only', () => {
  it('loads root .env.local + per-app .env.local', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { JWT_SECRET: 'root-local', DEPLOY_ENV: 'local' },
      [appPath('local')]: { NEXT_PUBLIC_EZPAY_KEY: 'app-local' },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'local', readEnv }))
    assert.equal(merged.JWT_SECRET, 'root-local')
    assert.equal(merged.DEPLOY_ENV, 'local')
    assert.equal(merged.NEXT_PUBLIC_EZPAY_KEY, 'app-local')
    assert.equal(Object.keys(merged).length, 3)
  })

  it('per-app overrides root when same key', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { SHARED: 'root', ROOT_ONLY: 'yes' },
      [appPath('local')]: { SHARED: 'app', APP_ONLY: 'yes' },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'local', readEnv }))
    assert.equal(merged.SHARED, 'app')
    assert.equal(merged.ROOT_ONLY, 'yes')
    assert.equal(merged.APP_ONLY, 'yes')
  })

  it('works when per-app file is missing', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { JWT_SECRET: 'root-local' },
    })
    const { merged, sources } = loadMergedEnv(baseInput({ targetEnv: 'local', readEnv }))
    assert.equal(merged.JWT_SECRET, 'root-local')
    assert.ok(sources.some(s => s.scope === 'app' && s.level === 'local'))
  })
})

describe('loadMergedEnv — staging cascade (local + staging)', () => {
  it('staging overrides local at both root and app levels', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: {
        JWT_SECRET: 'shared-jwt',
        MONGO_URL: 'mongodb+srv://local',
        DEPLOY_ENV: 'local',
      },
      [rootPath('staging')]: {
        MONGO_URL: 'mongodb+srv://staging',
        DEPLOY_ENV: 'staging',
      },
      [appPath('local')]: {
        NEXT_PUBLIC_EZPAY_API_URL: 'http://localhost:6130',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_xxx',
      },
      [appPath('staging')]: {
        NEXT_PUBLIC_EZPAY_API_URL: 'https://ezpay-api-staging.up.railway.app',
      },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'staging', readEnv }))

    // From root local (not overridden)
    assert.equal(merged.JWT_SECRET, 'shared-jwt')
    // Root staging overrides root local
    assert.equal(merged.MONGO_URL, 'mongodb+srv://staging')
    assert.equal(merged.DEPLOY_ENV, 'staging')
    // App staging overrides app local
    assert.equal(merged.NEXT_PUBLIC_EZPAY_API_URL, 'https://ezpay-api-staging.up.railway.app')
    // App local not overridden by staging (still there)
    assert.equal(merged.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, 'pk_test_xxx')
  })

  it('missing staging files fall back to local cleanly', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { JWT_SECRET: 'shared', DEPLOY_ENV: 'local' },
      [appPath('local')]: { NEXT_PUBLIC_X: 'local' },
      // No staging files at all
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'staging', readEnv }))
    assert.equal(merged.JWT_SECRET, 'shared')
    assert.equal(merged.DEPLOY_ENV, 'local') // no override available
    assert.equal(merged.NEXT_PUBLIC_X, 'local')
  })
})

describe('loadMergedEnv — production cascade (local + staging + production)', () => {
  it('production overrides staging which overrides local', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: {
        JWT_SECRET: 'local-jwt',
        MONGO_URL: 'mongodb://local',
        DEPLOY_ENV: 'local',
      },
      [rootPath('staging')]: {
        MONGO_URL: 'mongodb://staging',
        DEPLOY_ENV: 'staging',
      },
      [rootPath('production')]: {
        JWT_SECRET: 'prod-jwt',
        MONGO_URL: 'mongodb://prod',
        DEPLOY_ENV: 'production',
      },
      [appPath('local')]: {
        NEXT_PUBLIC_EZPAY_KEY: 'ez_pk_test_local',
      },
      [appPath('staging')]: {
        NEXT_PUBLIC_EZPAY_KEY: 'ez_pk_test_staging',
      },
      [appPath('production')]: {
        NEXT_PUBLIC_EZPAY_KEY: 'ez_pk_live_prod',
      },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'production', readEnv }))
    assert.equal(merged.JWT_SECRET, 'prod-jwt')
    assert.equal(merged.MONGO_URL, 'mongodb://prod')
    assert.equal(merged.DEPLOY_ENV, 'production')
    assert.equal(merged.NEXT_PUBLIC_EZPAY_KEY, 'ez_pk_live_prod')
  })

  it('keeps values from lower layers when upper layers do not override them', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { KEEP_ME: 'from-local', A: 'local-a' },
      [rootPath('staging')]: { A: 'staging-a', B: 'staging-b' },
      [rootPath('production')]: { A: 'prod-a', C: 'prod-c' },
      [appPath('local')]: { APP_KEEP: 'from-local-app' },
    })
    const { merged } = loadMergedEnv(baseInput({ targetEnv: 'production', readEnv }))
    assert.equal(merged.KEEP_ME, 'from-local') // only in root/local
    assert.equal(merged.A, 'prod-a') // cascaded local→staging→prod
    assert.equal(merged.B, 'staging-b') // only in root/staging
    assert.equal(merged.C, 'prod-c') // only in root/prod
    assert.equal(merged.APP_KEEP, 'from-local-app') // only in app/local
  })
})

describe('loadMergedEnv — --from single-source override', () => {
  it('--from staging loads ONLY staging files (cascade bypassed)', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { SHOULD_NOT_APPEAR: 'from-local' },
      [rootPath('staging')]: { ONLY_STAGING: 'yes' },
      [appPath('local')]: { APP_SHOULD_NOT_APPEAR: 'from-app-local' },
      [appPath('staging')]: { APP_ONLY_STAGING: 'yes' },
    })
    const { merged } = loadMergedEnv(
      baseInput({ targetEnv: 'production', fromOverride: 'staging', readEnv })
    )
    assert.equal(merged.ONLY_STAGING, 'yes')
    assert.equal(merged.APP_ONLY_STAGING, 'yes')
    assert.equal(merged.SHOULD_NOT_APPEAR, undefined)
    assert.equal(merged.APP_SHOULD_NOT_APPEAR, undefined)
  })

  it('--from local behaves like legacy single-source push', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { FOO: 'root' },
      [rootPath('staging')]: { FOO: 'staging-should-not-appear' },
      [appPath('local')]: { BAR: 'app' },
      [appPath('staging')]: { BAR: 'staging-should-not-appear' },
    })
    const { merged } = loadMergedEnv(
      baseInput({ targetEnv: 'staging', fromOverride: 'local', readEnv })
    )
    assert.equal(merged.FOO, 'root')
    assert.equal(merged.BAR, 'app')
    assert.equal(Object.keys(merged).length, 2)
  })
})

describe('loadMergedEnv — --override is applied LAST', () => {
  it('--override beats every cascade level', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { KEY: 'local' },
      [rootPath('staging')]: { KEY: 'staging' },
      [rootPath('production')]: { KEY: 'prod' },
      [appPath('production')]: { KEY: 'app-prod' },
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
      [rootPath('local')]: { EXISTING: 'yes' },
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
      [rootPath('local')]: { KEY: 'local' },
      [rootPath('staging')]: { KEY: 'staging' },
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
  it('reports root + app sources for every cascade level', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { X: '1' },
    })
    const { sources } = loadMergedEnv(baseInput({ targetEnv: 'production', readEnv }))
    // 3 levels × 2 scopes = 6 source entries
    assert.equal(sources.length, 6)
    // Root comes before app, order within: local, staging, production
    const order = sources.map(s => `${s.scope}/${s.level}`)
    assert.deepEqual(order, [
      'root/local',
      'root/staging',
      'root/production',
      'app/local',
      'app/staging',
      'app/production',
    ])
  })

  it('marks missing files as exists:false', () => {
    const readEnv = makeReadEnv({
      [rootPath('local')]: { X: '1' },
    })
    const { sources } = loadMergedEnv(baseInput({ targetEnv: 'staging', readEnv }))
    const rootLocal = sources.find(s => s.scope === 'root' && s.level === 'local')!
    const rootStaging = sources.find(s => s.scope === 'root' && s.level === 'staging')!
    assert.equal(rootLocal.exists, true)
    assert.equal(rootStaging.exists, false)
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
