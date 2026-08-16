/**
 * Tests for the IGNORED_VARS allowlist exported by `@ezstart/config`.
 *
 * `secrets-verify.ts` skips any var name listed in IGNORED_VARS before
 * classifying MISSING_IN_MAPPING — so that vars intentionally kept out of
 * the cloud push mapping (ALERT_*, ALLOW_PROD_MIGRATION, PAYMENT_PROVIDER)
 * don't pollute CI output.
 *
 * Run:
 *   pnpm tsx --test scripts/lib/__tests__/secrets-verify-ignored.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { IGNORED_VARS, VAR_TARGETS } from '@ezstart/config'

const IGNORED_SET = new Set(IGNORED_VARS)

describe('IGNORED_VARS allowlist', () => {
  it('contains every ALERT_* monitoring var', () => {
    const expected = [
      'ALERT_EMAIL_ENABLED',
      'ALERT_EMAIL_FROM',
      'ALERT_EMAIL_TO',
      'ALERT_SMTP_HOST',
      'ALERT_SMTP_PORT',
      'ALERT_SMTP_USER',
      'ALERT_SMTP_PASS',
      'ALERT_SLACK_ENABLED',
      'ALERT_SLACK_WEBHOOK',
    ]
    for (const key of expected) {
      assert.equal(IGNORED_SET.has(key), true, `expected ${key} in IGNORED_VARS`)
    }
  })

  it('contains ALLOW_PROD_MIGRATION safety flag', () => {
    assert.equal(IGNORED_SET.has('ALLOW_PROD_MIGRATION'), true)
  })

  it('contains PAYMENT_PROVIDER dev toggle', () => {
    assert.equal(IGNORED_SET.has('PAYMENT_PROVIDER'), true)
  })

  it('never overlaps with VAR_TARGETS (no double-declaration)', () => {
    const mappingKeys = new Set(Object.keys(VAR_TARGETS))
    for (const key of IGNORED_VARS) {
      assert.equal(
        mappingKeys.has(key),
        false,
        `${key} is in both IGNORED_VARS and VAR_TARGETS — pick one`
      )
    }
  })
})

describe('verify-style skip behaviour', () => {
  // Minimal re-implementation of the skip guard used in secrets-verify.ts —
  // keeps the test independent from filesystem scans while still pinning
  // the semantic contract.
  function classify(
    key: string,
    codeUsageCount: number,
    mappingHas: boolean
  ): 'MISSING_IN_MAPPING' | 'SKIPPED' | 'OK' {
    if (IGNORED_SET.has(key)) return 'SKIPPED'
    if (codeUsageCount > 0 && !mappingHas) return 'MISSING_IN_MAPPING'
    return 'OK'
  }

  it('without IGNORED_VARS, ALERT_* would be MISSING_IN_MAPPING', () => {
    const fakeSet: ReadonlySet<string> = new Set()
    const mappingHas = Object.prototype.hasOwnProperty.call(VAR_TARGETS, 'ALERT_EMAIL_FROM')
    const result = fakeSet.has('ALERT_EMAIL_FROM')
      ? 'SKIPPED'
      : !mappingHas
        ? 'MISSING_IN_MAPPING'
        : 'OK'
    assert.equal(result, 'MISSING_IN_MAPPING')
  })

  it('with IGNORED_VARS active, ALERT_* is skipped', () => {
    assert.equal(classify('ALERT_EMAIL_FROM', 1, false), 'SKIPPED')
    assert.equal(classify('ALLOW_PROD_MIGRATION', 1, false), 'SKIPPED')
    assert.equal(classify('PAYMENT_PROVIDER', 1, false), 'SKIPPED')
  })

  it('non-ignored missing vars still get flagged', () => {
    assert.equal(classify('SOME_NEW_VAR', 1, false), 'MISSING_IN_MAPPING')
  })
})
