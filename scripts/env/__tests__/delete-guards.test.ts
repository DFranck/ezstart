/**
 * Tests for the V3 / V5 / N1 safety guards introduced post-hacker-A3
 * (2026-06-05).
 *
 * Run:
 *   pnpm tsx --test scripts/env/__tests__/delete-guards.test.ts
 *
 * Coverage:
 *   V3 — cross-env scope mismatch detection (push-vercel only — Railway has
 *        a single env per service so the mismatch doesn't apply there).
 *   V5 — `--override KEY=` (empty value via flag) requires explicit
 *        confirmation in non-TTY contexts.
 *   N1 — `KEY=#comment` lines emit a non-blocking warning (dotenv parses
 *        them as `''` which triggers DELETE downstream).
 *
 * @see tmp/hack-a3-empty-delete.md
 * @see scripts/env/delete-guards.ts
 * @see scripts/env/push-vercel.ts (detectCrossEnvScopeMismatch)
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {
  detectInlineCommentEmptyValues,
  formatOverrideEmptyDeletePrompt,
  requireConfirmOverrideEmptyDelete,
} from '../delete-guards.js'
import { detectCrossEnvScopeMismatch } from '../push-vercel.js'

// ────────────────────────────────────────────────────────────
// V3 — cross-env scope mismatch (push-vercel)
// ────────────────────────────────────────────────────────────

describe('V3 — detectCrossEnvScopeMismatch (push-vercel)', () => {
  const ROOT = path.resolve('/repo')
  const APP = 'ezpay'

  function vercelPath(level: 'local' | 'staging' | 'production'): string {
    return path.join(ROOT, 'apps', APP, 'web', `.env.${level}`)
  }

  function makeReadEnv(files: Record<string, Record<string, string>>) {
    return (absPath: string): Record<string, string> | null =>
      Object.prototype.hasOwnProperty.call(files, absPath) ? files[absPath] : null
  }

  it('detects when a KEY is empty in current cascade but set in another env', () => {
    const readEnv = makeReadEnv({
      [vercelPath('staging')]: { STRIPE_SECRET: 'sk_test_xxx' },
    })
    const mismatches = detectCrossEnvScopeMismatch({
      root: ROOT,
      app: APP,
      targetEnv: 'production',
      emptyKeys: ['STRIPE_SECRET'],
      readEnv,
    })
    assert.equal(mismatches.length, 1)
    assert.equal(mismatches[0].key, 'STRIPE_SECRET')
    assert.equal(mismatches[0].targetEnv, 'production')
    assert.equal(mismatches[0].otherEnv, 'staging')
  })

  it('returns no mismatches when KEY is also empty in other envs', () => {
    const readEnv = makeReadEnv({
      [vercelPath('local')]: { ROTATED: '' },
      [vercelPath('staging')]: { ROTATED: '' },
    })
    const mismatches = detectCrossEnvScopeMismatch({
      root: ROOT,
      app: APP,
      targetEnv: 'production',
      emptyKeys: ['ROTATED'],
      readEnv,
    })
    assert.equal(mismatches.length, 0)
  })

  it('returns no mismatches when KEY is absent from other envs', () => {
    const readEnv = makeReadEnv({
      [vercelPath('local')]: { OTHER_KEY: 'value' },
    })
    const mismatches = detectCrossEnvScopeMismatch({
      root: ROOT,
      app: APP,
      targetEnv: 'production',
      emptyKeys: ['NEVER_DEFINED'],
      readEnv,
    })
    assert.equal(mismatches.length, 0)
  })

  it('detects multiple mismatches across envs', () => {
    const readEnv = makeReadEnv({
      [vercelPath('local')]: { KEY_A: 'val_a', KEY_B: 'val_b' },
      [vercelPath('staging')]: { KEY_A: 'val_a_staging' },
    })
    const mismatches = detectCrossEnvScopeMismatch({
      root: ROOT,
      app: APP,
      targetEnv: 'production',
      emptyKeys: ['KEY_A', 'KEY_B'],
      readEnv,
    })
    // KEY_A appears in both local + staging → 2 mismatches
    // KEY_B appears in local only         → 1 mismatch
    assert.equal(mismatches.length, 3)
    const keys = mismatches.map(m => m.key).sort()
    assert.deepEqual(keys, ['KEY_A', 'KEY_A', 'KEY_B'])
  })
})

// ────────────────────────────────────────────────────────────
// V5 — --override KEY= confirmation
// ────────────────────────────────────────────────────────────

describe('V5 — requireConfirmOverrideEmptyDelete', () => {
  it('proceeds unconditionally when no empty override keys', () => {
    const r = requireConfirmOverrideEmptyDelete({
      emptyOverrideKeys: [],
      yesIMeanDelete: false,
      nonInteractive: false,
      isTTY: true,
    })
    assert.equal(r.proceed, true)
    assert.equal(r.requiresInteractivePrompt, false)
  })

  it('proceeds when --yes-i-mean-delete is set (operator opted in)', () => {
    const r = requireConfirmOverrideEmptyDelete({
      emptyOverrideKeys: ['SECRET_KEY'],
      yesIMeanDelete: true,
      nonInteractive: false,
      isTTY: false,
    })
    assert.equal(r.proceed, true)
    assert.equal(r.requiresInteractivePrompt, false)
  })

  it('BLOCKS in non-TTY without --yes-i-mean-delete (anti-CI-accident)', () => {
    const r = requireConfirmOverrideEmptyDelete({
      emptyOverrideKeys: ['SECRET_KEY'],
      yesIMeanDelete: false,
      nonInteractive: false,
      isTTY: false,
    })
    assert.equal(r.proceed, false)
    assert.equal(r.requiresInteractivePrompt, false)
    assert.match(r.reason ?? '', /--yes-i-mean-delete/)
    assert.match(r.reason ?? '', /SECRET_KEY/)
  })

  it('BLOCKS when --non-interactive is set even from a TTY', () => {
    const r = requireConfirmOverrideEmptyDelete({
      emptyOverrideKeys: ['SECRET'],
      yesIMeanDelete: false,
      nonInteractive: true,
      isTTY: true,
    })
    assert.equal(r.proceed, false)
    assert.equal(r.requiresInteractivePrompt, false)
  })

  it('requires interactive prompt in TTY without --yes-i-mean-delete', () => {
    const r = requireConfirmOverrideEmptyDelete({
      emptyOverrideKeys: ['SECRET'],
      yesIMeanDelete: false,
      nonInteractive: false,
      isTTY: true,
    })
    assert.equal(r.proceed, false)
    assert.equal(r.requiresInteractivePrompt, true)
  })

  it('formatOverrideEmptyDeletePrompt mentions every key', () => {
    const msg = formatOverrideEmptyDeletePrompt(['KEY1', 'KEY2', 'KEY3'])
    assert.match(msg, /KEY1/)
    assert.match(msg, /KEY2/)
    assert.match(msg, /KEY3/)
    assert.match(msg, /yes\/NO/i)
  })
})

// ────────────────────────────────────────────────────────────
// N1 — KEY=#comment inline detection
// ────────────────────────────────────────────────────────────

describe('N1 — detectInlineCommentEmptyValues', () => {
  it('detects `DATABASE_URL=#TODO put real url`', () => {
    const detections = detectInlineCommentEmptyValues(
      '.env.production',
      'OTHER_KEY=value\nDATABASE_URL=#TODO put real prod URL\nMORE_KEY=foo'
    )
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'DATABASE_URL')
    assert.equal(detections[0].line, 2)
    assert.equal(detections[0].file, '.env.production')
    assert.match(detections[0].raw, /DATABASE_URL=#TODO/)
  })

  it('detects `KEY=#stillempty` (no whitespace before #)', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'KEY=#stillempty')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'KEY')
  })

  it('detects `export KEY=#TODO` (bash-style export keyword)', () => {
    const detections = detectInlineCommentEmptyValues('.env.local', 'export KEY=#TODO replace me')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'KEY')
  })

  it('does NOT detect `KEY="#literal"` (quoted hash is a literal value)', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'KEY="#literal-value"')
    assert.equal(detections.length, 0)
  })

  it('does NOT detect `# comment line` (full comment, not inline)', () => {
    const detections = detectInlineCommentEmptyValues('.env', '# This is a comment\nKEY=value')
    assert.equal(detections.length, 0)
  })

  it('does NOT detect `KEY=value` (no inline comment)', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'KEY=value')
    assert.equal(detections.length, 0)
  })

  it('does NOT detect `KEY=value # trailing comment` (value before comment)', () => {
    // dotenv parses this as `{KEY: 'value'}` not empty — the # is after the
    // actual value with whitespace. Our heuristic targets ONLY `KEY=#...`.
    const detections = detectInlineCommentEmptyValues('.env', 'KEY=value # trailing comment')
    assert.equal(detections.length, 0)
  })

  it('detects multiple lines and reports correct line numbers', () => {
    const content = ['VAR1=value', 'VAR2=#oops', 'VAR3=ok', 'VAR4=#also oops'].join('\n')
    const detections = detectInlineCommentEmptyValues('.env.staging', content)
    assert.equal(detections.length, 2)
    assert.equal(detections[0].key, 'VAR2')
    assert.equal(detections[0].line, 2)
    assert.equal(detections[1].key, 'VAR4')
    assert.equal(detections[1].line, 4)
  })

  it('handles CRLF line endings', () => {
    const content = 'KEY1=value\r\nKEY2=#oops\r\nKEY3=ok'
    const detections = detectInlineCommentEmptyValues('.env', content)
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'KEY2')
    assert.equal(detections[0].line, 2)
  })

  it('case-insensitive (KEY identifier regex)', () => {
    const detections = detectInlineCommentEmptyValues('.env', 'lowercase_key=#oops')
    assert.equal(detections.length, 1)
    assert.equal(detections[0].key, 'lowercase_key')
  })
})
