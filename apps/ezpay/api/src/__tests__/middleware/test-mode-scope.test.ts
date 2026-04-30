/**
 * Integration tests for `testModeScopePlugin` (ezpay) — verifies that the
 * Mongoose pre-find hook auto-scopes queries by `req.derivedMode` propagated
 * through `AsyncLocalStorage`.
 *
 * Mirrors the ezauth twin file. Uses `Plan` (a fresh model with no legacy
 * mode field) and `Promo` for cross-collection coverage.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { withRequestContext } from '@ezstart/api-core'
import { getPlanModel } from '../../models/Plan.js'
import { getPromoModel } from '../../models/Promo.js'

async function seedPlans() {
  const Plan = await getPlanModel()
  await Plan.create([
    {
      name: 'Pro Live',
      applicationId: 'app-1',
      amount: 1000,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      isTestMode: false,
    },
    {
      name: 'Enterprise Live',
      applicationId: 'app-1',
      amount: 5000,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      isTestMode: false,
    },
    {
      name: 'Pro Test',
      applicationId: 'app-1',
      amount: 100,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      isTestMode: true,
    },
  ])
}

describe('testModeScopePlugin (ezpay) — Plan auto-scoping', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const Plan = await getPlanModel()
    await Plan.deleteMany({})
    await seedPlans()
  })

  it('returns ALL plans when called outside a request context', async () => {
    const Plan = await getPlanModel()
    const all = await Plan.find({}).lean()
    expect(all).toHaveLength(3)
  })

  it('returns only live plans when derivedMode = live', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const plans = await Plan.find({}).lean()
      expect(plans).toHaveLength(2)
      for (const plan of plans) expect(plan.isTestMode).toBe(false)
    })
  })

  it('returns only test plans when derivedMode = test', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const plans = await Plan.find({}).lean()
      expect(plans).toHaveLength(1)
      expect(plans[0]?.name).toBe('Pro Test')
    })
  })

  it('countDocuments respects mode filter', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      expect(await Plan.countDocuments({})).toBe(2)
    })
    await withRequestContext({ derivedMode: 'test' }, async () => {
      expect(await Plan.countDocuments({})).toBe(1)
    })
  })

  it('skipTestModeScope: true bypasses the filter', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const plans = await Plan.find({}, undefined, { skipTestModeScope: true }).lean()
      expect(plans).toHaveLength(3)
    })
  })

  it('isolates concurrent live + test contexts', async () => {
    const Plan = await getPlanModel()
    const [liveCount, testCount] = await Promise.all([
      withRequestContext({ derivedMode: 'live' }, async () => {
        return await Plan.countDocuments({})
      }),
      withRequestContext({ derivedMode: 'test' }, async () => {
        return await Plan.countDocuments({})
      }),
    ])
    expect(liveCount).toBe(2)
    expect(testCount).toBe(1)
  })
})

describe('testModeScopePlugin (ezpay) — backward compat with pre-V2 docs (no isTestMode field)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    // Seed a mix of:
    //  - 1 live doc (isTestMode: false — explicit, post-V2)
    //  - 1 test doc (isTestMode: true)
    //  - 1 legacy doc (isTestMode missing entirely — pre-V2, before backfill)
    //
    // The legacy doc is inserted via the raw driver to bypass the Mongoose
    // schema default (which would silently fill `isTestMode: false`).
    const Plan = await getPlanModel()
    await Plan.deleteMany({})

    await Plan.create([
      {
        name: 'Post V2 Live',
        applicationId: 'app-1',
        amount: 1000,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        isTestMode: false,
      },
      {
        name: 'Post V2 Test',
        applicationId: 'app-1',
        amount: 100,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        isTestMode: true,
      },
    ])

    // Raw driver insert — Mongoose schema defaults are NOT applied, so the
    // resulting doc literally has no `isTestMode` field. Mirrors the state
    // of any prod doc that predates the V2 migration.
    const collection = Plan.collection
    await collection.insertOne({
      name: 'Pre V2 Legacy',
      applicationId: 'app-1',
      amount: 500,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Intentionally NO `isTestMode` field — that's the whole point.
    })
  })

  it('live mode includes docs with isTestMode=undefined (backward compat for pre-V2 data)', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const plans = await Plan.find({}).lean()
      const names = plans.map(p => p.name).sort()
      // Both `Post V2 Live` (isTestMode=false) AND `Pre V2 Legacy` (no field)
      // must surface — the legacy doc would otherwise vanish in dev/prod
      // until the migration runs.
      expect(names).toEqual(['Post V2 Live', 'Pre V2 Legacy'])
    })
  })

  it('live mode still includes docs with isTestMode=false (existing behavior unchanged)', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const liveDoc = await Plan.findOne({ name: 'Post V2 Live' }).lean()
      expect(liveDoc).not.toBeNull()
      expect(liveDoc?.isTestMode).toBe(false)
    })
  })

  it('live mode excludes docs with isTestMode=true (existing behavior unchanged)', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const testDoc = await Plan.findOne({ name: 'Post V2 Test' }).lean()
      // Test doc invisible from live ctx — strict.
      expect(testDoc).toBeNull()
    })
  })

  it('test mode includes docs with isTestMode=true ONLY (excludes undefined and false — strict opt-in)', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const plans = await Plan.find({}).lean()
      // Only the explicit `isTestMode: true` doc — legacy (undefined) does
      // NOT coalesce as test (test data is opt-in, never accidental).
      expect(plans).toHaveLength(1)
      expect(plans[0]?.name).toBe('Post V2 Test')
      expect(plans[0]?.isTestMode).toBe(true)
    })
  })

  it('test mode countDocuments excludes undefined-isTestMode legacy docs', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'test' }, async () => {
      // 1 = `Post V2 Test` only. Legacy MUST NOT count.
      expect(await Plan.countDocuments({})).toBe(1)
    })
  })

  it('live mode countDocuments includes legacy docs (backward compat)', async () => {
    const Plan = await getPlanModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      // 2 = `Post V2 Live` (false) + `Pre V2 Legacy` (undefined).
      expect(await Plan.countDocuments({})).toBe(2)
    })
  })
})

describe('testModeScopePlugin (ezpay) — Promo auto-scoping', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const Promo = await getPromoModel()
    await Promo.deleteMany({})
    await Promo.create([
      {
        code: 'LIVE10',
        appName: 'ezauth',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        isTestMode: false,
      },
      {
        code: 'TEST10',
        appName: 'ezauth',
        discountType: 'percent',
        discountValue: 10,
        duration: 'once',
        isTestMode: true,
      },
    ])
  })

  it('finds only the matching-mode promo by code', async () => {
    const Promo = await getPromoModel()
    await withRequestContext({ derivedMode: 'live' }, async () => {
      const live = await Promo.findOne({ code: 'LIVE10' }).lean()
      expect(live?.isTestMode).toBe(false)
      const test = await Promo.findOne({ code: 'TEST10' }).lean()
      // Test code invisible from live mode → null.
      expect(test).toBeNull()
    })
    await withRequestContext({ derivedMode: 'test' }, async () => {
      const test = await Promo.findOne({ code: 'TEST10' }).lean()
      expect(test?.isTestMode).toBe(true)
    })
  })
})
