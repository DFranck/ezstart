/**
 * Tests for migrate-plans-to-applications (P7 Phase A).
 *
 * Uses MongoMemoryServer via `@ezstart/test-utils` and injects a stub
 * lookupApplication resolver so no real ezauth network call is made.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { migratePlansToApplications } from '../../scripts/migrate-plans-to-applications.js'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import type { EzauthApplicationLookup } from '../../services/ezauth-client.js'
import type { Model } from 'mongoose'

type PlanModelType = Model<PlanDocument>

async function insertLegacyPlan(
  PlanModel: PlanModelType,
  payload: Record<string, unknown>
): Promise<void> {
  // Insert directly through the collection so we can omit `applicationId`
  // (which the Mongoose schema now flags as required).
  await PlanModel.collection.insertOne({
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

describe('migrate-plans-to-applications', () => {
  let PlanModel: PlanModelType

  beforeAll(async () => {
    await setupTestDatabase()
    PlanModel = await getPlanModel()
    try {
      await PlanModel.collection.dropIndexes()
    } catch {
      // ignore
    }
    await PlanModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PlanModel.deleteMany({})
  })

  it('links a legacy plan to its Application via slug lookup', async () => {
    await insertLegacyPlan(PlanModel, {
      name: 'Pro',
      appName: 'ezbill',
      amount: 999,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      sortOrder: 0,
      deletedAt: null,
    })

    const lookup = vi.fn<(slug: string) => Promise<EzauthApplicationLookup | null>>(
      async (slug: string) => ({ id: `app-${slug}`, slug, name: slug })
    )

    const result = await migratePlansToApplications({ lookupApplication: lookup })

    expect(result.linked).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.skippedInvalid).toBe(0)

    const linked = await PlanModel.findOne({ appName: 'ezbill' }).lean()
    expect(linked?.applicationId).toBe('app-ezbill')
  })

  it('is idempotent — second run links zero additional plans', async () => {
    await insertLegacyPlan(PlanModel, {
      name: 'Pro',
      appName: 'ezbill',
      amount: 999,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      sortOrder: 0,
      deletedAt: null,
    })

    const lookup = vi.fn<(slug: string) => Promise<EzauthApplicationLookup | null>>(
      async (slug: string) => ({ id: `app-${slug}`, slug, name: slug })
    )

    const first = await migratePlansToApplications({ lookupApplication: lookup })
    expect(first.linked).toBe(1)

    const second = await migratePlansToApplications({ lookupApplication: lookup })
    expect(second.linked).toBe(0)
    expect(second.skipped).toBe(0)
    expect(second.skippedInvalid).toBe(0)
  })

  it('skips a plan with no appName', async () => {
    await insertLegacyPlan(PlanModel, {
      name: 'Orphan',
      amount: 0,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      sortOrder: 0,
      deletedAt: null,
    })

    const lookup = vi.fn<(slug: string) => Promise<EzauthApplicationLookup | null>>()

    const result = await migratePlansToApplications({ lookupApplication: lookup })
    expect(result.skipped).toBe(1)
    expect(result.linked).toBe(0)
    expect(lookup).not.toHaveBeenCalled()
  })

  it('skips a plan whose appName is not a valid Application slug', async () => {
    await insertLegacyPlan(PlanModel, {
      name: 'Bad slug',
      appName: 'NOT A SLUG!',
      amount: 0,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      sortOrder: 0,
      deletedAt: null,
    })

    const lookup = vi.fn<(slug: string) => Promise<EzauthApplicationLookup | null>>()

    const result = await migratePlansToApplications({ lookupApplication: lookup })
    expect(result.skippedInvalid).toBe(1)
    expect(result.linked).toBe(0)
    expect(lookup).not.toHaveBeenCalled()
  })

  it('skips a plan whose slug is unknown to ezauth', async () => {
    await insertLegacyPlan(PlanModel, {
      name: 'Ghost',
      appName: 'unknown-app',
      amount: 0,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      sortOrder: 0,
      deletedAt: null,
    })

    const lookup = vi.fn<(slug: string) => Promise<EzauthApplicationLookup | null>>(
      async () => null
    )

    const result = await migratePlansToApplications({ lookupApplication: lookup })
    expect(result.skipped).toBe(1)
    expect(result.linked).toBe(0)
    expect(lookup).toHaveBeenCalled()
    expect(lookup.mock.calls[0]?.[0]).toBe('unknown-app')

    const unchanged = await PlanModel.findOne({ name: 'Ghost' }).lean()
    expect(unchanged?.applicationId == null || unchanged?.applicationId === '').toBe(true)
  })
})
