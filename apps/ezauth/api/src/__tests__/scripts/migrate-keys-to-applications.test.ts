import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { migrateKeysToApplications } from '../../scripts/migrate-keys-to-applications.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApplicationModel } from '../../models/application.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../utils/api-key.js'

type ApiKeyModelT = Awaited<ReturnType<typeof getApiKeyModel>>
type ApplicationModelT = Awaited<ReturnType<typeof getApplicationModel>>

/** Insert a minimal ApiKey doc directly, mirroring legacy shapes. */
async function insertLegacyKey(
  ApiKey: ApiKeyModelT,
  overrides: {
    userId: string
    appName: string
    applicationId?: unknown
  }
) {
  const rawKey = generateRawApiKey({ type: 'publishable', env: 'live' })
  return ApiKey.create({
    key: hashApiKey(rawKey),
    keyPrefix: extractKeyPrefix(rawKey),
    name: `Test key for ${overrides.appName}`,
    userId: overrides.userId,
    appName: overrides.appName,
    applicationId: overrides.applicationId,
    type: 'publishable',
    env: 'live',
    scope: 'user',
    permissions: ['*'],
    status: 'active',
  })
}

describe('migrate-keys-to-applications script', () => {
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

  it('creates Applications for legacy keys and links them', async () => {
    await insertLegacyKey(ApiKey, { userId: 'user-a', appName: 'ezauth' })
    await insertLegacyKey(ApiKey, { userId: 'user-b', appName: 'ezpay' })
    // Platform-wide key — should be skipped.
    await insertLegacyKey(ApiKey, { userId: 'user-c', appName: '*' })

    const result = await migrateKeysToApplications()

    expect(result.created).toBe(2)
    expect(result.linked).toBe(2)
    expect(result.skipped).toBe(1)
    expect(result.invalidSlugs).toBe(0)

    const apps = await Application.find({}).lean()
    expect(apps).toHaveLength(2)
    expect(apps.map(a => a.slug).sort()).toEqual(['ezauth', 'ezpay'])

    const ezauthApp = apps.find(a => a.slug === 'ezauth')!
    expect(ezauthApp.ownerId).toBe('user-a')
    expect(ezauthApp.createdBy).toBe('migration-P6')
    expect(ezauthApp.name).toBe('ezauth')

    // Keys are linked.
    const linkedKeys = await ApiKey.find({ applicationId: { $exists: true, $ne: null } }).lean()
    expect(linkedKeys).toHaveLength(2)

    // Platform-wide key remains unlinked.
    const platformKey = await ApiKey.findOne({ appName: '*' }).lean()
    expect(platformKey?.applicationId).toBeUndefined()
  })

  it('is idempotent — second run does nothing new', async () => {
    await insertLegacyKey(ApiKey, { userId: 'user-a', appName: 'ezauth' })
    await insertLegacyKey(ApiKey, { userId: 'user-b', appName: 'ezpay' })

    const first = await migrateKeysToApplications()
    expect(first.created).toBe(2)
    expect(first.linked).toBe(2)

    const second = await migrateKeysToApplications()
    expect(second.created).toBe(0)
    expect(second.linked).toBe(0)
    expect(second.skipped).toBe(0)

    const apps = await Application.find({}).lean()
    expect(apps).toHaveLength(2)
  })

  it('reuses existing Applications rather than creating duplicates', async () => {
    // Pre-existing Application owned by someone else.
    const preExisting = await Application.create({
      slug: 'acme',
      name: 'Acme Corp',
      ownerId: 'original-owner',
      createdBy: 'original-owner',
      status: 'active',
    })

    // Multiple legacy keys all referencing the same slug.
    await insertLegacyKey(ApiKey, { userId: 'user-a', appName: 'acme' })
    await insertLegacyKey(ApiKey, { userId: 'user-b', appName: 'acme' })
    await insertLegacyKey(ApiKey, { userId: 'user-c', appName: 'acme' })

    const result = await migrateKeysToApplications()

    expect(result.created).toBe(0) // Reused the existing Application
    expect(result.linked).toBe(3)

    const apps = await Application.find({ slug: 'acme' }).lean()
    expect(apps).toHaveLength(1)
    expect(apps[0]!._id.toString()).toBe(preExisting._id.toString())

    // All keys point to the pre-existing Application.
    const linked = await ApiKey.find({ applicationId: preExisting._id }).lean()
    expect(linked).toHaveLength(3)
  })

  it('skips keys that are already linked (never re-processes)', async () => {
    const app = await Application.create({
      slug: 'existing',
      name: 'Existing',
      ownerId: 'user-x',
      createdBy: 'user-x',
      status: 'active',
    })

    await insertLegacyKey(ApiKey, {
      userId: 'user-x',
      appName: 'existing',
      applicationId: app._id,
    })

    const result = await migrateKeysToApplications()
    expect(result.linked).toBe(0)
    expect(result.created).toBe(0)
  })

  it('skips legacy keys with slugs that do not match the regex', async () => {
    await insertLegacyKey(ApiKey, { userId: 'user-a', appName: 'NOT VALID' })

    const result = await migrateKeysToApplications()
    expect(result.invalidSlugs).toBe(1)
    expect(result.created).toBe(0)
    expect(result.linked).toBe(0)
  })
})
