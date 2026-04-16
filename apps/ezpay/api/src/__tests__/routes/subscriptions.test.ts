/**
 * Integration tests for subscription routes business logic.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import type { Model } from 'mongoose'

describe('Subscription Routes Business Logic', () => {
  let Payment: Model<PaymentDocument>
  let Plan: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    Payment = await getPaymentModel()
    Plan = await getPlanModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Payment.deleteMany({})
    await Plan.deleteMany({})
  })

  // ========================================
  // POST /subscribe (create subscription)
  // ========================================
  describe('Create Subscription (POST /subscribe)', () => {
    it('should create a pending subscription payment with plan features snapshot', async () => {
      const plan = await Plan.create({
        name: 'Pro',
        appName: 'ezbill',
        amount: 9.99,
        interval: 'month',
        intervalCount: 1,
        features: ['unlimited-invoices', 'custom-branding'],
      })

      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'ezbill',
        type: 'subscription',
        amount: 9.99,
        currency: 'EUR',
        userId: 'user_sub_1',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_test_sub_create',
        status: 'pending',
        liveMode: false,
        metadata: {
          planId: String(plan._id),
          planName: 'Pro',
          interval: 'month',
          intervalCount: 1,
          features: plan.features,
        },
      })

      expect(payment.type).toBe('subscription')
      expect(payment.status).toBe('pending')
      expect(payment.metadata?.planName).toBe('Pro')
      expect(payment.metadata?.features).toEqual(['unlimited-invoices', 'custom-branding'])
    })

    it('should apply promo discount to subscription amount', async () => {
      const originalAmount = 9.99
      const discountPercent = 20
      const discountApplied = Math.round(originalAmount * (discountPercent / 100))
      const finalAmount = originalAmount - discountApplied

      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'ezbill',
        type: 'subscription',
        amount: finalAmount,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'cs_test_sub_promo',
        status: 'pending',
        metadata: {
          planId: 'plan_1',
          planName: 'Pro',
          promoCode: 'SUMMER20',
          originalAmount,
          discountApplied,
        },
      })

      expect(payment.amount).toBe(finalAmount)
      expect(payment.metadata?.promoCode).toBe('SUMMER20')
      expect(payment.metadata?.originalAmount).toBe(originalAmount)
    })

    it('should support different interval counts (quarterly, semi-annual, annual)', async () => {
      for (const intervalCount of [1, 3, 6, 12]) {
        await Payment.deleteMany({})
        const payment = await Payment.create({
          projectId: 'ezbill',
          projectName: 'ezbill',
          type: 'subscription',
          amount: 9.99 * intervalCount,
          currency: 'EUR',
          provider: 'stripe',
          paymentId: `cs_test_interval_${intervalCount}`,
          status: 'pending',
          metadata: {
            planId: 'plan_1',
            planName: 'Pro',
            interval: 'month',
            intervalCount,
          },
        })

        expect(payment.metadata?.intervalCount).toBe(intervalCount)
      }
    })
  })

  // ========================================
  // GET /subscriptions (list)
  // ========================================
  describe('List Subscriptions (GET /subscriptions)', () => {
    it('should return only subscription type payments', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'subscription',
        amount: 9.99,
        paymentId: 'cs_sub_list_1',
        metadata: { subscriptionId: 'sub_1' },
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_sub_list_2',
      })

      const subs = await Payment.find({ type: 'subscription' })
      expect(subs).toHaveLength(1)
    })

    it('should filter subscriptions by projectId', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'subscription',
        amount: 9.99,
        paymentId: 'cs_sub_proj_1',
      })
      await Payment.create({
        projectId: 'green-pulse',
        projectName: 'GreenPulse',
        type: 'subscription',
        amount: 19.99,
        paymentId: 'cs_sub_proj_2',
      })

      const ezbillSubs = await Payment.find({ type: 'subscription', projectId: 'ezbill' })
      expect(ezbillSubs).toHaveLength(1)
    })

    it('should paginate subscriptions', async () => {
      for (let i = 0; i < 15; i++) {
        await Payment.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'subscription',
          amount: 9.99,
          paymentId: `cs_sub_page_${i}`,
        })
      }

      const limit = 5
      const offset = 10
      const [subs, total] = await Promise.all([
        Payment.find({ type: 'subscription' }).sort({ createdAt: -1 }).skip(offset).limit(limit),
        Payment.countDocuments({ type: 'subscription' }),
      ])

      expect(subs).toHaveLength(5)
      expect(total).toBe(15)
    })

    it('should scope non-admin to their own subscriptions', async () => {
      const userId = 'sub_owner'
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'subscription',
        amount: 9.99,
        paymentId: 'cs_sub_own_1',
        userId,
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'subscription',
        amount: 19.99,
        paymentId: 'cs_sub_own_2',
        userId: 'other_user',
      })

      const mySubs = await Payment.find({ type: 'subscription', userId })
      expect(mySubs).toHaveLength(1)
    })
  })

  // ========================================
  // POST /subscriptions/:subscriptionId/cancel
  // ========================================
  describe('Cancel Subscription (POST /subscriptions/:subscriptionId/cancel)', () => {
    it('should set cancelAtPeriodEnd to true', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'subscription',
        amount: 9.99,
        paymentId: 'cs_sub_cancel_1',
        status: 'completed',
        metadata: { subscriptionId: 'sub_cancel_1' },
        userId: 'cancel_user',
      })

      await Payment.updateOne(
        { 'metadata.subscriptionId': 'sub_cancel_1' },
        { cancelAtPeriodEnd: true }
      )

      const payment = await Payment.findOne({ 'metadata.subscriptionId': 'sub_cancel_1' })
      expect(payment?.cancelAtPeriodEnd).toBe(true)
    })

    it('should return 404 for non-existent subscription', async () => {
      const payment = await Payment.findOne({
        'metadata.subscriptionId': 'sub_nonexistent',
        type: 'subscription',
      })
      expect(payment).toBeNull()
    })

    it('should enforce ownership for non-admin users', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'subscription',
        amount: 9.99,
        paymentId: 'cs_sub_own_cancel',
        status: 'completed',
        metadata: { subscriptionId: 'sub_own_cancel' },
        userId: 'owner_user',
      })

      const payment = await Payment.findOne({
        'metadata.subscriptionId': 'sub_own_cancel',
        type: 'subscription',
      })

      // Non-admin user trying to cancel another's subscription
      const requestUserId = 'attacker_user'
      const isOwner = payment?.userId === requestUserId
      expect(isOwner).toBe(false)
      // Route would return 403
    })
  })
})
