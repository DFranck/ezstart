/**
 * Tests for preflight validators + plan diff logic (`scripts/lib/secrets-cli.ts`).
 *
 * Run:
 *   pnpm tsx --test scripts/lib/__tests__/secrets-push-plan.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPushPlan,
  computePlan,
  findMissingRequired,
  findPlaceholderIssues,
  isPlaceholderValue,
  isPlatformVar,
  validateKnownFormats,
  targetLabel,
} from '../secrets-cli.js'

// ────────────────────────────────────────────────────────────
// NODE_ENV filter
// ────────────────────────────────────────────────────────────

describe('isPlatformVar — NODE_ENV', () => {
  it('matches NODE_ENV (never pushed; Railway/Vercel set it)', () => {
    assert.equal(isPlatformVar('NODE_ENV'), true)
  })
})

// ────────────────────────────────────────────────────────────
// Preflight
// ────────────────────────────────────────────────────────────

describe('isPlaceholderValue', () => {
  it('flags <PASTE_HERE> templates', () => {
    assert.equal(isPlaceholderValue('<PASTE_HERE>'), true)
    assert.equal(isPlaceholderValue('<MY_SECRET>'), true)
  })
  it('flags "your-..." style', () => {
    assert.equal(isPlaceholderValue('your-secret'), true)
    assert.equal(isPlaceholderValue('your_api_key'), true)
  })
  it('flags generic placeholders', () => {
    assert.equal(isPlaceholderValue('changeme'), true)
    assert.equal(isPlaceholderValue('xxx'), true)
    assert.equal(isPlaceholderValue('xxxxxx'), true)
    assert.equal(isPlaceholderValue('TODO'), true)
    assert.equal(isPlaceholderValue('tbd'), true)
    assert.equal(isPlaceholderValue(''), true)
  })
  it('leaves real values alone', () => {
    assert.equal(isPlaceholderValue('mongodb+srv://real-cluster'), false)
    assert.equal(isPlaceholderValue('sk-proj-abc123abc123abc123abc123abc123abc123'), false)
    assert.equal(isPlaceholderValue('https://abc123@o123.ingest.sentry.io/456'), false)
  })
})

describe('findPlaceholderIssues', () => {
  it('returns no issues for a clean source', () => {
    const issues = findPlaceholderIssues({
      JWT_SECRET: 'a'.repeat(64),
      MONGO_URL: 'mongodb+srv://cluster/{app}-{env}',
    })
    assert.equal(issues.length, 0)
  })
  it('flags placeholder + empty values', () => {
    const issues = findPlaceholderIssues({
      GOOD: 'mongodb+srv://cluster',
      BAD: '<PASTE_HERE>',
      EMPTY: '',
    })
    const keys = issues.map(i => i.key).sort()
    assert.deepEqual(keys, ['BAD', 'EMPTY'])
  })
})

describe('findMissingRequired', () => {
  it('requires JWT_SECRET + MONGO_URL (SHARED_REQUIRED)', () => {
    const issues = findMissingRequired({})
    const keys = issues.map(i => i.key)
    assert.ok(keys.includes('JWT_SECRET'))
    assert.ok(keys.includes('MONGO_URL'))
  })
  it('passes when all shared + per-app required vars are present', () => {
    const issues = findMissingRequired({
      JWT_SECRET: 'a'.repeat(32),
      MONGO_URL: 'mongodb+srv://x/{app}-{env}',
      OAUTH_STATE_SECRET: 'secret',
      STRIPE_SECRET_KEY: 'sk_test_...',
    })
    assert.equal(issues.length, 0)
  })
})

describe('validateKnownFormats', () => {
  it('rejects JWT_SECRET shorter than 32 chars', () => {
    const issues = validateKnownFormats({ JWT_SECRET: 'short' })
    assert.equal(issues.length, 1)
    assert.equal(issues[0]?.key, 'JWT_SECRET')
    assert.equal(issues[0]?.kind, 'invalid_format')
  })
  it('accepts JWT_SECRET of 32+ chars', () => {
    const issues = validateKnownFormats({ JWT_SECRET: 'a'.repeat(32) })
    assert.equal(issues.length, 0)
  })
  it('rejects MONGO_URL missing {app}/{env} placeholders', () => {
    const issues = validateKnownFormats({ MONGO_URL: 'mongodb+srv://hard/coded' })
    assert.equal(issues.length, 1)
    assert.equal(issues[0]?.kind, 'invalid_template')
  })
  it('accepts MONGO_URL template', () => {
    const issues = validateKnownFormats({
      MONGO_URL: 'mongodb+srv://cluster/{app}-{env}?retryWrites=true',
    })
    assert.equal(issues.length, 0)
  })
})

// ────────────────────────────────────────────────────────────
// Plan diff
// ────────────────────────────────────────────────────────────

describe('computePlan', () => {
  it('emits ADD when the cloud is empty', () => {
    const source = {
      JWT_SECRET: 'a'.repeat(64),
      MONGO_URL: 'mongodb+srv://c/{app}-{env}',
    }
    const entries = buildPushPlan(source, {
      env: 'production',
      restrict: ['JWT_SECRET'],
      includeRailway: true,
      includeVercel: false,
    })
    assert.ok(entries.length > 0, 'should produce entries for at least one railway service')
    const cloudByLabel = new Map<string, Record<string, string>>()
    const { rows, summary } = computePlan(entries, cloudByLabel)
    assert.equal(summary.update, 0)
    assert.equal(summary.delete, 0)
    assert.ok(summary.add > 0, 'expected ADD ops')
    assert.ok(rows.every(r => r.op === 'add'))
  })

  it('emits NOOP when cloud already has the value', () => {
    const source = { JWT_SECRET: 'a'.repeat(64) }
    const entries = buildPushPlan(source, {
      env: 'production',
      restrict: ['JWT_SECRET'],
      includeRailway: true,
      includeVercel: false,
    })
    const cloudByLabel = new Map<string, Record<string, string>>()
    for (const e of entries) {
      const label = targetLabel(e.target)
      cloudByLabel.set(label, { JWT_SECRET: 'a'.repeat(64) })
    }
    const { summary } = computePlan(entries, cloudByLabel)
    assert.equal(summary.add, 0)
    assert.equal(summary.update, 0)
    assert.ok(summary.noop > 0)
  })

  it('emits UPDATE when value drifted', () => {
    const source = { JWT_SECRET: 'a'.repeat(64) }
    const entries = buildPushPlan(source, {
      env: 'production',
      restrict: ['JWT_SECRET'],
      includeRailway: true,
      includeVercel: false,
    })
    const cloudByLabel = new Map<string, Record<string, string>>()
    for (const e of entries) {
      const label = targetLabel(e.target)
      cloudByLabel.set(label, { JWT_SECRET: 'OLDVALUE' })
    }
    const { summary } = computePlan(entries, cloudByLabel)
    assert.equal(summary.add, 0)
    assert.ok(summary.update > 0)
  })

  it('emits DELETE for managed keys present on cloud but not in plan', () => {
    const source = { JWT_SECRET: 'a'.repeat(64) }
    const entries = buildPushPlan(source, {
      env: 'production',
      restrict: ['JWT_SECRET'],
      includeRailway: true,
      includeVercel: false,
    })
    const cloudByLabel = new Map<string, Record<string, string>>()
    const first = entries[0]
    assert.ok(first)
    const label = targetLabel(first.target)
    cloudByLabel.set(label, {
      JWT_SECRET: 'a'.repeat(64),
      // RESEND_API_KEY is declared in VAR_TARGETS → counts as managed
      RESEND_API_KEY: 'leftover',
    })
    const { rows, summary } = computePlan(entries, cloudByLabel)
    const del = rows.find(r => r.op === 'delete' && r.key === 'RESEND_API_KEY')
    assert.ok(del, 'RESEND_API_KEY should be flagged for DELETE')
    assert.ok(summary.delete >= 1)
  })

  it('does NOT emit DELETE for unmanaged/platform keys', () => {
    const source = { JWT_SECRET: 'a'.repeat(64) }
    const entries = buildPushPlan(source, {
      env: 'production',
      restrict: ['JWT_SECRET'],
      includeRailway: true,
      includeVercel: false,
    })
    const cloudByLabel = new Map<string, Record<string, string>>()
    const first = entries[0]
    assert.ok(first)
    const label = targetLabel(first.target)
    cloudByLabel.set(label, {
      JWT_SECRET: 'a'.repeat(64),
      NODE_ENV: 'production', // platform
      PORT: '3000', // platform
      UNMANAGED_USER_VAR: 'keep', // unknown — user-managed
    })
    const { rows } = computePlan(entries, cloudByLabel)
    const deletes = rows.filter(r => r.op === 'delete').map(r => r.key)
    assert.ok(!deletes.includes('NODE_ENV'), 'NODE_ENV must not be deleted')
    assert.ok(!deletes.includes('PORT'), 'PORT must not be deleted')
    assert.ok(!deletes.includes('UNMANAGED_USER_VAR'), 'unmanaged vars must not be deleted')
  })
})
