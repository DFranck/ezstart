/**
 * Tests for the `seed-webhook-secrets` backfill script.
 *
 * Validates idempotence (re-runs are safe), that pre-existing secrets are
 * preserved verbatim, and that newly seeded secrets match the Stripe-style
 * `whsec_<hex>` format.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { seedWebhookSecrets } from '../../scripts/seed-webhook-secrets.js'
import { getApplicationModel } from '../../models/application.js'

type ApplicationModelT = Awaited<ReturnType<typeof getApplicationModel>>

describe('seed-webhook-secrets script', () => {
  let Application: ApplicationModelT

  beforeAll(async () => {
    await setupTestDatabase()
    Application = await getApplicationModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Application.deleteMany({})
  })

  /**
   * Build an Application with a missing `webhookSecret`. The schema marks
   * the field as `required: true` with a default factory that fires on
   * `.create()`, so we have to bypass it via raw collection insert to
   * simulate a document created BEFORE the field was added.
   */
  async function insertLegacyApp(slug: string) {
    return Application.collection.insertOne({
      slug,
      name: slug,
      ownerId: 'system',
      status: 'active',
      themeEnabled: false,
      isPlatformOwned: false,
      requireEmailVerification: false,
      isTestMode: false,
      webhookEndpointUrl: null,
      // NO webhookSecret — this is the legacy state we are backfilling.
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  it('seeds whsec_<hex> on Applications missing the field', async () => {
    await insertLegacyApp('legacy-1')
    await insertLegacyApp('legacy-2')

    const results = await seedWebhookSecrets()

    expect(results).toHaveLength(2)
    expect(results.every(r => r.status === 'seeded')).toBe(true)

    const apps = await Application.find({}).select('+webhookSecret').lean()
    for (const app of apps) {
      expect(app.webhookSecret).toMatch(/^whsec_[0-9a-f]{64}$/)
    }
  })

  it('produces a unique secret per Application (no shared default)', async () => {
    await insertLegacyApp('uniq-1')
    await insertLegacyApp('uniq-2')
    await insertLegacyApp('uniq-3')

    await seedWebhookSecrets()

    const apps = await Application.find({}).select('+webhookSecret').lean()
    const secrets = apps.map(a => a.webhookSecret)
    expect(new Set(secrets).size).toBe(secrets.length)
  })

  it('is idempotent — second run leaves existing secrets untouched', async () => {
    await insertLegacyApp('idem-1')

    await seedWebhookSecrets()
    const after1 = await Application.findOne({ slug: 'idem-1' }).select('+webhookSecret').lean()

    const second = await seedWebhookSecrets()
    expect(second).toHaveLength(1)
    expect(second[0]?.status).toBe('already-set')

    const after2 = await Application.findOne({ slug: 'idem-1' }).select('+webhookSecret').lean()
    expect(after2?.webhookSecret).toBe(after1?.webhookSecret)
  })

  it('skips Applications that already have a webhookSecret', async () => {
    // Use the model factory — it auto-generates the secret.
    await Application.create({
      slug: 'fresh',
      name: 'Fresh',
      ownerId: 'system',
    })

    const results = await seedWebhookSecrets()

    expect(results).toHaveLength(1)
    expect(results[0]?.status).toBe('already-set')
  })

  it('handles a mix of legacy + fresh Applications correctly', async () => {
    await insertLegacyApp('legacy-mix-1')
    await insertLegacyApp('legacy-mix-2')
    await Application.create({ slug: 'fresh-mix-1', name: 'F1', ownerId: 'system' })

    const results = await seedWebhookSecrets()

    const seeded = results.filter(r => r.status === 'seeded').map(r => r.slug)
    const skipped = results.filter(r => r.status === 'already-set').map(r => r.slug)
    expect(seeded.sort()).toEqual(['legacy-mix-1', 'legacy-mix-2'])
    expect(skipped).toEqual(['fresh-mix-1'])
  })

  it('also backfills archived Applications (defensive — Stripe may resurface stale events)', async () => {
    // Insert a legacy + archived doc.
    await Application.collection.insertOne({
      slug: 'legacy-archived',
      name: 'Legacy Archived',
      ownerId: 'system',
      status: 'archived',
      themeEnabled: false,
      isPlatformOwned: false,
      requireEmailVerification: false,
      isTestMode: false,
      webhookEndpointUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const results = await seedWebhookSecrets()

    expect(results).toHaveLength(1)
    expect(results[0]?.status).toBe('seeded')

    const archived = await Application.findOne({ slug: 'legacy-archived' }, null, {
      includeArchived: true,
    })
      .select('+webhookSecret')
      .lean()
    expect(archived?.webhookSecret).toMatch(/^whsec_[0-9a-f]{64}$/)
  })
})
