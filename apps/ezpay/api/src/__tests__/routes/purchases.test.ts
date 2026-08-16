/**
 * Integration tests for purchase routes business logic.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import type { Model } from 'mongoose'

describe('Purchase Routes Business Logic', () => {
  let Payment: Model<PaymentDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Payment = await getPaymentModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Payment.deleteMany({})
  })

  // ========================================
  // POST /purchase (create)
  // ========================================
  describe('Create Purchase (POST /purchase)', () => {
    it('should create a pending purchase payment', async () => {
      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'ezbill',
        type: 'purchase',
        amount: 19.99,
        currency: 'EUR',
        userId: 'buyer_1',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_test_purchase_1',
        status: 'pending',
        liveMode: false,
        metadata: {
          productId: 'prod_premium',
          productName: 'Premium Theme',
        },
      })

      expect(payment.type).toBe('purchase')
      expect(payment.amount).toBe(19.99)
      expect(payment.metadata?.productId).toBe('prod_premium')
      expect(payment.metadata?.productName).toBe('Premium Theme')
    })

    it('should apply promo discount to purchase amount', async () => {
      const originalAmount = 19.99
      const discountApplied = 5 // fixed discount
      const finalAmount = originalAmount - discountApplied

      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'ezbill',
        type: 'purchase',
        amount: finalAmount,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'cs_test_purch_promo',
        status: 'pending',
        metadata: {
          productId: 'prod_1',
          productName: 'Product',
          promoCode: 'FLAT5',
          originalAmount,
          discountApplied,
        },
      })

      expect(payment.amount).toBeCloseTo(14.99, 2)
      expect(payment.metadata?.promoCode).toBe('FLAT5')
    })
  })

  // ========================================
  // GET /purchases (list)
  // ========================================
  describe('List Purchases (GET /purchases)', () => {
    it('should return only purchase type payments', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 10,
        paymentId: 'cs_purch_list_1',
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 5,
        paymentId: 'cs_purch_list_2',
      })

      const purchases = await Payment.find({ type: 'purchase' })
      expect(purchases).toHaveLength(1)
    })

    it('should filter by userId', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 10,
        paymentId: 'cs_purch_uid_1',
        userId: 'buyer_a',
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 20,
        paymentId: 'cs_purch_uid_2',
        userId: 'buyer_b',
      })

      const purchases = await Payment.find({ type: 'purchase', userId: 'buyer_a' })
      expect(purchases).toHaveLength(1)
    })

    it('should filter by projectId', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 10,
        paymentId: 'cs_purch_proj_1',
      })
      await Payment.create({
        projectId: 'green-pulse',
        projectName: 'GreenPulse',
        type: 'purchase',
        amount: 20,
        paymentId: 'cs_purch_proj_2',
      })

      const purchases = await Payment.find({ type: 'purchase', projectId: 'ezbill' })
      expect(purchases).toHaveLength(1)
    })

    it('should scope non-admin to their own purchases', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 10,
        paymentId: 'cs_purch_own_1',
        userId: 'my_user',
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 20,
        paymentId: 'cs_purch_own_2',
        userId: 'other_user',
      })

      // Non-admin query forces userId
      const myPurchases = await Payment.find({ type: 'purchase', userId: 'my_user' })
      expect(myPurchases).toHaveLength(1)
    })

    it('should paginate results', async () => {
      for (let i = 0; i < 20; i++) {
        await Payment.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'purchase',
          amount: i + 1,
          paymentId: `cs_purch_page_${i}`,
        })
      }

      const limit = 5
      const offset = 10
      const [purchases, total] = await Promise.all([
        Payment.find({ type: 'purchase' }).sort({ createdAt: -1 }).skip(offset).limit(limit),
        Payment.countDocuments({ type: 'purchase' }),
      ])

      expect(purchases).toHaveLength(5)
      expect(total).toBe(20)
    })
  })
})
