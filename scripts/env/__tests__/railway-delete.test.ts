/**
 * Tests for the V1 fix — per-key `railway variable delete <KEY>` loop
 * replacing the ghost `railway variables --remove K1 K2 ...` batch API
 * that does NOT exist in Railway CLI 4.x.
 *
 * Tested via the `deleteRailwayKeys()` pure function in
 * `scripts/env/railway-delete.ts`. The function accepts an `exec` test seam
 * so we can drive deterministic stub behavior without touching a live CLI.
 *
 * Run:
 *   pnpm tsx --test scripts/env/__tests__/railway-delete.test.ts
 *
 * Coverage:
 *   - One CLI call per key (NOT a batch call with all keys joined)
 *   - Subcommand is `variable delete <KEY>` (singular, no --remove)
 *   - No `--skip-deploys` flag (delete is variable-only on Railway 4.x)
 *   - No `--yes` flag in the args (delete subcommand has no confirmation
 *     prompt by default per `railway variable delete --help`)
 *   - Continue on per-key failure: collect errors, report all at end
 *   - "Already absent" stderr signature treated as idempotent OK
 *   - Mixed success/idempotent/failure aggregation correct
 *
 * @see tmp/hack-a3-empty-delete.md V1 (P0 blocking regression)
 * @see scripts/env/railway-delete.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { deleteRailwayKeys } from '../railway-delete.js'

interface ExecCall {
  args: string[]
}

function makeRecordingExec(perKeyResults: Record<string, { status: number; stderr?: string }>) {
  const calls: ExecCall[] = []
  const exec = (args: string[]): { status: number; stdout: string; stderr: string } => {
    calls.push({ args })
    // The KEY is at index 2 of args: ['variable', 'delete', <KEY>, ...]
    const key = args[2]
    const r = perKeyResults[key] ?? { status: 0, stderr: '' }
    return { status: r.status, stdout: '', stderr: r.stderr ?? '' }
  }
  return { exec, calls }
}

describe('deleteRailwayKeys — V1 fix (per-key delete loop, not batch --remove)', () => {
  it('calls `railway variable delete <KEY>` ONE call per key (singular subcommand, no batch)', () => {
    const { exec, calls } = makeRecordingExec({ KEY1: { status: 0 }, KEY2: { status: 0 } })
    deleteRailwayKeys({
      keys: ['KEY1', 'KEY2'],
      service: 'ezauth-api',
      env: 'production',
      exec,
    })

    // Exactly 2 CLI calls (one per key), NOT 1 batch call.
    assert.equal(calls.length, 2, 'expected 2 calls (one per key), not a batch')

    // Args shape per call:
    //   ['variable', 'delete', <KEY>, '--service', <s>, '--environment', <e>]
    for (const call of calls) {
      assert.equal(call.args[0], 'variable', 'subcommand must be singular `variable`')
      assert.equal(call.args[1], 'delete', 'verb must be `delete` (not `--remove`)')
      assert.ok(call.args[2].length > 0, 'KEY must be the third positional arg')
      assert.deepEqual(
        call.args.slice(3),
        ['--service', 'ezauth-api', '--environment', 'production'],
        'flags must be --service + --environment only (no --skip-deploys, no --yes)'
      )
    }

    // The ghost API patterns the hacker proved DO NOT exist must be absent.
    for (const call of calls) {
      assert.ok(!call.args.includes('--remove'), 'NO --remove flag (does not exist in CLI 4.x)')
      assert.ok(
        !call.args.includes('variables'),
        'NO `variables` plural subcommand (singular `variable` only)'
      )
      assert.ok(
        !call.args.includes('--skip-deploys'),
        'NO --skip-deploys (not on delete subcommand)'
      )
      assert.ok(!call.args.includes('--yes'), 'NO --yes (delete has no confirmation prompt)')
    }
  })

  it('aggregates one delete per key — calls in order', () => {
    const { exec, calls } = makeRecordingExec({})
    deleteRailwayKeys({
      keys: ['A', 'B', 'C'],
      service: 's',
      env: 'staging',
      exec,
    })
    assert.equal(calls.length, 3)
    assert.equal(calls[0].args[2], 'A')
    assert.equal(calls[1].args[2], 'B')
    assert.equal(calls[2].args[2], 'C')
  })

  it('counts pure success: 2 deleted, 0 idempotent, 0 failed', () => {
    const { exec } = makeRecordingExec({ KEY1: { status: 0 }, KEY2: { status: 0 } })
    const { deleted, idempotent, failed } = deleteRailwayKeys({
      keys: ['KEY1', 'KEY2'],
      service: 's',
      env: 'e',
      exec,
    })
    assert.equal(deleted, 2)
    assert.equal(idempotent, 0)
    assert.equal(failed, 0)
  })

  it('treats "not found" stderr as idempotent success (already absent)', () => {
    const { exec } = makeRecordingExec({
      MISSING: { status: 1, stderr: 'Error: variable MISSING not found in service ezauth-api' },
    })
    const { deleted, idempotent, failed } = deleteRailwayKeys({
      keys: ['MISSING'],
      service: 's',
      env: 'e',
      exec,
    })
    assert.equal(deleted, 0)
    assert.equal(idempotent, 1, 'must be counted as idempotent OK, not failed')
    assert.equal(failed, 0)
  })

  it('treats "does not exist" and "doesn\'t exist" stderr as idempotent', () => {
    const { exec } = makeRecordingExec({
      VAR_A: { status: 2, stderr: 'variable VAR_A does not exist' },
      VAR_B: { status: 3, stderr: "variable VAR_B doesn't exist" },
    })
    const { idempotent, failed } = deleteRailwayKeys({
      keys: ['VAR_A', 'VAR_B'],
      service: 's',
      env: 'e',
      exec,
    })
    assert.equal(idempotent, 2)
    assert.equal(failed, 0)
  })

  it('continues on per-key failure (does NOT abort first error)', () => {
    const { exec, calls } = makeRecordingExec({
      OK1: { status: 0 },
      BROKEN: { status: 99, stderr: 'permission denied' },
      OK2: { status: 0 },
    })
    const { deleted, idempotent, failed, results } = deleteRailwayKeys({
      keys: ['OK1', 'BROKEN', 'OK2'],
      service: 's',
      env: 'e',
      exec,
    })
    // 3 calls happened — the failure of BROKEN did NOT short-circuit OK2.
    assert.equal(calls.length, 3, 'all 3 keys must be attempted')
    assert.equal(deleted, 2)
    assert.equal(idempotent, 0)
    assert.equal(failed, 1)
    // Result records preserved per-key
    assert.equal(results.length, 3)
    const broken = results.find(r => r.key === 'BROKEN')
    assert.ok(broken)
    assert.equal(broken.status, 99)
    assert.match(broken.stderr, /permission denied/)
  })

  it('mixed outcomes: deleted + idempotent + failed all aggregate correctly', () => {
    const { exec } = makeRecordingExec({
      DEL_1: { status: 0 },
      DEL_2: { status: 0 },
      ABSENT_1: { status: 1, stderr: 'not found' },
      BROKEN_1: { status: 5, stderr: 'rate limited' },
    })
    const result = deleteRailwayKeys({
      keys: ['DEL_1', 'ABSENT_1', 'DEL_2', 'BROKEN_1'],
      service: 's',
      env: 'e',
      exec,
    })
    assert.equal(result.deleted, 2)
    assert.equal(result.idempotent, 1)
    assert.equal(result.failed, 1)
    assert.equal(result.results.length, 4)
  })

  it('empty key list → zero calls, zero counts', () => {
    const { exec, calls } = makeRecordingExec({})
    const result = deleteRailwayKeys({
      keys: [],
      service: 's',
      env: 'e',
      exec,
    })
    assert.equal(calls.length, 0)
    assert.equal(result.deleted, 0)
    assert.equal(result.idempotent, 0)
    assert.equal(result.failed, 0)
    assert.equal(result.results.length, 0)
  })
})
