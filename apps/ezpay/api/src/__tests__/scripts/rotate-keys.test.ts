/**
 * Tests for the ezpay `rotate-keys` script.
 *
 * Uses `MongoMemoryServer` via `@ezstart/test-utils` for the ezpay DB. The
 * script never reaches out to ezauth — it operates purely on the local
 * `apiKeys` collection.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { parseRotateKeysArgs, rotateKeys } from '../../scripts/rotate-keys.js'
import { getApiKeyModel } from '../../models/api-key.js'

type ApiKeyModelType = Awaited<ReturnType<typeof getApiKeyModel>>

const APP_ID = 'app-staging-id'
const APP_SLUG = 'ezpay'

async function insertSeededKey(
  ApiKey: ApiKeyModelType,
  overrides: {
    keyPrefix: string
    appSlug?: string
    applicationId?: string
    type?: 'publishable' | 'secret'
    env?: 'live' | 'test'
    createdBy?: string
    createdAt?: Date
    status?: 'active' | 'revoked'
  }
): Promise<void> {
  const env = overrides.env ?? 'live'
  await ApiKey.collection.insertOne({
    key: `hash-${overrides.keyPrefix}`,
    keyPrefix: overrides.keyPrefix,
    name: `Test ${overrides.keyPrefix}`,
    userId: 'system',
    applicationId: overrides.applicationId ?? APP_ID,
    appSlug: overrides.appSlug ?? APP_SLUG,
    type: overrides.type ?? 'publishable',
    env,
    scope: 'admin',
    permissions: ['*'],
    status: overrides.status ?? 'active',
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    quotaMonthly: null,
    createdBy: overrides.createdBy ?? 'system-seed',
    isTestMode: env === 'test',
    createdAt: overrides.createdAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  })
}

describe('parseRotateKeysArgs', () => {
  it('returns local + non-destructive defaults when no args', () => {
    expect(parseRotateKeysArgs([])).toEqual({
      env: 'local',
      dryRun: false,
      force: false,
      yesRotateProduction: false,
    })
  })

  it('parses --env, --dry-run, --force, --yes-rotate-production', () => {
    expect(
      parseRotateKeysArgs(['--env=staging', '--dry-run', '--force', '--yes-rotate-production'])
    ).toEqual({
      env: 'staging',
      dryRun: true,
      force: true,
      yesRotateProduction: true,
    })
  })

  it('throws RangeError on unknown --env value', () => {
    expect(() => parseRotateKeysArgs(['--env=qa'])).toThrow(RangeError)
  })

  it('accepts every supported env value', () => {
    for (const env of ['local', 'staging', 'production'] as const) {
      expect(parseRotateKeysArgs([`--env=${env}`]).env).toBe(env)
    }
  })
})

describe('rotateKeys (ezpay)', () => {
  let ApiKeyModel: ApiKeyModelType
  let originalNodeEnv: string | undefined

  beforeAll(async () => {
    await setupTestDatabase()
    ApiKeyModel = await getApiKeyModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ApiKeyModel.deleteMany({})
    originalNodeEnv = process.env.NODE_ENV
    // The rotateKeys() core refuses NODE_ENV=test as a destructive-guard
    // safety net. Vitest sets it to 'test' by default, so we explicitly
    // flip it to 'development' for tests that exercise the happy path.
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('T1: refuses to run when NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test'
    await expect(
      rotateKeys({
        env: 'local',
        dryRun: false,
        force: false,
        yesRotateProduction: false,
      })
    ).rejects.toThrow(/NODE_ENV=test/)
  })

  it('T2: refuses production without --yes-rotate-production', async () => {
    await expect(
      rotateKeys({
        env: 'production',
        dryRun: false,
        force: false,
        yesRotateProduction: false,
      })
    ).rejects.toThrow(/--yes-rotate-production/)
  })

  it('T3: production allowed when --yes-rotate-production is set', async () => {
    // No seeded keys → nothing rotated, but the guard MUST let us through.
    const result = await rotateKeys({
      env: 'production',
      dryRun: true,
      force: false,
      yesRotateProduction: true,
    })
    expect(result.rotated).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
  })

  it('T4: dry-run plans rotations without DB writes', async () => {
    await insertSeededKey(ApiKeyModel, { keyPrefix: 'ez_pk_live_aaaaaa' })
    await insertSeededKey(ApiKeyModel, {
      keyPrefix: 'ez_sk_live_bbbbbb',
      type: 'secret',
    })

    const result = await rotateKeys({
      env: 'staging',
      dryRun: true,
      force: false,
      yesRotateProduction: false,
    })

    expect(result.rotated).toHaveLength(2)
    expect(result.skipped).toHaveLength(0)

    // No rawKey in dry-run, no newKeyId.
    for (const r of result.rotated) {
      expect(r.rawKey).toBeUndefined()
      expect(r.newKeyId).toBeUndefined()
      expect(r.newKeyPrefix).toMatch(/^ez_(pk|sk)_live_[a-f0-9]{6}$/)
    }

    // DB untouched: 2 active rows, 0 revoked.
    const active = await ApiKeyModel.countDocuments({ status: 'active' })
    const revoked = await ApiKeyModel.countDocuments({ status: 'revoked' })
    expect(active).toBe(2)
    expect(revoked).toBe(0)
  })

  it('T5: full rotation revokes old keys + mints fresh ones with same metadata', async () => {
    await insertSeededKey(ApiKeyModel, {
      keyPrefix: 'ez_pk_live_aaaaaa',
      type: 'publishable',
      env: 'live',
    })
    await insertSeededKey(ApiKeyModel, {
      keyPrefix: 'ez_pk_test_cccccc',
      type: 'publishable',
      env: 'test',
      createdBy: 'system-seed-consumer',
    })

    const result = await rotateKeys({
      env: 'staging',
      dryRun: false,
      force: false,
      yesRotateProduction: false,
    })

    expect(result.rotated).toHaveLength(2)
    expect(result.skipped).toHaveLength(0)

    for (const r of result.rotated) {
      expect(r.rawKey).toBeDefined()
      expect(r.newKeyId).toBeDefined()
      expect(r.rawKey).toMatch(/^ez_(pk|sk)_(live|test)_[a-f0-9]{64}$/)
    }

    const liveRotated = result.rotated.find(r => r.env === 'live')
    expect(liveRotated?.createdBy).toBe('system-seed')
    const testRotated = result.rotated.find(r => r.env === 'test')
    expect(testRotated?.createdBy).toBe('system-seed-consumer')

    // 2 old keys revoked + 2 new keys active = 4 docs total.
    const total = await ApiKeyModel.countDocuments({})
    expect(total).toBe(4)
    const active = await ApiKeyModel.find({ status: 'active' }).lean()
    expect(active).toHaveLength(2)
    const revoked = await ApiKeyModel.find({ status: 'revoked' }).lean()
    expect(revoked).toHaveLength(2)

    // New docs carry the same metadata as the old ones.
    for (const a of active) {
      expect(a.applicationId).toBe(APP_ID)
      expect(a.appSlug).toBe(APP_SLUG)
      expect(a.scope).toBe('admin')
      expect(a.permissions).toEqual(['*'])
      expect(a.userId).toBe('system')
      // isTestMode mirrors env in lockstep.
      expect(a.isTestMode).toBe(a.env === 'test')
    }
  })

  it('T6: skips keys younger than 7 days without --force', async () => {
    const recent = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day old
    await insertSeededKey(ApiKeyModel, {
      keyPrefix: 'ez_pk_live_dddddd',
      createdAt: recent,
    })

    const result = await rotateKeys({
      env: 'staging',
      dryRun: false,
      force: false,
      yesRotateProduction: false,
    })

    expect(result.rotated).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]?.reason).toBe('too-recent')

    // DB untouched.
    const active = await ApiKeyModel.countDocuments({ status: 'active' })
    expect(active).toBe(1)
  })

  it('T7: --force bypasses the 7-day idempotence guard', async () => {
    const recent = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await insertSeededKey(ApiKeyModel, {
      keyPrefix: 'ez_pk_live_eeeeee',
      createdAt: recent,
    })

    const result = await rotateKeys({
      env: 'staging',
      dryRun: false,
      force: true,
      yesRotateProduction: false,
    })

    expect(result.rotated).toHaveLength(1)
    expect(result.skipped).toHaveLength(0)
    expect(result.rotated[0]?.rawKey).toBeDefined()
  })

  it('T8: ignores manually-created keys (non system-seed createdBy)', async () => {
    await insertSeededKey(ApiKeyModel, {
      keyPrefix: 'ez_pk_live_ffffff',
      createdBy: 'user-12345', // dashboard-created
    })
    await insertSeededKey(ApiKeyModel, {
      keyPrefix: 'ez_pk_live_111111',
      createdBy: 'system-seed',
    })

    const result = await rotateKeys({
      env: 'staging',
      dryRun: false,
      force: false,
      yesRotateProduction: false,
    })

    expect(result.rotated).toHaveLength(1)
    expect(result.rotated[0]?.oldKeyPrefix).toBe('ez_pk_live_111111')

    // The user-created key is untouched.
    const userKey = await ApiKeyModel.findOne({ keyPrefix: 'ez_pk_live_ffffff' })
    expect(userKey?.status).toBe('active')
  })

  it('T9: ignores already-revoked seeded keys', async () => {
    await insertSeededKey(ApiKeyModel, {
      keyPrefix: 'ez_pk_live_revoked',
      status: 'revoked',
    })

    const result = await rotateKeys({
      env: 'staging',
      dryRun: false,
      force: true,
      yesRotateProduction: false,
    })

    expect(result.rotated).toHaveLength(0)
    expect(result.skipped).toHaveLength(0)
  })
})
