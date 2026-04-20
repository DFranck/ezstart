import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { seedSelfKey } from '../../scripts/seed-self-key.js'
import { getApiKeyModel } from '../../models/api-key.js'

type ApiKeyModelType = Awaited<ReturnType<typeof getApiKeyModel>>

describe('seed-self-key script', () => {
  let ApiKeyModel: ApiKeyModelType

  beforeAll(async () => {
    await setupTestDatabase()
    ApiKeyModel = await getApiKeyModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ApiKeyModel.deleteMany({})
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
})
