import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { seedSelfKey, seedDogfoodApplications } from '../../scripts/seed-self-key.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApplicationModel } from '../../models/application.js'

type ApiKeyModelType = Awaited<ReturnType<typeof getApiKeyModel>>
type ApplicationModelType = Awaited<ReturnType<typeof getApplicationModel>>

describe('seed-self-key script', () => {
  let ApiKeyModel: ApiKeyModelType
  let ApplicationModel: ApplicationModelType

  beforeAll(async () => {
    await setupTestDatabase()
    ApiKeyModel = await getApiKeyModel()
    ApplicationModel = await getApplicationModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ApiKeyModel.deleteMany({})
    await ApplicationModel.deleteMany({})
  })

  it('T1: first run creates exactly one ezauth self-key with correct metadata', async () => {
    const result = await seedSelfKey()

    expect(result.status).toBe('created')
    expect(result.rawKey).toBeDefined()
    expect(result.rawKey).toMatch(/^ez_pk_live_[a-f0-9]{64}$/)

    const docs = await ApiKeyModel.find({
      appName: 'ezauth',
      createdBy: 'system-seed',
      status: 'active',
    }).lean()

    expect(docs).toHaveLength(1)
    const doc = docs[0]!
    expect(doc.appName).toBe('ezauth')
    expect(doc.createdBy).toBe('system-seed')
    expect(doc.type).toBe('publishable')
    expect(doc.env).toBe('live')
    expect(doc.scope).toBe('admin')
    expect(doc.status).toBe('active')
    expect(doc.userId).toBe('system')
    expect(doc.permissions).toEqual(['*'])
    expect(doc.name).toBe('EZAuth self-key (system seed)')
  })

  it('T2: second run is idempotent — no duplicate key created', async () => {
    const first = await seedSelfKey()
    expect(first.status).toBe('created')

    const second = await seedSelfKey()
    expect(second.status).toBe('already-exists')
    expect(second.rawKey).toBeUndefined()
    expect(second.keyPrefix).toBe(first.keyPrefix)

    const count = await ApiKeyModel.countDocuments({
      appName: 'ezauth',
      createdBy: 'system-seed',
    })
    expect(count).toBe(1)
  })

  it('T3: keyPrefix follows `ez_pk_live_<6 hex chars>` format', async () => {
    await seedSelfKey()

    const doc = await ApiKeyModel.findOne({
      appName: 'ezauth',
      createdBy: 'system-seed',
    }).lean()

    expect(doc).not.toBeNull()
    expect(doc!.keyPrefix).toMatch(/^ez_pk_live_[a-f0-9]{6}$/)
  })

  it('T4: key field is a SHA-256 hex hash (64 chars)', async () => {
    await seedSelfKey()

    const doc = await ApiKeyModel.findOne({
      appName: 'ezauth',
      createdBy: 'system-seed',
    }).lean()

    expect(doc).not.toBeNull()
    expect(doc!.key).toMatch(/^[a-f0-9]{64}$/)
  })

  it('T5: quotaMonthly is null on the self-key (no quota)', async () => {
    await seedSelfKey()

    const doc = await ApiKeyModel.findOne({
      appName: 'ezauth',
      createdBy: 'system-seed',
    }).lean()

    expect(doc).not.toBeNull()
    expect(doc!.quotaMonthly).toBeNull()
  })

  it('T6: seedSelfKey creates the ezauth AND ezpay dogfood Applications', async () => {
    await seedSelfKey()

    const apps = await ApplicationModel.find({}).lean()
    const slugs = apps.map(a => a.slug).sort()
    expect(slugs).toEqual(['ezauth', 'ezpay'])

    const ezauth = apps.find(a => a.slug === 'ezauth')!
    expect(ezauth.createdBy).toBe('system-seed')
    expect(ezauth.ownerId).toBe('system')
    expect(ezauth.name).toBe('EZAuth')
    expect(ezauth.status).toBe('active')

    const ezpay = apps.find(a => a.slug === 'ezpay')!
    expect(ezpay.createdBy).toBe('system-seed')
    expect(ezpay.name).toBe('EZPay')
  })

  it('T7: self-key is linked to the ezauth Application via applicationId', async () => {
    await seedSelfKey()

    const ezauthApp = await ApplicationModel.findOne({ slug: 'ezauth' }).lean()
    const key = await ApiKeyModel.findOne({
      appName: 'ezauth',
      createdBy: 'system-seed',
    }).lean()

    expect(key?.applicationId?.toString()).toBe(ezauthApp?._id.toString())
  })

  it('T8: seeding twice leaves exactly 2 Applications (idempotent)', async () => {
    await seedSelfKey()
    await seedSelfKey()

    const count = await ApplicationModel.countDocuments({})
    expect(count).toBe(2)
  })

  it('T9: seedDogfoodApplications is idempotent and reports status', async () => {
    const first = await seedDogfoodApplications()
    expect(first).toHaveLength(2)
    expect(first.every(r => r.status === 'created')).toBe(true)

    const second = await seedDogfoodApplications()
    expect(second).toHaveLength(2)
    expect(second.every(r => r.status === 'already-exists')).toBe(true)

    const count = await ApplicationModel.countDocuments({})
    expect(count).toBe(2)
  })

  it('T10: self-heals a pre-P6 self-key by backfilling applicationId', async () => {
    // First: ensure Applications exist.
    await seedDogfoodApplications()
    const ezauthApp = await ApplicationModel.findOne({ slug: 'ezauth' }).lean()

    // Insert a legacy self-key that lacks applicationId (simulates pre-P6 DB).
    await ApiKeyModel.create({
      key: 'a'.repeat(64),
      keyPrefix: 'ez_pk_live_legacy',
      name: 'Legacy self-key',
      userId: 'system',
      appName: 'ezauth',
      type: 'publishable',
      env: 'live',
      scope: 'admin',
      permissions: ['*'],
      status: 'active',
      createdBy: 'system-seed',
      quotaMonthly: null,
    })

    const result = await seedSelfKey()
    expect(result.status).toBe('already-exists')

    const healed = await ApiKeyModel.findOne({
      appName: 'ezauth',
      createdBy: 'system-seed',
    }).lean()
    expect(healed?.applicationId?.toString()).toBe(ezauthApp?._id.toString())
  })
})
