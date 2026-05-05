/**
 * Tests for the shared CLI helpers used by push-vercel/push-railway/push-all.
 *
 * Run :
 *   pnpm tsx --test scripts/env/__tests__/shared-flags.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_TARGET_ENVS, extractEnvFlag, isProtectedEnvKey, parseEnvArg } from '../shared-flags.js'

// ────────────────────────────────────────────────────────────
// parseEnvArg — anti-typo + dual-source validation
// ────────────────────────────────────────────────────────────

describe('parseEnvArg — happy path', () => {
  it('returns null when neither positional nor flag is provided', () => {
    assert.equal(parseEnvArg(undefined, undefined), null)
  })

  for (const env of ALL_TARGET_ENVS) {
    it(`returns "${env}" when only positional is provided`, () => {
      assert.equal(parseEnvArg(env, undefined), env)
    })

    it(`returns "${env}" when only --env= flag is provided`, () => {
      assert.equal(parseEnvArg(undefined, env), env)
    })

    it(`returns "${env}" when both positional and flag agree`, () => {
      assert.equal(parseEnvArg(env, env), env)
    })
  }
})

describe('parseEnvArg — anti-typo errors', () => {
  it('rejects "stagging" positional', () => {
    assert.throws(() => parseEnvArg('stagging', undefined), /Invalid env "stagging"/)
  })

  it('rejects "stagging" --env=', () => {
    assert.throws(() => parseEnvArg(undefined, 'stagging'), /Invalid env "stagging"/)
  })

  it('rejects "prod" (must be full word "production")', () => {
    assert.throws(() => parseEnvArg('prod', undefined), /Invalid env "prod"/)
  })

  it('rejects "dev" (must be "local")', () => {
    assert.throws(() => parseEnvArg('dev', undefined), /Invalid env "dev"/)
  })

  it('rejects empty string', () => {
    assert.throws(() => parseEnvArg('', undefined), /Invalid env/)
  })
})

describe('parseEnvArg — conflict between positional and flag', () => {
  it('throws when positional ≠ flag', () => {
    assert.throws(() => parseEnvArg('staging', 'production'), /Conflicting env targets/)
  })

  it('does NOT throw when both are equal (idempotent)', () => {
    assert.doesNotThrow(() => parseEnvArg('staging', 'staging'))
    assert.equal(parseEnvArg('staging', 'staging'), 'staging')
  })

  it('throws even if both values are individually valid', () => {
    assert.throws(
      () => parseEnvArg('local', 'production'),
      /Conflicting env targets : positional="local" vs --env=production/
    )
  })
})

// ────────────────────────────────────────────────────────────
// extractEnvFlag — mutation-based extraction
// ────────────────────────────────────────────────────────────

describe('extractEnvFlag', () => {
  it('returns undefined when --env= absent', () => {
    const flags = ['--dry-run', '--prune']
    assert.equal(extractEnvFlag(flags), undefined)
    // Did not mutate the array
    assert.deepEqual(flags, ['--dry-run', '--prune'])
  })

  it('extracts --env=staging form (preferred)', () => {
    const flags = ['--dry-run', '--env=staging', '--prune']
    assert.equal(extractEnvFlag(flags), 'staging')
    assert.deepEqual(flags, ['--dry-run', '--prune'])
  })

  it('extracts --env staging split form (legacy)', () => {
    const flags = ['--dry-run', '--env', 'staging', '--prune']
    assert.equal(extractEnvFlag(flags), 'staging')
    assert.deepEqual(flags, ['--dry-run', '--prune'])
  })

  it('extracts the first --env= when there are multiple (rare/invalid input)', () => {
    const flags = ['--env=staging', '--env=production']
    assert.equal(extractEnvFlag(flags), 'staging')
    assert.deepEqual(flags, ['--env=production'])
  })

  it('handles --env= at the start of the array', () => {
    const flags = ['--env=local']
    assert.equal(extractEnvFlag(flags), 'local')
    assert.deepEqual(flags, [])
  })

  it('handles --env= at the end of the array', () => {
    const flags = ['--dry-run', '--env=local']
    assert.equal(extractEnvFlag(flags), 'local')
    assert.deepEqual(flags, ['--dry-run'])
  })

  it('returns the empty string when --env= passed without value', () => {
    // Validation is done by parseEnvArg downstream — extractEnvFlag is byte-level.
    const flags = ['--env=']
    assert.equal(extractEnvFlag(flags), '')
    assert.deepEqual(flags, [])
  })
})

// ────────────────────────────────────────────────────────────
// isProtectedEnvKey — platform-managed vars must never be pruned
// ────────────────────────────────────────────────────────────

describe('isProtectedEnvKey — platform-managed (NEVER prune)', () => {
  for (const key of [
    'VERCEL_URL',
    'VERCEL_ENV',
    'VERCEL_GIT_COMMIT_SHA',
    'VERCEL_GIT_COMMIT_REF',
    'VERCEL_REGION',
  ]) {
    it(`protects ${key}`, () => {
      assert.equal(isProtectedEnvKey(key), true)
    })
  }

  for (const key of [
    'RAILWAY_ENVIRONMENT',
    'RAILWAY_SERVICE_NAME',
    'RAILWAY_PRIVATE_DOMAIN',
    'RAILWAY_GIT_COMMIT_SHA',
  ]) {
    it(`protects ${key}`, () => {
      assert.equal(isProtectedEnvKey(key), true)
    })
  }

  for (const key of ['NX_CACHE', 'NX_CLOUD_TOKEN']) {
    it(`protects ${key}`, () => {
      assert.equal(isProtectedEnvKey(key), true)
    })
  }

  for (const key of ['_SOMETHING', '__VERCEL_BLITZ_INTERNAL']) {
    it(`protects underscore-prefixed ${key}`, () => {
      assert.equal(isProtectedEnvKey(key), true)
    })
  }

  for (const key of ['NODE_ENV', 'PORT', 'CI']) {
    it(`protects exact match ${key}`, () => {
      assert.equal(isProtectedEnvKey(key), true)
    })
  }
})

describe('isProtectedEnvKey — user-managed (safe to prune)', () => {
  for (const key of [
    'NEXT_PUBLIC_EZAUTH_KEY',
    'EZAUTH_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'MONGO_URL',
    'JWT_SECRET',
    'DEPLOY_ENV',
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'GEMINI_API_KEY',
  ]) {
    it(`does NOT protect ${key}`, () => {
      assert.equal(isProtectedEnvKey(key), false)
    })
  }

  // Edge cases that look platform-y but are user-controlled
  it('does NOT protect VERCELESQUE (must be VERCEL_, not partial match)', () => {
    // Only VERCEL_ prefix is protected, not arbitrary VERCEL substrings.
    assert.equal(isProtectedEnvKey('VERCELESQUE'), false)
  })

  it('does NOT protect CITY (CI exact match only)', () => {
    assert.equal(isProtectedEnvKey('CITY'), false)
  })
})
