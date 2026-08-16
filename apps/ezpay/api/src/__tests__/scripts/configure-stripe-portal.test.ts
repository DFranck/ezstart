/**
 * Tests for the Stripe Customer Portal configuration script (P9-D).
 *
 * Exercises the pure helpers (`buildPortalConfigParams`,
 * `resolveAllowedProducts`) and the full `configureStripePortal` flow with
 * a fake Stripe SDK so the script stays fully offline.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Model } from 'mongoose'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import {
  buildPortalConfigParams,
  configureStripePortal,
  resolveAllowedProducts,
} from '../../scripts/configure-stripe-portal.js'

describe('configure-stripe-portal — helpers', () => {
  let Plan: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Plan = await getPlanModel()
    try {
      await Plan.collection.dropIndexes()
    } catch {
      // ignore
    }
    await Plan.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Plan.deleteMany({})
  })

  it('resolveAllowedProducts groups active plans by product', async () => {
    await Plan.create({
      name: 'Pro Monthly',
      applicationId: 'app-1',
      appName: 'ezauth',
      amount: 999,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_a',
      stripePriceId: 'price_a_month',
    })
    await Plan.create({
      name: 'Pro Yearly',
      applicationId: 'app-1',
      appName: 'ezauth',
      amount: 9990,
      currency: 'EUR',
      interval: 'year',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_a',
      stripePriceId: 'price_a_year',
    })
    await Plan.create({
      name: 'Business',
      applicationId: 'app-1',
      appName: 'ezauth',
      amount: 4900,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_b',
      stripePriceId: 'price_b_month',
    })

    const products = await resolveAllowedProducts()
    expect(products).toHaveLength(2)
    const byId = new Map(products.map(p => [p.product, p.prices.sort()]))
    expect(byId.get('prod_a')).toEqual(['price_a_month', 'price_a_year'])
    expect(byId.get('prod_b')).toEqual(['price_b_month'])
  })

  it('resolveAllowedProducts skips inactive or unlinked plans', async () => {
    await Plan.create({
      name: 'Inactive',
      applicationId: 'app-1',
      appName: 'ezauth',
      amount: 999,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: false,
      stripeProductId: 'prod_x',
      stripePriceId: 'price_x',
    })
    await Plan.create({
      name: 'No stripe',
      applicationId: 'app-1',
      appName: 'ezauth',
      amount: 999,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
    })

    const products = await resolveAllowedProducts()
    expect(products).toEqual([])
  })
})

describe('configure-stripe-portal — buildPortalConfigParams', () => {
  it('enables subscription_update with always_invoice when products exist', () => {
    const params = buildPortalConfigParams({
      products: [{ product: 'prod_a', prices: ['price_a1', 'price_a2'] }],
    })

    expect(params.metadata?.managedBy).toBe('ezpay-script')
    expect(params.features.payment_method_update).toEqual({ enabled: true })
    expect(params.features.invoice_history).toEqual({ enabled: true })
    expect(params.features.subscription_cancel.enabled).toBe(true)
    expect(params.features.subscription_cancel.mode).toBe('at_period_end')
    const subUpdate = params.features.subscription_update
    if (!subUpdate.enabled) throw new Error('expected subscription_update.enabled=true')
    expect(subUpdate.proration_behavior).toBe('always_invoice')
    expect(subUpdate.products).toEqual([{ product: 'prod_a', prices: ['price_a1', 'price_a2'] }])
  })

  it('disables subscription_update when no products are provided', () => {
    const params = buildPortalConfigParams({ products: [] })
    expect(params.features.subscription_update).toEqual({ enabled: false })
  })

  it('uses defaults for headline / terms / privacy when unset', () => {
    const params = buildPortalConfigParams({ products: [] })
    expect(params.business_profile.headline).toBe('Manage your subscription')
    expect(params.business_profile.terms_of_service_url).toBe('https://ezstart.dev/terms')
    expect(params.business_profile.privacy_policy_url).toBe('https://ezstart.dev/privacy')
  })

  it('forwards custom headline / terms / privacy when provided', () => {
    const params = buildPortalConfigParams({
      products: [],
      headline: 'Hello there',
      tosUrl: 'https://example.com/tos',
      privacyUrl: 'https://example.com/privacy',
    })
    expect(params.business_profile.headline).toBe('Hello there')
    expect(params.business_profile.terms_of_service_url).toBe('https://example.com/tos')
    expect(params.business_profile.privacy_policy_url).toBe('https://example.com/privacy')
  })
})

describe('configure-stripe-portal — configureStripePortal', () => {
  let Plan: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Plan = await getPlanModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Plan.deleteMany({})
  })

  /** Build a fake Stripe SDK with a billingPortal.configurations surface. */
  function createFakeStripe(
    existing: Array<{ id: string; metadata?: Record<string, string> }> = []
  ) {
    const listCalls = vi.fn()
    const createCalls = vi.fn(async (_params: unknown) => ({ id: 'bpc_new' }))
    const updateCalls = vi.fn(async (id: string) => ({ id }))

    function makeListIterable() {
      // Stripe returns an async iterator — mimic with a generator.
      async function* iter(): AsyncGenerator<{ id: string; metadata?: Record<string, string> }> {
        for (const c of existing) yield c
      }
      const generator = iter()
      listCalls({ limit: 100 })
      return generator
    }

    const fakeStripe = {
      billingPortal: {
        configurations: {
          list: vi.fn(() => makeListIterable()),
          create: createCalls,
          update: updateCalls,
        },
      },
    } as unknown as import('stripe').Stripe

    return { fakeStripe, createCalls, updateCalls, listCalls }
  }

  it('creates a new configuration when none exists with the managedBy marker', async () => {
    await Plan.create({
      name: 'Pro',
      applicationId: 'app-1',
      appName: 'ezauth',
      amount: 999,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      stripeProductId: 'prod_a',
      stripePriceId: 'price_a',
    })
    const { fakeStripe, createCalls, updateCalls } = createFakeStripe([])

    const result = await configureStripePortal(fakeStripe)

    expect(result.status).toBe('created')
    expect(result.configurationId).toBe('bpc_new')
    expect(result.allowedPriceCount).toBe(1)
    expect(createCalls).toHaveBeenCalledOnce()
    expect(updateCalls).not.toHaveBeenCalled()
  })

  it('updates the existing configuration tagged with managedBy=ezpay-script', async () => {
    const { fakeStripe, createCalls, updateCalls } = createFakeStripe([
      { id: 'bpc_existing', metadata: { managedBy: 'ezpay-script' } },
    ])

    const result = await configureStripePortal(fakeStripe)

    expect(result.status).toBe('updated')
    expect(result.configurationId).toBe('bpc_existing')
    expect(updateCalls).toHaveBeenCalledOnce()
    expect(createCalls).not.toHaveBeenCalled()
  })

  it('creates a fresh configuration when existing ones belong to other managers', async () => {
    const { fakeStripe, createCalls, updateCalls } = createFakeStripe([
      { id: 'bpc_other', metadata: { managedBy: 'someone-else' } },
    ])

    const result = await configureStripePortal(fakeStripe)

    expect(result.status).toBe('created')
    expect(createCalls).toHaveBeenCalledOnce()
    expect(updateCalls).not.toHaveBeenCalled()
  })
})
