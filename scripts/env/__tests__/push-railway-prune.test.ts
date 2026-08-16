/**
 * Tests for the `--prune` flag logic in scripts/env/push-railway.ts.
 *
 * Run :
 *   pnpm tsx --test scripts/env/__tests__/push-railway-prune.test.ts
 *
 * Coverage :
 *   - parseFlags() parses --prune correctly
 *   - parseRailwayVariables() handles JSON + table CLI output
 *   - listRailwayEnvKeys() honors the test exec seam + JSON fallback
 *   - computePruneList() computes the diff correctly + skips protected keys
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computePruneList,
  listRailwayEnvKeys,
  parseFlags,
  parseRailwayVariables,
} from '../push-railway.js'

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

  it('parses --prune alongside --dry-run + --include-blocked', () => {
    const f = parseFlags(['--prune', '--dry-run', '--include-blocked', 'TEST_USER'])
    assert.equal(f.prune, true)
    assert.equal(f.dryRun, true)
    assert.ok(f.includeBlocked.has('TEST_USER'))
  })
})

// ────────────────────────────────────────────────────────────
// parseRailwayVariables — JSON + table fallback parsing
// ────────────────────────────────────────────────────────────

describe('parseRailwayVariables — JSON output (CLI 4.x with --json)', () => {
  it('parses a JSON object response', () => {
    const json = JSON.stringify({
      MONGO_URL: 'mongodb+srv://...',
      JWT_SECRET: 'secret',
      DEPLOY_ENV: 'production',
    })
    assert.deepEqual(parseRailwayVariables(json), ['DEPLOY_ENV', 'JWT_SECRET', 'MONGO_URL'])
  })

  it('returns empty array on empty JSON object', () => {
    assert.deepEqual(parseRailwayVariables('{}'), [])
  })

  it('falls back to table parser when JSON is malformed', () => {
    const broken = '{ malformed_json'
    // Falls through to table parser. No KEY=VAL pattern → empty.
    assert.deepEqual(parseRailwayVariables(broken), [])
  })
})

describe('parseRailwayVariables — table fallback (older CLI)', () => {
  it('parses KEY=VALUE lines', () => {
    const output = `MONGO_URL=mongodb+srv://x
JWT_SECRET=secretvalue
DEPLOY_ENV=production`
    assert.deepEqual(parseRailwayVariables(output), ['DEPLOY_ENV', 'JWT_SECRET', 'MONGO_URL'])
  })

  it('parses table rows when CLI uses prefix-padded format (no header)', () => {
    // Note : if the table has a header that itself looks like a JS-identifier
    // (e.g. `NAME    VALUE`), the parser will treat NAME as a key. That's
    // acceptable for our use because we never see such a header in real
    // Railway 4.x output, AND if we do, the spurious "NAME" simply joins
    // the prune-candidate list and gets filtered downstream by
    // computePruneList() if it's also in localKeys, OR gets pruned (which is
    // a no-op on the remote).
    const output = `
MONGO_URL        mongodb...
JWT_SECRET       hidden
`
    assert.deepEqual(parseRailwayVariables(output), ['JWT_SECRET', 'MONGO_URL'])
  })

  it('skips blank lines + headers', () => {
    const output = `
Variables for service "ezauth-api" :


MY_VAR=hello
`
    assert.deepEqual(parseRailwayVariables(output), ['MY_VAR'])
  })

  it('handles values with = inside (only splits on first =)', () => {
    const output = 'CONNECTION_URL=mongodb://user:pa==ss@host'
    assert.deepEqual(parseRailwayVariables(output), ['CONNECTION_URL'])
  })

  it('returns empty for empty input', () => {
    assert.deepEqual(parseRailwayVariables(''), [])
    assert.deepEqual(parseRailwayVariables('  \n\t  '), [])
  })
})

// ────────────────────────────────────────────────────────────
// listRailwayEnvKeys — exec seam + JSON-flag fallback
// ────────────────────────────────────────────────────────────

describe('listRailwayEnvKeys — test exec seam', () => {
  it('passes the right args (with --json) for staging environment', () => {
    let observedArgs: string[] | null = null
    const keys = listRailwayEnvKeys({
      service: 'ezauth-api',
      env: 'staging',
      exec: args => {
        observedArgs = [...args]
        return { status: 0, stdout: '{"FOO":"bar"}', stderr: '' }
      },
    })
    assert.deepEqual(observedArgs, [
      'variables',
      '--service',
      'ezauth-api',
      '--environment',
      'staging',
      '--json',
    ])
    assert.deepEqual(keys, ['FOO'])
  })

  it('falls back to non-JSON call when --json fails (older CLI)', () => {
    const calls: string[][] = []
    const keys = listRailwayEnvKeys({
      service: 'ezpay-api',
      env: 'production',
      exec: args => {
        calls.push([...args])
        if (args.includes('--json')) {
          return { status: 1, stdout: '', stderr: 'unknown flag --json' }
        }
        return { status: 0, stdout: 'KEY1=val\nKEY2=val\n', stderr: '' }
      },
    })
    assert.equal(calls.length, 2)
    assert.ok(calls[0].includes('--json'))
    assert.ok(!calls[1].includes('--json'))
    assert.deepEqual(keys, ['KEY1', 'KEY2'])
  })

  it('throws when both attempts fail', () => {
    assert.throws(
      () =>
        listRailwayEnvKeys({
          service: 'broken',
          env: 'production',
          exec: () => ({
            status: 1,
            stdout: '',
            stderr: 'Service not linked',
          }),
        }),
      /railway variables exited with status 1.*Service not linked/
    )
  })
})

// ────────────────────────────────────────────────────────────
// computePruneList — same semantics as push-vercel
// ────────────────────────────────────────────────────────────

describe('computePruneList — basic diffs (Railway)', () => {
  it('returns empty when remote == local', () => {
    assert.deepEqual(
      computePruneList({
        remoteKeys: ['MONGO_URL', 'JWT_SECRET'],
        localKeys: ['MONGO_URL', 'JWT_SECRET'],
      }),
      []
    )
  })

  it('returns the keys present on remote but missing locally', () => {
    assert.deepEqual(
      computePruneList({
        remoteKeys: ['MONGO_URL', 'JWT_SECRET', 'OLD_KEY', 'TO_REMOVE'],
        localKeys: ['MONGO_URL', 'JWT_SECRET'],
      }),
      ['OLD_KEY', 'TO_REMOVE']
    )
  })

  it('skips RAILWAY_*, NODE_ENV, PORT, CI', () => {
    assert.deepEqual(
      computePruneList({
        remoteKeys: [
          'CUSTOM_VAR',
          'RAILWAY_ENVIRONMENT',
          'RAILWAY_PRIVATE_DOMAIN',
          'NODE_ENV',
          'PORT',
          'CI',
          'OLD_USER_VAR',
        ],
        localKeys: ['CUSTOM_VAR'],
      }),
      ['OLD_USER_VAR']
    )
  })

  it('returns sorted output', () => {
    assert.deepEqual(
      computePruneList({
        remoteKeys: ['ZED', 'ALPHA', 'MIDDLE'],
        localKeys: [],
      }),
      ['ALPHA', 'MIDDLE', 'ZED']
    )
  })
})
