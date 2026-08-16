/**
 * Tests for the EZPay seed-self-key script.
 *
 * Uses `MongoMemoryServer` via `@ezstart/test-utils` for the ezpay DB. The
 * ezauth Application lookup is mocked via a stubbed `fetch` so we never make
 * real network calls.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { seedSelfKey } from '../../scripts/seed-self-key.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { _resetCircuitForTests } from '../../services/ezauth-client.js'

type ApiKeyModelType = Awaited<ReturnType<typeof getApiKeyModel>>

const EZAUTH_API_URL = 'https://ezauth.test'
const EZPAY_APP_ID = 'app-ezpay-id'
const EZPAY_APP = {
  id: EZPAY_APP_ID,
  slug: 'ezpay',
  name: 'EZPay',
}

const originalFetch = globalThis.fetch

function okResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Stub fetch that mimics `GET /api/applications/lookup?slug=ezpay`.
 * Returns the EZPAY_APP envelope when slug=ezpay is requested, 404 otherwise.
 */
function stubLookupFetch(found: boolean = true): void {
  globalThis.fetch = vi.fn(async (input: string | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/applications/lookup') && url.includes('slug=ezpay')) {
      if (!found) return okResponse({ success: false, error: 'not found' }, 404)
      return okResponse({ success: true, data: EZPAY_APP })
    }
    return okResponse({ success: false, error: 'unexpected url' }, 500)
  }) as typeof fetch
}

describe('seed-self-key (ezpay) script', () => {
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
    _resetCircuitForTests()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('T1: creates ezpay self-key when ezauth Application exists', async () => {
    stubLookupFetch(true)

    const result = await seedSelfKey({ apiUrl: EZAUTH_API_URL })

    expect(result.status).toBe('created')
    expect(result.rawKey).toBeDefined()
    expect(result.rawKey).toMatch(/^ez_pk_live_[a-f0-9]{64}$/)
    expect(result.applicationId).toBe(EZPAY_APP_ID)
    expect(result.keyPrefix).toMatch(/^ez_pk_live_[a-f0-9]{6}$/)

    const docs = await ApiKeyModel.find({
      applicationId: EZPAY_APP_ID,
      createdBy: 'system-seed',
      status: 'active',
    }).lean()

    expect(docs).toHaveLength(1)
    const doc = docs[0]!
    expect(doc.applicationId).toBe(EZPAY_APP_ID)
    expect(doc.appSlug).toBe('ezpay')
    expect(doc.createdBy).toBe('system-seed')
    expect(doc.type).toBe('publishable')
    expect(doc.env).toBe('live')
    expect(doc.scope).toBe('admin')
    expect(doc.status).toBe('active')
    expect(doc.userId).toBe('system')
    expect(doc.permissions).toEqual(['*'])
    expect(doc.name).toBe('EZPay self-key (system seed)')
    expect(doc.quotaMonthly).toBeNull()
    // `key` is SHA-256 hex of the raw key (64 chars).
    expect(doc.key).toMatch(/^[a-f0-9]{64}$/)
  })

  it('T2: throws a clear error when ezauth Application is missing', async () => {
    stubLookupFetch(false)

    await expect(seedSelfKey({ apiUrl: EZAUTH_API_URL })).rejects.toThrow(
      /pnpm --filter api-ezauth seed:self-key/
    )

    const count = await ApiKeyModel.countDocuments({})
    expect(count).toBe(0)
  })

  it('T3: idempotent — second run returns already-exists with same prefix', async () => {
    stubLookupFetch(true)

    const first = await seedSelfKey({ apiUrl: EZAUTH_API_URL })
    expect(first.status).toBe('created')

    const second = await seedSelfKey({ apiUrl: EZAUTH_API_URL })
    expect(second.status).toBe('already-exists')
    expect(second.rawKey).toBeUndefined()
    expect(second.keyPrefix).toBe(first.keyPrefix)
    expect(second.applicationId).toBe(first.applicationId)

    const count = await ApiKeyModel.countDocuments({
      applicationId: EZPAY_APP_ID,
      createdBy: 'system-seed',
    })
    expect(count).toBe(1)
  })

  it('T4: three runs still yield exactly one key (idempotent)', async () => {
    stubLookupFetch(true)

    await seedSelfKey({ apiUrl: EZAUTH_API_URL })
    await seedSelfKey({ apiUrl: EZAUTH_API_URL })
    await seedSelfKey({ apiUrl: EZAUTH_API_URL })

    const count = await ApiKeyModel.countDocuments({
      applicationId: EZPAY_APP_ID,
      createdBy: 'system-seed',
    })
    expect(count).toBe(1)
  })

  it('T5: does NOT re-seed when the previous seeded key was revoked', async () => {
    stubLookupFetch(true)

    const first = await seedSelfKey({ apiUrl: EZAUTH_API_URL })
    expect(first.status).toBe('created')

    // Admin explicitly revokes the seeded key.
    await ApiKeyModel.updateOne(
      { applicationId: EZPAY_APP_ID, createdBy: 'system-seed' },
      { $set: { status: 'revoked', revokedAt: new Date() } }
    )

    // Second run must be a no-op: the revoked row is an explicit admin
    // decision, so the script MUST return `already-exists` and NOT mint a
    // new active key. Rotating requires deleting the row manually.
    const second = await seedSelfKey({ apiUrl: EZAUTH_API_URL })
    expect(second.status).toBe('already-exists')
    expect(second.rawKey).toBeUndefined()
    expect(second.keyPrefix).toBe(first.keyPrefix)

    // Exactly one row for this app (the revoked one), no new active key.
    const allForApp = await ApiKeyModel.countDocuments({
      applicationId: EZPAY_APP_ID,
      createdBy: 'system-seed',
    })
    expect(allForApp).toBe(1)

    const activeForApp = await ApiKeyModel.countDocuments({
      applicationId: EZPAY_APP_ID,
      createdBy: 'system-seed',
      status: 'active',
    })
    expect(activeForApp).toBe(0)
  })
})
