/**
 * Tests for `seed-docs-demo-app` (DOCS_DEMO_SANDBOX_BACKEND-001).
 *
 * Coverage:
 *  - First run creates the `_docs-demo` Application + 2 keys with correct
 *    metadata (reservedSlug, isPlatformOwned, isTestMode, quotas).
 *  - Idempotent on re-run (no duplicate Application or keys).
 *  - Self-heals an Application that predates this seed (back-fills quotas /
 *    reservedSlug / isPlatformOwned / isTestMode in place).
 *  - Generated keys carry the `_docs-demo` appName + `env: 'test'` +
 *    `isTestMode: true` consistent with the test mode partition.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  seedDocsDemoApp,
  DOCS_DEMO_APP_SLUG,
  DOCS_DEMO_QUOTAS,
  DOCS_DEMO_SEED_MARKER,
} from '../../scripts/seed-docs-demo-app.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApplicationModel } from '../../models/application.js'

type ApiKeyModelType = Awaited<ReturnType<typeof getApiKeyModel>>
type ApplicationModelType = Awaited<ReturnType<typeof getApplicationModel>>

describe('seed-docs-demo-app script', () => {
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

  it('T1: first run creates the docs-demo Application with correct metadata', async () => {
    const result = await seedDocsDemoApp()

    expect(result.applicationStatus).toBe('created')
    expect(result.applicationId).toBeTruthy()

    const app = await ApplicationModel.findOne({ slug: DOCS_DEMO_APP_SLUG }).lean()
    expect(app).not.toBeNull()
    expect(app!.slug).toBe(DOCS_DEMO_APP_SLUG)
    expect(app!.reservedSlug).toBe(true)
    expect(app!.isPlatformOwned).toBe(true)
    expect(app!.isTestMode).toBe(true)
    expect(app!.quotas).toEqual(DOCS_DEMO_QUOTAS)
    expect(app!.createdBy).toBe(DOCS_DEMO_SEED_MARKER)
    expect(app!.ownerId).toBe('system')
  })

  it('T2: first run creates exactly 2 API keys (pk_test + sk_test)', async () => {
    const result = await seedDocsDemoApp()

    expect(result.keys).toHaveLength(2)
    const labels = result.keys.map(k => k.label).sort()
    expect(labels).toEqual(['pk_test', 'sk_test'])

    const docs = await ApiKeyModel.find({
      appName: DOCS_DEMO_APP_SLUG,
      createdBy: DOCS_DEMO_SEED_MARKER,
      status: 'active',
    }).lean()
    expect(docs).toHaveLength(2)

    // Both must be `env: 'test'` + `isTestMode: true`.
    for (const doc of docs) {
      expect(doc.env).toBe('test')
      expect(doc.isTestMode).toBe(true)
    }

    // pk_test = publishable + scope user, sk_test = secret + scope admin.
    const pk = docs.find(d => d.type === 'publishable')!
    const sk = docs.find(d => d.type === 'secret')!
    expect(pk.scope).toBe('user')
    expect(sk.scope).toBe('admin')
  })

  it('T3: each created key returns a raw key matching the expected prefix', async () => {
    const result = await seedDocsDemoApp()

    const pk = result.keys.find(k => k.label === 'pk_test')!
    const sk = result.keys.find(k => k.label === 'sk_test')!

    expect(pk.status).toBe('created')
    expect(pk.rawKey).toMatch(/^ez_pk_test_[a-f0-9]{64}$/)

    expect(sk.status).toBe('created')
    expect(sk.rawKey).toMatch(/^ez_sk_test_[a-f0-9]{64}$/)
  })

  it('T4: second run is idempotent — no duplicate Application or keys', async () => {
    const first = await seedDocsDemoApp()
    expect(first.applicationStatus).toBe('created')

    const second = await seedDocsDemoApp()
    expect(second.applicationStatus).toBe('already-exists')
    expect(second.applicationId).toBe(first.applicationId)
    for (const k of second.keys) {
      expect(k.status).toBe('already-exists')
      expect(k.rawKey).toBeUndefined()
    }

    const appCount = await ApplicationModel.countDocuments({ slug: DOCS_DEMO_APP_SLUG })
    expect(appCount).toBe(1)

    const keyCount = await ApiKeyModel.countDocuments({
      appName: DOCS_DEMO_APP_SLUG,
      createdBy: DOCS_DEMO_SEED_MARKER,
    })
    expect(keyCount).toBe(2)
  })

  it('T5: self-heals an Application missing reservedSlug / quotas', async () => {
    // Create a stale Application that predates the seed (no quotas, not
    // marked reserved). Mongoose default for booleans is false.
    await ApplicationModel.create({
      slug: DOCS_DEMO_APP_SLUG,
      name: 'Documentation Demo (legacy)',
      ownerId: 'system',
      createdBy: 'legacy-marker',
      status: 'active',
    })

    await seedDocsDemoApp()

    const refreshed = await ApplicationModel.findOne({ slug: DOCS_DEMO_APP_SLUG }).lean()
    expect(refreshed!.reservedSlug).toBe(true)
    expect(refreshed!.isPlatformOwned).toBe(true)
    expect(refreshed!.isTestMode).toBe(true)
    expect(refreshed!.quotas).toEqual(DOCS_DEMO_QUOTAS)
  })

  it('T6: hashed keys are stored as 64-char hex (sha256)', async () => {
    await seedDocsDemoApp()

    const docs = await ApiKeyModel.find({
      appName: DOCS_DEMO_APP_SLUG,
      createdBy: DOCS_DEMO_SEED_MARKER,
    }).lean()

    for (const doc of docs) {
      expect(doc.key).toMatch(/^[a-f0-9]{64}$/)
    }
  })

  it('T7: keyPrefix follows `ez_(pk|sk)_test_<6 hex chars>` format', async () => {
    await seedDocsDemoApp()

    const docs = await ApiKeyModel.find({
      appName: DOCS_DEMO_APP_SLUG,
      createdBy: DOCS_DEMO_SEED_MARKER,
    }).lean()

    for (const doc of docs) {
      expect(doc.keyPrefix).toMatch(/^ez_(pk|sk)_test_[a-f0-9]{6}$/)
    }
  })

  it('T8: quotaMonthly is null on demo keys (per-Application quota model)', async () => {
    await seedDocsDemoApp()

    const docs = await ApiKeyModel.find({
      appName: DOCS_DEMO_APP_SLUG,
      createdBy: DOCS_DEMO_SEED_MARKER,
    }).lean()

    for (const doc of docs) {
      expect(doc.quotaMonthly).toBeNull()
    }
  })
})
