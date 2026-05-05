/**
 * Tests for the `--prune` flag logic in scripts/env/push-vercel.ts.
 *
 * Run :
 *   pnpm tsx --test scripts/env/__tests__/push-vercel-prune.test.ts
 *
 * Coverage :
 *   - parseFlags() parses --prune correctly
 *   - parseVercelEnvLs() handles real-world Vercel CLI output formats
 *   - listVercelEnvKeys() honors the test exec seam
 *   - computePruneList() computes the diff correctly + skips protected keys
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computePruneList,
  listVercelEnvKeys,
  parseFlags,
  parseVercelEnvLs,
} from '../push-vercel.js'

// ────────────────────────────────────────────────────────────
// parseFlags — the new --prune flag
// ────────────────────────────────────────────────────────────

describe('parseFlags — --prune', () => {
  it('defaults to prune:false when --prune is absent', () => {
    const f = parseFlags(['--dry-run'])
    assert.equal(f.prune, false)
  })

  it('parses --prune', () => {
    const f = parseFlags(['--prune'])
    assert.equal(f.prune, true)
    assert.equal(f.dryRun, false)
  })

  it('parses --prune alongside --dry-run', () => {
    const f = parseFlags(['--prune', '--dry-run'])
    assert.equal(f.prune, true)
    assert.equal(f.dryRun, true)
  })

  it('parses --prune alongside --override + --from', () => {
    const f = parseFlags(['--from', 'staging', '--override', 'K=v', '--prune', '--dry-run'])
    assert.equal(f.prune, true)
    assert.equal(f.dryRun, true)
    assert.equal(f.from, 'staging')
    assert.deepEqual(f.overrides, { K: 'v' })
  })
})

// ────────────────────────────────────────────────────────────
// parseVercelEnvLs — Vercel CLI output parsing
// ────────────────────────────────────────────────────────────

describe('parseVercelEnvLs — real-world Vercel CLI output', () => {
  it('parses a typical Vercel env ls table', () => {
    // Sample real-shape output (Vercel CLI v32.x).
    const output = `
Vercel CLI 32.0.0
> Environment Variables found in Project "ezpay"

  name                              value      environments      created
  NEXT_PUBLIC_EZAUTH_KEY            Encrypted  Production        2 hours ago
  STRIPE_SECRET_KEY                 Encrypted  Production        3 hours ago
  MONGO_URL                         Encrypted  Production        1 day ago
`
    const keys = parseVercelEnvLs(output)
    assert.deepEqual(keys, ['MONGO_URL', 'NEXT_PUBLIC_EZAUTH_KEY', 'STRIPE_SECRET_KEY'])
  })

  it('returns empty array on empty input', () => {
    assert.deepEqual(parseVercelEnvLs(''), [])
    assert.deepEqual(parseVercelEnvLs('\n\n  \n'), [])
  })

  it('skips header / preamble lines', () => {
    const output = `
Vercel CLI 32.0.0
Some preamble.

> Environment Variables...

  KEY_1   Encrypted    Production    1 hour ago
`
    assert.deepEqual(parseVercelEnvLs(output), ['KEY_1'])
  })

  it('deduplicates if a key appears multiple times in the output', () => {
    const output = `
  FOO   Encrypted    Production    1h
  FOO   Encrypted    Preview       1h
  BAR   Encrypted    Production    1h
`
    assert.deepEqual(parseVercelEnvLs(output), ['BAR', 'FOO'])
  })
})

// ────────────────────────────────────────────────────────────
// listVercelEnvKeys — exec seam works
// ────────────────────────────────────────────────────────────

describe('listVercelEnvKeys — test exec seam', () => {
  it('passes the right args to vercel CLI for production target', () => {
    let observedArgs: string[] | null = null
    const keys = listVercelEnvKeys({
      cwd: '/tmp/whatever',
      vercelTarget: 'production',
      gitBranch: null,
      exec: args => {
        observedArgs = [...args]
        return { status: 0, stdout: '  FOO   Encrypted    Production    1h\n', stderr: '' }
      },
    })
    assert.deepEqual(observedArgs, ['env', 'ls', 'production'])
    assert.deepEqual(keys, ['FOO'])
  })

  it('appends the git branch for preview targets', () => {
    let observedArgs: string[] | null = null
    listVercelEnvKeys({
      cwd: '/x',
      vercelTarget: 'preview',
      gitBranch: 'staging',
      exec: args => {
        observedArgs = [...args]
        return { status: 0, stdout: '', stderr: '' }
      },
    })
    assert.deepEqual(observedArgs, ['env', 'ls', 'preview', 'staging'])
  })

  it('throws when the CLI exits non-zero', () => {
    assert.throws(
      () =>
        listVercelEnvKeys({
          cwd: '/x',
          vercelTarget: 'production',
          gitBranch: null,
          exec: () => ({
            status: 1,
            stdout: '',
            stderr: 'Project not linked',
          }),
        }),
      /vercel env ls exited with status 1.*Project not linked/
    )
  })
})

// ────────────────────────────────────────────────────────────
// computePruneList — the core diff function
// ────────────────────────────────────────────────────────────

describe('computePruneList — basic diffs', () => {
  it('returns empty when remote == local', () => {
    const result = computePruneList({
      remoteKeys: ['A', 'B', 'C'],
      localKeys: ['A', 'B', 'C'],
    })
    assert.deepEqual(result, [])
  })

  it('returns empty when local is a strict superset of remote', () => {
    const result = computePruneList({
      remoteKeys: ['A'],
      localKeys: ['A', 'B', 'C'],
    })
    assert.deepEqual(result, [])
  })

  it('returns the keys present on remote but missing locally', () => {
    const result = computePruneList({
      remoteKeys: ['A', 'B', 'C', 'D'],
      localKeys: ['A', 'B'],
    })
    assert.deepEqual(result, ['C', 'D'])
  })

  it('returns sorted output', () => {
    const result = computePruneList({
      remoteKeys: ['ZED', 'ALPHA', 'MIDDLE'],
      localKeys: [],
    })
    assert.deepEqual(result, ['ALPHA', 'MIDDLE', 'ZED'])
  })

  it('handles empty remote', () => {
    assert.deepEqual(computePruneList({ remoteKeys: [], localKeys: ['X'] }), [])
  })

  it('handles empty local (would prune everything except protected)', () => {
    const result = computePruneList({
      remoteKeys: ['MY_KEY', 'ANOTHER_KEY'],
      localKeys: [],
    })
    assert.deepEqual(result, ['ANOTHER_KEY', 'MY_KEY'])
  })
})

describe('computePruneList — platform-protected keys are NEVER pruned', () => {
  it('skips VERCEL_*', () => {
    const result = computePruneList({
      remoteKeys: ['MY_KEY', 'VERCEL_ENV', 'VERCEL_URL'],
      localKeys: [], // would prune everything
    })
    assert.deepEqual(result, ['MY_KEY']) // VERCEL_* skipped
  })

  it('skips RAILWAY_*', () => {
    const result = computePruneList({
      remoteKeys: ['CUSTOM_KEY', 'RAILWAY_ENVIRONMENT', 'RAILWAY_TOKEN'],
      localKeys: [],
    })
    assert.deepEqual(result, ['CUSTOM_KEY'])
  })

  it('skips NODE_ENV / PORT / CI even when missing locally', () => {
    const result = computePruneList({
      remoteKeys: ['NODE_ENV', 'PORT', 'CI', 'JWT_SECRET'],
      localKeys: [],
    })
    assert.deepEqual(result, ['JWT_SECRET'])
  })

  it('skips underscore-prefixed (Vercel internal)', () => {
    const result = computePruneList({
      remoteKeys: ['_INTERNAL', 'MY_KEY'],
      localKeys: [],
    })
    assert.deepEqual(result, ['MY_KEY'])
  })

  it('combines local presence + protection filter correctly', () => {
    const result = computePruneList({
      remoteKeys: [
        'NEXT_PUBLIC_EZAUTH_KEY', // present locally → keep
        'OLD_VAR_TO_DELETE', // not local + not protected → prune
        'VERCEL_URL', // not local + protected → keep
        'NODE_ENV', // not local + protected → keep
      ],
      localKeys: ['NEXT_PUBLIC_EZAUTH_KEY'],
    })
    assert.deepEqual(result, ['OLD_VAR_TO_DELETE'])
  })
})
