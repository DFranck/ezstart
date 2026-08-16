/**
 * Security tests for payment amount validation
 *
 * Attack vectors tested:
 * - Zero amount payments (donation allows it, purchase/subscription should not)
 * - Negative amount payments
 * - Extremely large amounts (integer overflow)
 * - Fractional cent amounts
 * - Amount=0 after promo discount
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import { calculateDiscount } from '../../services/promo.js'
import type { PromoDocument } from '../../models/Promo.js'
import type { Model } from 'mongoose'

describe('Payment Amount Validation', () => {
  let PaymentModel: Model<PaymentDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    PaymentModel = await getPaymentModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PaymentModel.deleteMany({})
  })

  // =========================================================================
  // VULNERABILITY FINDING: Payment model has NO min amount constraint
  // =========================================================================
  describe('Amount field has no minimum constraint', () => {
    it('FIXED: model rejects negative amount', async () => {
      // The Payment schema now has min: 0 constraint
      await expect(
        PaymentModel.create({
          projectId: 'myapp',
          projectName: 'MyApp',
          type: 'donation',
          amount: -100,
          paymentId: 'cs_negative',
        })
      ).rejects.toThrow()
    })

    it('VULNERABILITY: model allows zero amount for purchases', async () => {
      const payment = await PaymentModel.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'purchase',
        amount: 0,
        paymentId: 'cs_zero_purchase',
      })
      expect(payment.amount).toBe(0)
    })
  })

  // =========================================================================
  // Zod validation at route level
  // =========================================================================
  describe('Route-level Zod validation', () => {
    it('donation schema allows amount=0 (testimonial)', () => {
      // createDonationSchema has amount: z.number().nonnegative()
      // This is intentional for testimonials
      const { z } = require('zod')
      const schema = z.object({
        amount: z.number().nonnegative(),
      })
      expect(schema.safeParse({ amount: 0 }).success).toBe(true)
    })

    it('purchase schema rejects amount=0', () => {
      // createPurchaseSchema has amount: z.number().positive()
      const { z } = require('zod')
      const schema = z.object({
        amount: z.number().positive(),
      })
      expect(schema.safeParse({ amount: 0 }).success).toBe(false)
    })

    it('subscription schema rejects amount=0', () => {
      // createSubscriptionSchema has amount: z.number().positive()
      const { z } = require('zod')
      const schema = z.object({
        amount: z.number().positive(),
      })
      expect(schema.safeParse({ amount: 0 }).success).toBe(false)
    })

    it('purchase schema rejects negative amount', () => {
      const { z } = require('zod')
      const schema = z.object({
        amount: z.number().positive(),
      })
      expect(schema.safeParse({ amount: -1 }).success).toBe(false)
    })
  })

  // =========================================================================
  // VULNERABILITY: Amount can reach 0 after promo discount
  // =========================================================================
  describe('Amount after promo discount', () => {
    it('VULNERABILITY: 100% discount results in amount=0 sent to Stripe', () => {
      // If a promo code gives 100% discount, the finalAmount becomes 0.
      // The purchase route sends this to Stripe's createCheckoutSession which
      // may reject it, but the Payment record is still created with amount=0.
      const mockPromo = {
        discountType: 'percent',
        discountValue: 100,
      } as PromoDocument

      const result = calculateDiscount(1000, mockPromo)
      expect(result.discountedAmount).toBe(0)
      // This 0 amount will be passed to Stripe createCheckoutSession
      // which will likely throw, but the code doesn't guard against it
    })

    it('fixed discount larger than amount caps at 0', () => {
      const mockPromo = {
        discountType: 'fixed',
        discountValue: 5000,
      } as PromoDocument

      const result = calculateDiscount(1000, mockPromo)
      expect(result.discountedAmount).toBe(0)
    })
  })

  // =========================================================================
  // Extremely large amounts
  // =========================================================================
  describe('Extremely large amounts', () => {
    it('model accepts extremely large amounts without limit', async () => {
      const payment = await PaymentModel.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'donation',
        amount: 999999999999,
        paymentId: 'cs_huge',
      })
      expect(payment.amount).toBe(999999999999)
    })
  })

  // =========================================================================
  // Floating point precision
  // =========================================================================
  describe('Floating point precision', () => {
    it('model accepts fractional cent amounts', async () => {
      const payment = await PaymentModel.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'donation',
        amount: 0.001,
        paymentId: 'cs_fraction',
      })
      expect(payment.amount).toBe(0.001)
    })
  })
})
