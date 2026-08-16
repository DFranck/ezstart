/**
 * Tests for seed-ezpay-plans (P7 Phase A).
 *
 * Uses MongoMemoryServer via `@ezstart/test-utils`. Injects stub resolvers
 * for ezauth Application lookup and Stripe sync so the script runs fully
 * offline.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { seedEzpayPlans } from '../../scripts/seed-ezpay-plans.js'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import type { EzauthApplicationLookup } from '../../services/ezauth-client.js'
import type { Model } from 'mongoose'

type PlanModelType = Model<PlanDocument>

const EZPAY_APP: EzauthApplicationLookup = {
  id: 'app-ezpay',
  slug: 'ezpay',
  name: 'EZPay',
}

function lookupOk(): (slug: string) => Promise<EzauthApplicationLookup | null> {
  return vi.fn(async (slug: string) => {
    if (slug === 'ezpay') return EZPAY_APP
    return null
  })
}

function stripeOk(): (plan: PlanDocument) => Promise<{
  stripeProductId: string
  stripePriceId: string
}> {
  let i = 0
  return vi.fn(async () => {
    i += 1
    return { stripeProductId: `prod_${i}`, stripePriceId: `price_${i}` }
  })
}

describe('seed-ezpay-plans', () => {
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

  it('creates the 3 EZPay plans on first run', async () => {
    const sync = stripeOk()
    const result = await seedEzpayPlans({
      lookupApplication: lookupOk(),
      syncToStripe:
        sync as unknown as typeof import('../../services/stripe-plan-sync.js').syncPlanToStripe,
    })

    expect(result).toEqual({ created: 3, alreadyExists: 0 })

    const plans = await PlanModel.find({ applicationId: EZPAY_APP.id })
      .sort({ sortOrder: 1 })
      .lean()
    expect(plans).toHaveLength(3)

    const [starter, growth, enterprise] = plans
    expect(starter?.name).toBe('Starter')
    expect(starter?.amount).toBe(0)
    expect(starter?.metadata?.feePercent).toBe(5)
    expect(starter?.stripeProductId).toMatch(/^prod_/)
    expect(starter?.stripePriceId).toMatch(/^price_/)
    expect(starter?.appName).toBe('ezpay')

    expect(growth?.name).toBe('Growth')
    expect(growth?.amount).toBe(4900)
    expect(growth?.metadata?.feePercent).toBe(3)

    expect(enterprise?.name).toBe('Enterprise')
    expect(enterprise?.amount).toBe(19900)
    expect(enterprise?.metadata?.feePercent).toBe(1.5)
  })

  it('is idempotent — a second run creates zero plans', async () => {
    const firstSync = stripeOk()
    await seedEzpayPlans({
      lookupApplication: lookupOk(),
      syncToStripe:
        firstSync as unknown as typeof import('../../services/stripe-plan-sync.js').syncPlanToStripe,
    })

    const secondSync = stripeOk()
    const second = await seedEzpayPlans({
      lookupApplication: lookupOk(),
      syncToStripe:
        secondSync as unknown as typeof import('../../services/stripe-plan-sync.js').syncPlanToStripe,
    })

    expect(second).toEqual({ created: 0, alreadyExists: 3 })
    expect(secondSync).not.toHaveBeenCalled()

    const totalPlans = await PlanModel.countDocuments({ applicationId: EZPAY_APP.id })
    expect(totalPlans).toBe(3)
  })

  it('throws when the ezauth ezpay Application is missing', async () => {
    const lookup = vi.fn(async () => null)

    await expect(
      seedEzpayPlans({
        lookupApplication: lookup,
        syncToStripe:
          stripeOk() as unknown as typeof import('../../services/stripe-plan-sync.js').syncPlanToStripe,
      })
    ).rejects.toThrow(/pnpm --filter api-ezauth seed:self-key/)

    const total = await PlanModel.countDocuments({})
    expect(total).toBe(0)
  })

  it('still creates the Plan row when Stripe sync fails (and logs)', async () => {
    const sync = vi.fn(async () => {
      throw new Error('stripe down')
    })

    const result = await seedEzpayPlans({
      lookupApplication: lookupOk(),
      syncToStripe:
        sync as unknown as typeof import('../../services/stripe-plan-sync.js').syncPlanToStripe,
    })

    expect(result.created).toBe(3)

    const plans = await PlanModel.find({ applicationId: EZPAY_APP.id }).lean()
    expect(plans).toHaveLength(3)
    for (const plan of plans) {
      expect(plan.stripeProductId).toBeUndefined()
      expect(plan.stripePriceId).toBeUndefined()
    }
  })
})
