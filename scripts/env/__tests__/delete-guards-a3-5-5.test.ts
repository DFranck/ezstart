/**
 * Tests for the post-hacker-A3.5 fixes (commit a3.5.5):
 *
 * Run:
 *   pnpm tsx --test scripts/env/__tests__/delete-guards-a3-5-5.test.ts
 *
 * Coverage:
 *   - P0  assertNoFailedDeletes() exits 1 on any failure, no-ops on empty.
 *   - P1a requireConfirmEmptyDelete() unifies override + cascade empties.
 *   - P1c INLINE_COMMENT_PATTERN catches digit-starting / mixed-case keys.
 *
 * The V1b cross-env fail-fast (P1b) lives in push-vercel.ts main() and is
 * exercised via the existing `detectCrossEnvScopeMismatch` test surface in
 * delete-guards.test.ts — its enforcement layer (the `fail()` call in
 * non-TTY) is integration-level and not unit-tested here. (The unit test
 * for the existing detection function already locks the mismatch semantics
 * in.)
 *
 * @see tmp/hack-a3-5-railway-fix.md
 * @see scripts/env/delete-guards.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertNoFailedDeletes,
  detectInlineCommentEmptyValues,
  formatEmptyDeletePrompt,
  requireConfirmEmptyDelete,
  requireConfirmOverrideEmptyDelete,
} from '../delete-guards.js'

// ────────────────────────────────────────────────────────────
// P0 — assertNoFailedDeletes (silent prune exit-zero fix)
// ────────────────────────────────────────────────────────────

describe('P0 — assertNoFailedDeletes', () => {
  it('is a no-op on empty failures (no exit, no log)', () => {
    let exitCode: number | null = null
    const fakeExit = ((code: number) => {
      exitCode = code
      throw new Error('exit')
    }) as (code: number) => never

    assert.doesNotThrow(() =>
      assertNoFailedDeletes({
        failures: [],
        label: '[prune]',
        totalAttempted: 0,
        onExit: fakeExit,
      })
    )
    assert.equal(exitCode, null, 'process.exit must NOT have been called')
  })

  it('triggers process.exit(1) when at least one failure is present', () => {
    let exitCode: number | null = null
    const fakeExit = ((code: number) => {
      exitCode = code
      throw new Error('exit')
    }) as (code: number) => never

    assert.throws(() =>
      assertNoFailedDeletes({
        failures: [{ key: 'BROKEN', status: 99, stderr: 'permission denied' }],
        label: '[prune]',
        totalAttempted: 1,
        onExit: fakeExit,
      })
    )
    assert.equal(exitCode, 1, 'must call process.exit(1) on any failure')
  })

  it('exits 1 even with a single failure in a batch of many idempotent OKs', () => {
    let exitCode: number | null = null
    const fakeExit = ((code: number) => {
      exitCode = code
      throw new Error('exit')
    }) as (code: number) => never

    assert.throws(() =>
      assertNoFailedDeletes({
        failures: [{ key: 'ONE_BAD', status: 5, stderr: 'rate limited' }],
        label: '[delete]',
        totalAttempted: 100,
        onExit: fakeExit,
      })
    )
    assert.equal(exitCode, 1)
  })

  it('passes the failure key + status + stderr through (regression on per-key reporting)', () => {
    const logged: string[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => {
      logged.push(args.map(a => String(a)).join(' '))
    }
    try {
      assert.throws(() =>
        assertNoFailedDeletes({
          failures: [
            { key: 'KEY_A', status: 42, stderr: 'broken upstream' },
            { key: 'KEY_B', status: 7, stderr: 'rate-limit' },
          ],
          label: '[prune]',
          totalAttempted: 5,
          onExit: ((_c: number) => {
            throw new Error('exit')
          }) as (code: number) => never,
        })
      )
    } finally {
      console.error = originalError
    }
    const joined = logged.join('\n')
    assert.match(joined, /\[prune\] 2\/5 deletes failed/)
    assert.match(joined, /KEY_A/)
    assert.match(joined, /status 42/)
    assert.match(joined, /broken upstream/)
    assert.match(joined, /KEY_B/)
    assert.match(joined, /rate-limit/)
  })
})

// ────────────────────────────────────────────────────────────
// P1a — requireConfirmEmptyDelete (unified override + cascade)
// ────────────────────────────────────────────────────────────

describe('P1a — requireConfirmEmptyDelete (unified guard)', () => {
  it('proceeds when both sets are empty', () => {
    const r = requireConfirmEmptyDelete({
      emptyOverrideKeys: [],
      emptyCascadeKeys: [],
      yesIMeanDelete: false,
      nonInteractive: false,
      isTTY: true,
    })
    assert.equal(r.proceed, true)
    assert.equal(r.requiresInteractivePrompt, false)
    assert.deepEqual(r.allEmptyKeys, [])
  })

  it('fires when ONLY cascade-file empties are present (not just --override)', () => {
    // This is the exact scenario the hacker flagged P1a: a bare KEY=
    // committed in .env.production. Previously the guard ignored it.
    const r = requireConfirmEmptyDelete({
      emptyOverrideKeys: [],
      emptyCascadeKeys: ['STRIPE_SECRET'],
      yesIMeanDelete: false,
      nonInteractive: false,
      isTTY: false, // non-TTY = CI
    })
    assert.equal(r.proceed, false)
    assert.equal(r.requiresInteractivePrompt, false)
    assert.match(r.reason ?? '', /STRIPE_SECRET/)
    assert.match(r.reason ?? '', /1 in cascade file\(s\)/)
    assert.match(r.reason ?? '', /--yes-i-mean-delete/)
  })

  it('combines override + cascade empties in the reason summary', () => {
    const r = requireConfirmEmptyDelete({
      emptyOverrideKeys: ['OVR_A'],
      emptyCascadeKeys: ['CSC_A', 'CSC_B'],
      yesIMeanDelete: false,
      nonInteractive: false,
      isTTY: false,
    })
    assert.equal(r.proceed, false)
    assert.match(r.reason ?? '', /1 via --override \+ 2 in cascade file\(s\)/)
    // All 3 keys mentioned
    assert.match(r.reason ?? '', /OVR_A/)
    assert.match(r.reason ?? '', /CSC_A/)
    assert.match(r.reason ?? '', /CSC_B/)
    assert.deepEqual(r.allEmptyKeys, ['OVR_A', 'CSC_A', 'CSC_B'])
  })

  it('de-dupes when a key appears in both override and cascade', () => {
    const r = requireConfirmEmptyDelete({
      emptyOverrideKeys: ['SHARED'],
      emptyCascadeKeys: ['SHARED', 'OTHER'],
      yesIMeanDelete: false,
      nonInteractive: false,
      isTTY: false,
    })
    assert.deepEqual(r.allEmptyKeys, ['SHARED', 'OTHER'])
  })

  it('TTY context with cascade-only empty → interactive prompt requested', () => {
    const r = requireConfirmEmptyDelete({
      emptyOverrideKeys: [],
      emptyCascadeKeys: ['SECRET'],
      yesIMeanDelete: false,
      nonInteractive: false,
      isTTY: true,
    })
    assert.equal(r.proceed, false)
    assert.equal(r.requiresInteractivePrompt, true)
    assert.deepEqual(r.allEmptyKeys, ['SECRET'])
  })

  it('--yes-i-mean-delete proceeds for cascade-only empties (same as override)', () => {
    const r = requireConfirmEmptyDelete({
      emptyOverrideKeys: [],
      emptyCascadeKeys: ['SECRET'],
      yesIMeanDelete: true,
      nonInteractive: true,
      isTTY: false,
    })
    assert.equal(r.proceed, true)
    assert.equal(r.requiresInteractivePrompt, false)
  })

  it('formatEmptyDeletePrompt mentions both sources', () => {
    const msg = formatEmptyDeletePrompt(['KEY1', 'KEY2'])
    assert.match(msg, /KEY1/)
    assert.match(msg, /KEY2/)
    assert.match(msg, /--override OR cascade file/)
    assert.match(msg, /yes\/NO/i)
  })

  it('requireConfirmOverrideEmptyDelete (legacy wrapper) still works override-only', () => {
    // Backcompat shim — ignores cascade-file empties on purpose, callers
    // that haven't migrated to the unified API keep their previous shape.
    const r = requireConfirmOverrideEmptyDelete({
      emptyOverrideKeys: ['SECRET'],
      yesIMeanDelete: false,
      nonInteractive: false,
      isTTY: false,
    })
    assert.equal(r.proceed, false)
    assert.match(r.reason ?? '', /SECRET/)
  })
})

// ────────────────────────────────────────────────────────────
// P1c — INLINE_COMMENT_PATTERN regex breadth
// ────────────────────────────────────────────────────────────

describe('P1c — detectInlineCommentEmptyValues (regex breadth fix)', () => {
  it('detects digit-starting key `2KEY=#TODO`', () => {
    const detections = detectInlineCommentEmptyValues('.env', '2KEY=#TODO replace me')
    assert.equal(detections.length, 1, 'digit-starting key must be caught')
    assert.equal(detections[0].key, '2KEY')
  })

  it('detects `_2KEY=#x` (underscore-then-digit-prefixed)', () => {
    const detections = detectInlineCommentEmptyValues('.env', '_2KEY=#x')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, '_2KEY')
  })

  it('detects key with digit in middle `KEY9=#x`', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'KEY9=#x')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'KEY9')
  })

  it('detects key with dot `MY.KEY=#x` (dotenv quirk)', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'MY.KEY=#x')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'MY.KEY')
  })

  it('detects key with hyphen `MY-KEY=#x`', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'MY-KEY=#x')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'MY-KEY')
  })

  it('detects export-prefixed digit-starting `export 2KEY=#oops`', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'export 2KEY=#oops')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, '2KEY')
  })

  it('still catches the original UPPERCASE pattern `KEY=#oops`', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'KEY=#oops')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'KEY')
  })

  it('still catches lowercase `lowercase_key=#oops`', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'lowercase_key=#oops')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'lowercase_key')
  })
})
