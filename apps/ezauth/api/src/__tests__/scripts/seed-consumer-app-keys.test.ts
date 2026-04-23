import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { seedConsumerAppKeys, CONSUMER_APP_SLUGS } from '../../scripts/seed-consumer-app-keys.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApplicationModel } from '../../models/application.js'

type ApiKeyModelT = Awaited<ReturnType<typeof getApiKeyModel>>
type ApplicationModelT = Awaited<ReturnType<typeof getApplicationModel>>

describe('seed-consumer-app-keys script', () => {
  let ApiKey: ApiKeyModelT
  let Application: ApplicationModelT

  beforeAll(async () => {
    await setupTestDatabase()
    ApiKey = await getApiKeyModel()
    Application = await getApplicationModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ApiKey.deleteMany({})
    await Application.deleteMany({})
  })

  it('creates Applications and publishable keys for all consumer slugs', async () => {
    const results = await seedConsumerAppKeys()

    expect(results).toHaveLength(CONSUMER_APP_SLUGS.length)
    expect(results.every(r => r.keyStatus === 'created')).toBe(true)
    expect(results.every(r => r.applicationStatus === 'created')).toBe(true)

    // Each raw key is an ez_pk_live_* key with 64 hex chars.
    for (const r of results) {
      expect(r.rawKey).toMatch(/^ez_pk_live_[0-9a-f]{64}$/)
      expect(r.keyPrefix.startsWith('ez_pk_live_')).toBe(true)
    }

    // Applications created with expected slugs.
    const apps = await Application.find({}).lean()
    const slugs = apps.map(a => a.slug).sort()
    const expected = CONSUMER_APP_SLUGS.map(c => c.slug).sort()
    expect(slugs).toEqual(expected)

    // Every app has ownerId 'system' and createdBy 'system-seed-consumer'.
    for (const app of apps) {
      expect(app.ownerId).toBe('system')
      expect(app.createdBy).toBe('system-seed-consumer')
      expect(app.status).toBe('active')
    }

    // Every key is linked to its Application.
    const keys = await ApiKey.find({}).lean()
    expect(keys).toHaveLength(CONSUMER_APP_SLUGS.length)
    for (const key of keys) {
      expect(key.applicationId).toBeDefined()
      expect(key.type).toBe('publishable')
      expect(key.env).toBe('live')
      expect(key.scope).toBe('user')
      expect(key.createdBy).toBe('system-seed-consumer')
      expect(key.status).toBe('active')
    }
  })

  it('is idempotent — second run produces zero new keys', async () => {
    const first = await seedConsumerAppKeys()
    expect(first.filter(r => r.keyStatus === 'created')).toHaveLength(CONSUMER_APP_SLUGS.length)

    const second = await seedConsumerAppKeys()
    expect(second.every(r => r.keyStatus === 'already-exists')).toBe(true)
    expect(second.every(r => r.applicationStatus === 'already-exists')).toBe(true)
    // Raw keys are never leaked on subsequent runs.
    expect(second.every(r => r.rawKey === undefined)).toBe(true)

    const keys = await ApiKey.find({}).lean()
    expect(keys).toHaveLength(CONSUMER_APP_SLUGS.length)
    const apps = await Application.find({}).lean()
    expect(apps).toHaveLength(CONSUMER_APP_SLUGS.length)
  })

  it('reuses pre-existing Applications (created by other bootstrap scripts)', async () => {
    const preExisting = await Application.create({
      slug: 'ezstart',
      name: 'EZStart Custom',
      ownerId: 'human-user-id',
      createdBy: 'admin-manual',
      status: 'active',
    })

    const results = await seedConsumerAppKeys()

    const ezstart = results.find(r => r.slug === 'ezstart')
    expect(ezstart).toBeDefined()
    expect(ezstart!.applicationStatus).toBe('already-exists')
    expect(ezstart!.applicationId).toBe(preExisting._id.toString())

    const apps = await Application.find({ slug: 'ezstart' }).lean()
    expect(apps).toHaveLength(1)
    expect(apps[0]!.ownerId).toBe('human-user-id')
    expect(apps[0]!.createdBy).toBe('admin-manual')
  })

  it('self-heals legacy seed keys missing applicationId', async () => {
    // Create Application first.
    const app = await Application.create({
      slug: 'ezbill',
      name: 'EZBill',
      ownerId: 'system',
      createdBy: 'system-seed-consumer',
      status: 'active',
    })

    // Simulate a legacy seed key missing applicationId.
    await ApiKey.create({
      key: 'legacy-hash-placeholder-1',
      keyPrefix: 'ez_pk_live_legacy',
      name: 'EZBill legacy',
      userId: 'system',
      appName: 'ezbill',
      // applicationId omitted deliberately.
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
      createdBy: 'system-seed-consumer',
      quotaMonthly: null,
    })

    await seedConsumerAppKeys()

    const key = await ApiKey.findOne({ appName: 'ezbill' }).lean()
    expect(key).toBeDefined()
    expect(key!.applicationId?.toString()).toBe(app._id.toString())
  })

  it('never shares a raw key across different slugs', async () => {
    const results = await seedConsumerAppKeys()

    const rawKeys = results.map(r => r.rawKey).filter((k): k is string => typeof k === 'string')
    expect(rawKeys).toHaveLength(CONSUMER_APP_SLUGS.length)
    expect(new Set(rawKeys).size).toBe(rawKeys.length)

    const prefixes = results.map(r => r.keyPrefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })
})
