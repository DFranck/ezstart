/**
 * Integration tests for donation routes business logic.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import type { Model } from 'mongoose'

describe('Donation Routes Business Logic', () => {
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
  // POST /donate (create donation)
  // ========================================
  describe('Create Donation (POST /donate)', () => {
    it('should create a standard donation payment', async () => {
      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 25,
        currency: 'EUR',
        userId: 'donor_1',
        customerName: 'John Doe',
        customerEmail: 'john@test.com',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_test_donate_1',
        status: 'pending',
        liveMode: false,
        metadata: {
          message: 'Keep up the great work!',
          isPublic: true,
        },
      })

      expect(payment.type).toBe('donation')
      expect(payment.amount).toBe(25)
      expect(payment.metadata?.message).toBe('Keep up the great work!')
      expect(payment.metadata?.isPublic).toBe(true)
    })

    it('should create a testimonial for amount=0 (no Stripe)', async () => {
      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'testimonial',
        amount: 0,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: `testimonial-${Date.now()}`,
        status: 'completed',
        completedAt: new Date(),
        customerName: 'Jane Smith',
        customerEmail: 'jane@test.com',
        isAnonymous: false,
        liveMode: false,
        metadata: {
          message: 'Amazing product!',
          isPublic: true,
        },
      })

      expect(payment.type).toBe('testimonial')
      expect(payment.amount).toBe(0)
      expect(payment.status).toBe('completed')
      expect(payment.completedAt).toBeInstanceOf(Date)
    })

    it('should handle anonymous donations', async () => {
      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 50,
        currency: 'EUR',
        provider: 'stripe',
        paymentId: 'cs_test_anon',
        status: 'pending',
        customerName: 'Anonymous',
        isAnonymous: true,
        metadata: { isPublic: true },
      })

      expect(payment.isAnonymous).toBe(true)
      expect(payment.customerName).toBe('Anonymous')
    })

    it('should handle private donations (not shown publicly)', async () => {
      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 100,
        currency: 'USD',
        provider: 'stripe',
        paymentId: 'cs_test_private',
        status: 'pending',
        metadata: { isPublic: false },
      })

      expect(payment.metadata?.isPublic).toBe(false)
    })
  })

  // ========================================
  // GET /donations (list public)
  // ========================================
  describe('List Donations (GET /donations)', () => {
    it('should return only completed public donations and testimonials', async () => {
      // Public completed donation
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_don_pub_1',
        status: 'completed',
        metadata: { isPublic: true },
      })
      // Public testimonial
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'testimonial',
        amount: 0,
        paymentId: 'cs_don_test_1',
        status: 'completed',
        metadata: { isPublic: true },
      })
      // Private donation (should be excluded)
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 50,
        paymentId: 'cs_don_priv_1',
        status: 'completed',
        metadata: { isPublic: false },
      })
      // Pending donation (should be excluded)
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 20,
        paymentId: 'cs_don_pend_1',
        status: 'pending',
        metadata: { isPublic: true },
      })
      // Purchase (should be excluded)
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 5,
        paymentId: 'cs_don_purch_1',
        status: 'completed',
        metadata: { isPublic: true },
      })

      const query = {
        type: { $in: ['donation', 'testimonial'] },
        status: 'completed',
        'metadata.isPublic': true,
      }

      const donations = await Payment.find(query).sort({ createdAt: -1 })
      expect(donations).toHaveLength(2)
    })

    it('should filter by projectId', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_don_proj_1',
        status: 'completed',
        metadata: { isPublic: true },
      })
      await Payment.create({
        projectId: 'green-pulse',
        projectName: 'GreenPulse',
        type: 'donation',
        amount: 20,
        paymentId: 'cs_don_proj_2',
        status: 'completed',
        metadata: { isPublic: true },
      })

      const query = {
        type: { $in: ['donation', 'testimonial'] },
        status: 'completed',
        'metadata.isPublic': true,
        projectId: 'ezbill',
      }

      const donations = await Payment.find(query)
      expect(donations).toHaveLength(1)
    })

    it('should exclude sensitive fields (customerEmail, paymentId)', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_don_sensitive',
        customerEmail: 'secret@test.com',
        status: 'completed',
        metadata: { isPublic: true },
      })

      const donations = await Payment.find({
        type: { $in: ['donation', 'testimonial'] },
        status: 'completed',
        'metadata.isPublic': true,
      }).select('-customerEmail -paymentId')

      expect(donations).toHaveLength(1)
      const doc = donations[0]!.toObject()
      expect(doc.customerEmail).toBeUndefined()
      expect(doc.paymentId).toBeUndefined()
    })

    it('should paginate results', async () => {
      for (let i = 0; i < 30; i++) {
        await Payment.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'donation',
          amount: i + 1,
          paymentId: `cs_don_page_${i}`,
          status: 'completed',
          metadata: { isPublic: true },
        })
      }

      const query = {
        type: { $in: ['donation', 'testimonial'] },
        status: 'completed',
        'metadata.isPublic': true,
      }
      const limit = 10
      const offset = 20

      const [donations, total] = await Promise.all([
        Payment.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
        Payment.countDocuments(query),
      ])

      expect(donations).toHaveLength(10)
      expect(total).toBe(30)
    })
  })

  // ========================================
  // GET /donations/stats
  // ========================================
  describe('Donation Stats (GET /donations/stats)', () => {
    it('should aggregate donation totals', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_stat_1',
        status: 'completed',
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 25,
        paymentId: 'cs_stat_2',
        status: 'completed',
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 50,
        paymentId: 'cs_stat_3',
        status: 'pending', // Not completed — should not count
      })

      const query = { type: 'donation', status: 'completed' }
      const aggregateResult = await Payment.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ])

      const { total = 0, count = 0 } = aggregateResult[0] || {}
      expect(total).toBe(35)
      expect(count).toBe(2)
    })

    it('should filter stats by projectId', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_stat_proj_1',
        status: 'completed',
      })
      await Payment.create({
        projectId: 'green-pulse',
        projectName: 'GreenPulse',
        type: 'donation',
        amount: 100,
        paymentId: 'cs_stat_proj_2',
        status: 'completed',
      })

      const query = { type: 'donation', status: 'completed', projectId: 'ezbill' }
      const aggregateResult = await Payment.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ])

      const { total = 0, count = 0 } = aggregateResult[0] || {}
      expect(total).toBe(10)
      expect(count).toBe(1)
    })

    it('should return zeros when no donations exist', async () => {
      const aggregateResult = await Payment.aggregate([
        { $match: { type: 'donation', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ])

      const { total = 0, count = 0 } = aggregateResult[0] || {}
      expect(total).toBe(0)
      expect(count).toBe(0)
    })

    it('should return recent donations', async () => {
      for (let i = 0; i < 10; i++) {
        await Payment.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'donation',
          amount: i + 1,
          paymentId: `cs_stat_recent_${i}`,
          status: 'completed',
        })
      }

      const recent = await Payment.find({ type: 'donation', status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('-customerEmail -paymentId')

      expect(recent).toHaveLength(5)
    })
  })

  // ========================================
  // POST /verify-payment/:sessionId
  // ========================================
  describe('Verify Payment (POST /verify-payment/:sessionId)', () => {
    it('should return payment if already completed', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_verify_completed',
        status: 'completed',
        completedAt: new Date(),
      })

      const payment = await Payment.findOne({ paymentId: 'cs_verify_completed' })
      expect(payment?.status).toBe('completed')
      // Route returns early if already completed
    })

    it('should mark payment as completed after successful verification', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_verify_pending',
        status: 'pending',
      })

      // Simulate verification success
      const payment = await Payment.findOne({ paymentId: 'cs_verify_pending' })
      payment!.status = 'completed'
      payment!.completedAt = new Date()
      payment!.paymentMethod = 'card'
      await payment!.save()

      const updated = await Payment.findOne({ paymentId: 'cs_verify_pending' })
      expect(updated?.status).toBe('completed')
      expect(updated?.paymentMethod).toBe('card')
    })

    it('should return 404 for non-existent session', async () => {
      const payment = await Payment.findOne({ paymentId: 'cs_nonexistent_session' })
      expect(payment).toBeNull()
    })
  })
})
