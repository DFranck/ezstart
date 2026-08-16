/**
 * Tests for seed-ezauth-plans.
 *
 * Uses MongoMemoryServer via `@ezstart/test-utils`. Injects stub resolvers
 * for ezauth Application lookup and Stripe sync so the script runs fully
 * offline.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { seedEzauthPlans } from '../../scripts/seed-ezauth-plans.js'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import type { EzauthApplicationLookup } from '../../services/ezauth-client.js'
import type { Model } from 'mongoose'

type PlanModelType = Model<PlanDocument>
type SyncToStripe = typeof import('../../services/stripe-plan-sync.js').syncPlanToStripe

const EZAUTH_APP: EzauthApplicationLookup = {
  id: 'app-ezauth',
  slug: 'ezauth',
  name: 'EZAuth',
}

function lookupOk(): (slug: string) => Promise<EzauthApplicationLookup | null> {
  return vi.fn(async (slug: string) => {
    if (slug === 'ezauth') return EZAUTH_APP
    return null
  })
}

function stripeOk(): SyncToStripe {
  let i = 0
  return vi.fn(async () => {
    i += 1
    return { stripeProductId: `prod_${i}`, stripePriceId: `price_${i}` }
  }) as unknown as SyncToStripe
}

describe('seed-ezauth-plans', () => {
  let PlanModel: PlanModelType

  beforeAll(async () => {
    await setupTestDatabase()
    PlanModel = await getPlanModel()
    try {
      await PlanModel.collection.dropIndexes()
    } catch {
      // ignore — tests may run against a fresh collection
    }
    await PlanModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PlanModel.deleteMany({})
  })

  it('creates the 2 EZAuth plans on first run', async () => {
    const sync = stripeOk()
    const result = await seedEzauthPlans({
      lookupApplication: lookupOk(),
      syncToStripe: sync,
    })

    expect(result).toEqual({ created: 2, alreadyExists: 0 })

    const plans = await PlanModel.find({ applicationId: EZAUTH_APP.id })
      .sort({ sortOrder: 1 })
      .lean()
    expect(plans).toHaveLength(2)

    const [pro, proAnnual] = plans

    expect(pro?.name).toBe('Pro')
    expect(pro?.amount).toBe(1900)
    expect(pro?.currency).toBe('EUR')
    expect(pro?.interval).toBe('month')
    expect(pro?.trialDays).toBe(14)
    expect(pro?.metadata?.grantsRoles).toEqual(['pro'])
    expect(pro?.metadata?.feePercent).toBe(0)
    expect(pro?.metadata?.billingGroup).toBe('pro')
    expect(pro?.metadata?.discountVsMonthly).toBeUndefined()
    expect(pro?.stripeProductId).toMatch(/^prod_/)
    expect(pro?.stripePriceId).toMatch(/^price_/)
    expect(pro?.appName).toBe('ezauth')

    expect(proAnnual?.name).toBe('Pro Annual')
    expect(proAnnual?.amount).toBe(19000)
    expect(proAnnual?.interval).toBe('year')
    expect(proAnnual?.metadata?.grantsRoles).toEqual(['pro'])
    expect(proAnnual?.metadata?.billingGroup).toBe('pro')
    expect(proAnnual?.metadata?.discountVsMonthly).toBe(17)
  })

  it('is idempotent — a second run creates zero plans', async () => {
    await seedEzauthPlans({
      lookupApplication: lookupOk(),
      syncToStripe: stripeOk(),
    })

    const secondSync = stripeOk()
    const second = await seedEzauthPlans({
      lookupApplication: lookupOk(),
      syncToStripe: secondSync,
    })

    expect(second).toEqual({ created: 0, alreadyExists: 2 })
    expect(secondSync).not.toHaveBeenCalled()

    const totalPlans = await PlanModel.countDocuments({ applicationId: EZAUTH_APP.id })
    expect(totalPlans).toBe(2)
  })

  it('throws when the ezauth Application is missing', async () => {
    const lookup = vi.fn(async () => null)

    await expect(
      seedEzauthPlans({
        lookupApplication: lookup,
        syncToStripe: stripeOk(),
      })
    ).rejects.toThrow(/pnpm --filter api-ezauth seed:self-key/)

    const total = await PlanModel.countDocuments({})
    expect(total).toBe(0)
  })

  it('still creates the Plan row when Stripe sync fails (and logs)', async () => {
    const sync = vi.fn(async () => {
      throw new Error('stripe down')
    }) as unknown as SyncToStripe

    const result = await seedEzauthPlans({
      lookupApplication: lookupOk(),
      syncToStripe: sync,
    })

    expect(result.created).toBe(2)

    const plans = await PlanModel.find({ applicationId: EZAUTH_APP.id }).lean()
    expect(plans).toHaveLength(2)
    for (const plan of plans) {
      expect(plan.stripeProductId).toBeUndefined()
      expect(plan.stripePriceId).toBeUndefined()
    }
  })
})
