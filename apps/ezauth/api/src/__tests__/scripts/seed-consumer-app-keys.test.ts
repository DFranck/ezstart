import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  seedConsumerAppKeys,
  CONSUMER_APP_SLUGS,
  KEYS_TO_SEED,
} from '../../scripts/seed-consumer-app-keys.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApplicationModel } from '../../models/application.js'

type ApiKeyModelT = Awaited<ReturnType<typeof getApiKeyModel>>
type ApplicationModelT = Awaited<ReturnType<typeof getApplicationModel>>

const KEYS_PER_APP = 4
const TOTAL_KEYS = CONSUMER_APP_SLUGS.length * KEYS_PER_APP

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

  it('creates Applications and 4 keys per consumer slug (Stripe-pattern pk_live + sk_live + pk_test + sk_test)', async () => {
    const results = await seedConsumerAppKeys()

    expect(results).toHaveLength(CONSUMER_APP_SLUGS.length)

    // Every Application is freshly created on first run.
    expect(results.every(r => r.applicationStatus === 'created')).toBe(true)

    // Each app gets exactly 4 fresh keys.
    for (const r of results) {
      expect(r.keys).toHaveLength(KEYS_PER_APP)
      expect(r.keys.every(k => k.status === 'created')).toBe(true)
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

    // 4 keys per app — total = N apps × 4.
    const keys = await ApiKey.find({}).lean()
    expect(keys).toHaveLength(TOTAL_KEYS)
  })

  it('generates the 4 distinct (type, env) combinations per Application with correct prefixes', async () => {
    const results = await seedConsumerAppKeys()

    for (const r of results) {
      // Inspect each of the 4 spec slots
      for (const spec of KEYS_TO_SEED) {
        const found = r.keys.find(k => k.type === spec.type && k.env === spec.env)
        expect(found, `${r.slug} missing ${spec.label}`).toBeDefined()
        expect(found!.label).toBe(spec.label)
        expect(found!.scope).toBe(spec.scope)
        expect(found!.status).toBe('created')
        expect(found!.rawKey).toBeDefined()

        // Verify the raw key prefix matches the (type, env) tuple.
        const expectedPrefix = `ez_${spec.type === 'publishable' ? 'pk' : 'sk'}_${spec.env}_`
        expect(
          found!.rawKey!.startsWith(expectedPrefix),
          `${r.slug} ${spec.label} bad prefix`
        ).toBe(true)
        expect(found!.rawKey).toMatch(new RegExp(`^${expectedPrefix}[0-9a-f]{64}$`))
        expect(found!.keyPrefix.startsWith(expectedPrefix)).toBe(true)
      }
    }
  })

  it('persists secret keys with scope=admin and publishable keys with scope=user', async () => {
    await seedConsumerAppKeys()
    const keys = await ApiKey.find({}).lean()

    for (const key of keys) {
      if (key.type === 'secret') {
        expect(key.scope).toBe('admin')
      } else if (key.type === 'publishable') {
        expect(key.scope).toBe('user')
      }
    }
  })

  it('mirrors isTestMode in lockstep with env (test ↔ true, live ↔ false)', async () => {
    await seedConsumerAppKeys()
    const keys = await ApiKey.find({}).lean()

    for (const key of keys) {
      if (key.env === 'test') {
        expect(key.isTestMode).toBe(true)
      } else if (key.env === 'live') {
        expect(key.isTestMode).toBe(false)
      }
    }
  })

  it('every key carries createdBy=system-seed-consumer, status=active, applicationId set', async () => {
    await seedConsumerAppKeys()
    const keys = await ApiKey.find({}).lean()

    for (const key of keys) {
      expect(key.createdBy).toBe('system-seed-consumer')
      expect(key.status).toBe('active')
      expect(key.applicationId).toBeDefined()
      expect(key.userId).toBe('system')
    }
  })

  it('is idempotent — second run creates zero new keys', async () => {
    const first = await seedConsumerAppKeys()
    const firstCreatedCount = first.reduce(
      (acc, r) => acc + r.keys.filter(k => k.status === 'created').length,
      0
    )
    expect(firstCreatedCount).toBe(TOTAL_KEYS)

    const second = await seedConsumerAppKeys()
    expect(second.every(r => r.applicationStatus === 'already-exists')).toBe(true)
    for (const r of second) {
      expect(r.keys).toHaveLength(KEYS_PER_APP)
      expect(r.keys.every(k => k.status === 'already-exists')).toBe(true)
      // Raw keys are never leaked on subsequent runs.
      expect(r.keys.every(k => k.rawKey === undefined)).toBe(true)
    }

    const keys = await ApiKey.find({}).lean()
    expect(keys).toHaveLength(TOTAL_KEYS)
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
    // The 4 keys should still get created against the pre-existing Application.
    expect(ezstart!.keys).toHaveLength(KEYS_PER_APP)
    expect(ezstart!.keys.every(k => k.status === 'created')).toBe(true)

    const apps = await Application.find({ slug: 'ezstart' }).lean()
    expect(apps).toHaveLength(1)
    expect(apps[0]!.ownerId).toBe('human-user-id')
    expect(apps[0]!.createdBy).toBe('admin-manual')
  })

  it('backward compat — detects legacy single pk_live (predates 4-key refactor) and only generates the 3 missing keys', async () => {
    // Pre-create a legacy Application + a single pk_live key (the only thing
    // the previous version of this script would have seeded).
    const app = await Application.create({
      slug: 'ezbill',
      name: 'EZBill',
      ownerId: 'system',
      createdBy: 'system-seed-consumer',
      status: 'active',
    })

    await ApiKey.create({
      key: 'legacy-hash-placeholder-1',
      keyPrefix: 'ez_pk_live_legacy',
      name: 'EZBill consumer key (system seed)',
      userId: 'system',
      appName: 'ezbill',
      applicationId: app._id,
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
      createdBy: 'system-seed-consumer',
      quotaMonthly: null,
      isTestMode: false,
    })

    const results = await seedConsumerAppKeys()

    const ezbill = results.find(r => r.slug === 'ezbill')!
    expect(ezbill.keys).toHaveLength(KEYS_PER_APP)

    const pkLive = ezbill.keys.find(k => k.label === 'pk_live')!
    const skLive = ezbill.keys.find(k => k.label === 'sk_live')!
    const pkTest = ezbill.keys.find(k => k.label === 'pk_test')!
    const skTest = ezbill.keys.find(k => k.label === 'sk_test')!

    // Legacy pk_live is detected and skipped.
    expect(pkLive.status).toBe('already-exists')
    expect(pkLive.keyPrefix).toBe('ez_pk_live_legacy')

    // The 3 missing keys are freshly generated.
    expect(skLive.status).toBe('created')
    expect(pkTest.status).toBe('created')
    expect(skTest.status).toBe('created')

    // DB state: ezbill has exactly 4 keys (1 legacy + 3 new), no duplicates.
    const ezbillKeys = await ApiKey.find({ appName: 'ezbill' }).lean()
    expect(ezbillKeys).toHaveLength(KEYS_PER_APP)
  })

  it('self-heals legacy pk_live keys missing applicationId (link them to their Application)', async () => {
    // Create Application first.
    const app = await Application.create({
      slug: 'fengshui',
      name: 'Feng Shui 2026',
      ownerId: 'system',
      createdBy: 'system-seed-consumer',
      status: 'active',
    })

    // Simulate a legacy pre-P6 seed key missing applicationId.
    await ApiKey.create({
      key: 'legacy-hash-placeholder-fengshui',
      keyPrefix: 'ez_pk_live_legact',
      name: 'Feng Shui legacy',
      userId: 'system',
      appName: 'fengshui',
      // applicationId omitted deliberately.
      type: 'publishable',
      env: 'live',
      scope: 'user',
      permissions: ['*'],
      status: 'active',
      createdBy: 'system-seed-consumer',
      quotaMonthly: null,
      isTestMode: false,
    })

    await seedConsumerAppKeys()

    // The legacy key is now linked to the Application.
    const fengshuiKeys = await ApiKey.find({ appName: 'fengshui' }).lean()
    expect(fengshuiKeys).toHaveLength(KEYS_PER_APP)
    const linkedLegacy = fengshuiKeys.find(k => k.keyPrefix === 'ez_pk_live_legact')
    expect(linkedLegacy).toBeDefined()
    expect(linkedLegacy!.applicationId?.toString()).toBe(app._id.toString())
  })

  it('never generates duplicate raw keys across slugs', async () => {
    const results = await seedConsumerAppKeys()

    const allRawKeys: string[] = []
    for (const r of results) {
      for (const k of r.keys) {
        if (k.rawKey) allRawKeys.push(k.rawKey)
      }
    }

    expect(allRawKeys).toHaveLength(TOTAL_KEYS)
    expect(new Set(allRawKeys).size).toBe(allRawKeys.length)

    const allPrefixes: string[] = []
    for (const r of results) {
      for (const k of r.keys) {
        allPrefixes.push(k.keyPrefix)
      }
    }
    // All key prefixes are unique (each prefix includes 6 random hex chars).
    expect(new Set(allPrefixes).size).toBe(allPrefixes.length)
  })

  it('exposes KEYS_TO_SEED with the canonical 4 specs in stable order', () => {
    expect(KEYS_TO_SEED).toHaveLength(4)
    expect(KEYS_TO_SEED.map(k => k.label)).toEqual(['pk_live', 'sk_live', 'pk_test', 'sk_test'])
    expect(KEYS_TO_SEED.find(k => k.label === 'sk_live')!.scope).toBe('admin')
    expect(KEYS_TO_SEED.find(k => k.label === 'pk_live')!.scope).toBe('user')
  })
})
