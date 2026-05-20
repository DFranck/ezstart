/**
 * Tests for stripe-plan-sync service.
 *
 * Mocks `getStripeInstance` so no network call is made. Asserts:
 *  - `syncPlanToStripe` creates Product + Price with deterministic
 *    idempotency keys.
 *  - `repriceStripePlan` archives the previous Price and creates a new one.
 *  - `archivePlanInStripe` deactivates both Product and Price, and swallows
 *    errors silently when Stripe ids are missing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PlanDocument } from '../../models/Plan.js'

// --- Stub the Stripe instance BEFORE the subject-under-test is imported ---
const productsCreate = vi.fn()
const productsUpdate = vi.fn()
const pricesCreate = vi.fn()
const pricesUpdate = vi.fn()

const stubStripe = {
  products: { create: productsCreate, update: productsUpdate },
  prices: { create: pricesCreate, update: pricesUpdate },
}

vi.mock('../../services/stripe-connect.js', () => ({
  getStripeInstanceForMode: () => stubStripe,
}))

const { syncPlanToStripe, repriceStripePlan, archivePlanInStripe } =
  await import('../../services/stripe-plan-sync.js')

function fakePlan(overrides: Partial<PlanDocument> = {}): PlanDocument {
  const base = {
    _id: 'plan_abc',
    name: 'Pro',
    applicationId: 'app-1',
    description: 'Pro tier',
    amount: 4900,
    currency: 'EUR',
    interval: 'month' as const,
    intervalCount: 1,
    features: [],
    active: true,
    sortOrder: 1,
    stripeProductId: undefined as string | undefined,
    stripePriceId: undefined as string | undefined,
  }
  return { ...base, ...overrides } as unknown as PlanDocument
}

describe('stripe-plan-sync', () => {
  beforeEach(() => {
    productsCreate.mockReset()
    productsUpdate.mockReset()
    pricesCreate.mockReset()
    pricesUpdate.mockReset()
  })

  describe('syncPlanToStripe', () => {
    it('creates product + price with deterministic idempotency keys', async () => {
      productsCreate.mockResolvedValue({ id: 'prod_1' })
      pricesCreate.mockResolvedValue({ id: 'price_1' })

      const plan = fakePlan()
      const result = await syncPlanToStripe(plan)

      expect(result).toEqual({ stripeProductId: 'prod_1', stripePriceId: 'price_1' })

      expect(productsCreate).toHaveBeenCalledOnce()
      const [productBody, productOpts] = productsCreate.mock.calls[0] as [
        Record<string, unknown>,
        { idempotencyKey: string },
      ]
      expect(productBody.name).toBe('Pro')
      expect(productBody.description).toBe('Pro tier')
      expect(productBody.metadata).toEqual({ planId: 'plan_abc', applicationId: 'app-1' })
      expect(productOpts.idempotencyKey).toBe('plan-product-plan_abc')

      expect(pricesCreate).toHaveBeenCalledOnce()
      const [priceBody, priceOpts] = pricesCreate.mock.calls[0] as [
        Record<string, unknown>,
        { idempotencyKey: string },
      ]
      expect(priceBody.product).toBe('prod_1')
      expect(priceBody.unit_amount).toBe(4900)
      expect(priceBody.currency).toBe('eur')
      expect(priceBody.recurring).toEqual({ interval: 'month', interval_count: 1 })
      expect(priceBody.metadata).toEqual({ planId: 'plan_abc' })
      expect(priceOpts.idempotencyKey).toBe('plan-price-plan_abc-4900-eur-month-1')
    })

    it('normalises currency to lowercase and coerces unsupported interval to month', async () => {
      productsCreate.mockResolvedValue({ id: 'prod_2' })
      pricesCreate.mockResolvedValue({ id: 'price_2' })

      const plan = fakePlan({ currency: 'USD', interval: 'year', intervalCount: 2 })
      await syncPlanToStripe(plan)

      const [priceBody, priceOpts] = pricesCreate.mock.calls[0] as [
        Record<string, unknown>,
        { idempotencyKey: string },
      ]
      expect(priceBody.currency).toBe('usd')
      expect(priceBody.recurring).toEqual({ interval: 'year', interval_count: 2 })
      expect(priceOpts.idempotencyKey).toBe('plan-price-plan_abc-4900-usd-year-2')
    })
  })

  describe('repriceStripePlan', () => {
    it('archives the previous price and creates a new one tied to the same product', async () => {
      pricesUpdate.mockResolvedValue({ id: 'price_old' })
      pricesCreate.mockResolvedValue({ id: 'price_new' })

      const plan = fakePlan({
        stripeProductId: 'prod_1',
        stripePriceId: 'price_old',
        amount: 9900, // new price
      })

      const newId = await repriceStripePlan(plan, {
        amount: 4900,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
      })

      expect(newId).toBe('price_new')

      expect(pricesUpdate).toHaveBeenCalledWith('price_old', { active: false })
      expect(pricesCreate).toHaveBeenCalledOnce()
      const [priceBody, priceOpts] = pricesCreate.mock.calls[0] as [
        Record<string, unknown>,
        { idempotencyKey: string },
      ]
      expect(priceBody.product).toBe('prod_1')
      expect(priceBody.unit_amount).toBe(9900)
      expect(priceBody.metadata).toMatchObject({
        planId: 'plan_abc',
        previousAmount: '4900',
      })
      expect(priceOpts.idempotencyKey).toBe('plan-price-plan_abc-9900-eur-month-1')
    })

    it('throws when the plan has no stripeProductId', async () => {
      const plan = fakePlan({ stripeProductId: undefined, stripePriceId: undefined })
      await expect(
        repriceStripePlan(plan, {
          amount: 0,
          currency: 'EUR',
          interval: 'month',
          intervalCount: 1,
        })
      ).rejects.toThrow(/stripeProductId/)
    })

    it('still creates the new price when the previous-price archive fails', async () => {
      pricesUpdate.mockRejectedValue(new Error('stripe down'))
      pricesCreate.mockResolvedValue({ id: 'price_resilient' })

      const plan = fakePlan({
        stripeProductId: 'prod_1',
        stripePriceId: 'price_old',
        amount: 9900,
      })

      const newId = await repriceStripePlan(plan, {
        amount: 4900,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
      })

      expect(newId).toBe('price_resilient')
    })
  })

  describe('archivePlanInStripe', () => {
    it('deactivates both price and product when both ids are present', async () => {
      pricesUpdate.mockResolvedValue({ id: 'price_1' })
      productsUpdate.mockResolvedValue({ id: 'prod_1' })

      const plan = fakePlan({ stripeProductId: 'prod_1', stripePriceId: 'price_1' })
      await archivePlanInStripe(plan)

      expect(pricesUpdate).toHaveBeenCalledWith('price_1', { active: false })
      expect(productsUpdate).toHaveBeenCalledWith('prod_1', { active: false })
    })

    it('is a silent no-op when both stripe ids are missing', async () => {
      const plan = fakePlan({ stripeProductId: undefined, stripePriceId: undefined })
      await expect(archivePlanInStripe(plan)).resolves.toBeUndefined()

      expect(pricesUpdate).not.toHaveBeenCalled()
      expect(productsUpdate).not.toHaveBeenCalled()
    })

    it('swallows Stripe failures so the DB soft-delete is never blocked', async () => {
      pricesUpdate.mockRejectedValue(new Error('stripe down'))
      productsUpdate.mockRejectedValue(new Error('stripe down'))

      const plan = fakePlan({ stripeProductId: 'prod_1', stripePriceId: 'price_1' })
      await expect(archivePlanInStripe(plan)).resolves.toBeUndefined()
    })
  })
})
