/**
 * Tests for seed-green-pulse-plans.
 *
 * Uses MongoMemoryServer via `@ezstart/test-utils`. Injects stub resolvers
 * for ezauth Application lookup and Stripe sync so the script runs fully
 * offline.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { seedGreenPulsePlans } from '../../scripts/seed-green-pulse-plans.js'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import type { EzauthApplicationLookup } from '../../services/ezauth-client.js'
import type { Model } from 'mongoose'

type PlanModelType = Model<PlanDocument>
type SyncToStripe = typeof import('../../services/stripe-plan-sync.js').syncPlanToStripe

const GREEN_PULSE_APP: EzauthApplicationLookup = {
  id: 'app-green-pulse',
  slug: 'green-pulse',
  name: 'GreenPulse',
}

function lookupOk(): (slug: string) => Promise<EzauthApplicationLookup | null> {
  return vi.fn(async (slug: string) => {
    if (slug === 'green-pulse') return GREEN_PULSE_APP
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

describe('seed-green-pulse-plans', () => {
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

  it('creates the Self-Awareness Free plan on first run', async () => {
    const sync = stripeOk()
    const result = await seedGreenPulsePlans({
      lookupApplication: lookupOk(),
      syncToStripe: sync,
    })

    expect(result).toEqual({ created: 1, alreadyExists: 0 })

    const plans = await PlanModel.find({ applicationId: GREEN_PULSE_APP.id })
      .sort({ sortOrder: 1 })
      .lean()
    expect(plans).toHaveLength(1)

    const [free] = plans
    expect(free?.name).toBe('Self-Awareness')
    expect(free?.amount).toBe(0)
    expect(free?.currency).toBe('EUR')
    expect(free?.interval).toBe('month')
    expect(free?.appName).toBe('green-pulse')
    expect(free?.metadata?.grantsRoles).toEqual(['free'])
    expect(free?.metadata?.grantsFeatures).toEqual(['chat', 'self-awareness'])
    expect(free?.metadata?.feePercent).toBe(0)
    expect(free?.metadata?.billingGroup).toBe('self-awareness')

    // Free plan must NOT be mirrored to Stripe (€0 recurring Prices unsupported).
    expect(sync).not.toHaveBeenCalled()
    expect(free?.stripeProductId).toBeUndefined()
    expect(free?.stripePriceId).toBeUndefined()
  })

  it('is idempotent — a second run creates zero plans', async () => {
    await seedGreenPulsePlans({
      lookupApplication: lookupOk(),
      syncToStripe: stripeOk(),
    })

    const secondSync = stripeOk()
    const second = await seedGreenPulsePlans({
      lookupApplication: lookupOk(),
      syncToStripe: secondSync,
    })

    expect(second).toEqual({ created: 0, alreadyExists: 1 })
    expect(secondSync).not.toHaveBeenCalled()

    const totalPlans = await PlanModel.countDocuments({ applicationId: GREEN_PULSE_APP.id })
    expect(totalPlans).toBe(1)
  })

  it('throws when the green-pulse Application is missing', async () => {
    const lookup = vi.fn(async () => null)

    await expect(
      seedGreenPulsePlans({
        lookupApplication: lookup,
        syncToStripe: stripeOk(),
      })
    ).rejects.toThrow(/seed:consumer-app-keys/)

    const total = await PlanModel.countDocuments({})
    expect(total).toBe(0)
  })
})
