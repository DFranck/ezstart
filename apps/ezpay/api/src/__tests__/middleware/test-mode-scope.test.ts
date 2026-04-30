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
