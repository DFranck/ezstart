import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import type { Model } from 'mongoose'

type PaymentType = PaymentDocument['type']
type PaymentProvider = PaymentDocument['provider']
type PaymentStatus = PaymentDocument['status']

describe('Payment Model', () => {
  let PaymentModel: Model<PaymentDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    PaymentModel = await getPaymentModel()

    // Drop all indexes and recreate to ensure correct indexes
    try {
      await PaymentModel.collection.dropIndexes()
    } catch (error) {
      // Ignore error if collection doesn't exist yet
    }
    await PaymentModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PaymentModel.deleteMany({})
  })

  describe('Schema Validation', () => {
    it('should create a valid payment with required fields', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_123',
      })

      expect(payment.projectId).toBe('ezbill')
      expect(payment.projectName).toBe('EZBill')
      expect(payment.type).toBe('donation')
      expect(payment.amount).toBe(10.0)
      expect(payment.currency).toBe('USD') // Default value
      expect(payment.provider).toBe('stripe') // Default value
      expect(payment.status).toBe('pending') // Default value
      expect(payment.isAnonymous).toBe(false) // Default value
    })

    it('should require projectId field', async () => {
      await expect(
        PaymentModel.create({
          projectName: 'EZBill',
          type: 'donation',
          amount: 10.0,
          paymentId: 'cs_test_123',
        })
      ).rejects.toThrow()
    })

    it('should require projectName field', async () => {
      await expect(
        PaymentModel.create({
          projectId: 'ezbill',
          type: 'donation',
          amount: 10.0,
          paymentId: 'cs_test_123',
        })
      ).rejects.toThrow()
    })

    it('should require type field', async () => {
      await expect(
        PaymentModel.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          amount: 10.0,
          paymentId: 'cs_test_123',
        })
      ).rejects.toThrow()
    })

    it('should require amount field', async () => {
      await expect(
        PaymentModel.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'donation',
          paymentId: 'cs_test_123',
        })
      ).rejects.toThrow()
    })

    it('should validate payment type enum', async () => {
      const validTypes = ['donation', 'purchase', 'subscription', 'invoice']

      for (const type of validTypes) {
        const payment = await PaymentModel.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: type as PaymentType,
          amount: 10.0,
          paymentId: `cs_test_${type}`,
        })
        expect(payment.type).toBe(type)
        await PaymentModel.deleteMany({})
      }
    })

    it('should reject invalid payment type', async () => {
      await expect(
        PaymentModel.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'invalid-type',
          amount: 10.0,
          paymentId: 'cs_test_123',
        })
      ).rejects.toThrow()
    })

    it('should validate provider enum', async () => {
      const validProviders = ['stripe', 'paypal']

      for (const provider of validProviders) {
        const payment = await PaymentModel.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'donation',
          amount: 10.0,
          provider: provider as PaymentProvider,
          paymentId: `cs_test_${provider}`,
        })
        expect(payment.provider).toBe(provider)
        await PaymentModel.deleteMany({})
      }
    })

    it('should validate status enum', async () => {
      const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'cancelled']

      for (const status of validStatuses) {
        const payment = await PaymentModel.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'donation',
          amount: 10.0,
          status: status as PaymentStatus,
          paymentId: `cs_test_${status}`,
        })
        expect(payment.status).toBe(status)
        await PaymentModel.deleteMany({})
      }
    })
  })

  describe('Donation Metadata', () => {
    it('should store donation with message and isPublic', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 25.0,
        paymentId: 'cs_test_123',
        metadata: {
          message: 'Great game!',
          isPublic: true,
        },
      })

      expect(payment.metadata?.message).toBe('Great game!')
      expect(payment.metadata?.isPublic).toBe(true)
    })

    it('should allow anonymous donations', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 50.0,
        paymentId: 'cs_test_123',
        isAnonymous: true,
        customerName: 'Anonymous',
      })

      expect(payment.isAnonymous).toBe(true)
      expect(payment.customerName).toBe('Anonymous')
    })
  })

  describe('Purchase Metadata', () => {
    it('should store purchase with product details', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 4.99,
        paymentId: 'cs_test_123',
        metadata: {
          productId: 'gems-100',
          productName: '100 Gems',
          quantity: 1,
        },
      })

      expect(payment.metadata?.productId).toBe('gems-100')
      expect(payment.metadata?.productName).toBe('100 Gems')
      expect(payment.metadata?.quantity).toBe(1)
    })

    it('should support multiple quantity purchases', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 19.96,
        paymentId: 'cs_test_123',
        metadata: {
          productId: 'gems-100',
          productName: '100 Gems',
          quantity: 4,
        },
      })

      expect(payment.metadata?.quantity).toBe(4)
      expect(payment.amount).toBe(19.96) // 4 * 4.99
    })
  })

  describe('Subscription Metadata', () => {
    it('should store subscription with plan details', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'subscription',
        amount: 9.99,
        paymentId: 'cs_test_123',
        metadata: {
          subscriptionId: 'sub_123',
          planId: 'premium-monthly',
          planName: 'Premium Monthly',
          interval: 'month',
        },
      })

      expect(payment.metadata?.subscriptionId).toBe('sub_123')
      expect(payment.metadata?.planId).toBe('premium-monthly')
      expect(payment.metadata?.planName).toBe('Premium Monthly')
      expect(payment.metadata?.interval).toBe('month')
    })

    it('should support yearly subscriptions (12 months)', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'subscription',
        amount: 99.99,
        paymentId: 'cs_test_123',
        metadata: {
          subscriptionId: 'sub_456',
          planId: 'premium-yearly',
          planName: 'Premium Yearly',
          interval: 'month',
          intervalCount: 12,
        },
      })

      expect(payment.metadata?.interval).toBe('month')
      expect(payment.metadata?.intervalCount).toBe(12)
      expect(payment.amount).toBe(99.99)
    })
  })

  describe('Invoice Metadata', () => {
    it('should store invoice payment with invoice reference', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'invoice',
        amount: 150.0,
        paymentId: 'cs_test_123',
        metadata: {
          invoiceId: '507f1f77bcf86cd799439011',
          invoiceNumber: 'INV-2025-001',
        },
      })

      expect(payment.metadata?.invoiceId).toBe('507f1f77bcf86cd799439011')
      expect(payment.metadata?.invoiceNumber).toBe('INV-2025-001')
    })
  })

  describe('Customer Information', () => {
    it('should link payment to EZAuth user', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_123',
        userId: '507f1f77bcf86cd799439011',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
      })

      expect(payment.userId).toBe('507f1f77bcf86cd799439011')
      expect(payment.customerName).toBe('John Doe')
      expect(payment.customerEmail).toBe('john@example.com')
    })

    it('should allow guest payments without userId', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_123',
        customerName: 'Guest User',
        customerEmail: 'guest@example.com',
      })

      expect(payment.userId).toBeUndefined()
      expect(payment.customerName).toBe('Guest User')
    })
  })

  describe('Payment Status', () => {
    it('should update payment status to completed', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_123',
        status: 'pending',
      })

      payment.status = 'completed'
      payment.completedAt = new Date()
      await payment.save()

      const updated = await PaymentModel.findById(payment._id)
      expect(updated?.status).toBe('completed')
      expect(updated?.completedAt).toBeInstanceOf(Date)
    })

    it('should update payment status to failed', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_123',
      })

      payment.status = 'failed'
      await payment.save()

      const updated = await PaymentModel.findById(payment._id)
      expect(updated?.status).toBe('failed')
    })

    it('should update payment status to refunded', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_123',
        status: 'completed',
        completedAt: new Date(),
      })

      payment.status = 'refunded'
      await payment.save()

      const updated = await PaymentModel.findById(payment._id)
      expect(updated?.status).toBe('refunded')
    })
  })

  describe('Unique Constraints', () => {
    it('should enforce unique paymentId', async () => {
      await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_unique',
      })

      await expect(
        PaymentModel.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'invoice',
          amount: 100.0,
          paymentId: 'cs_test_unique', // Same paymentId
        })
      ).rejects.toThrow()
    })
  })

  describe('Queries', () => {
    it('should find payments by projectId', async () => {
      await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_1',
      })

      await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 4.99,
        paymentId: 'cs_test_2',
      })

      await PaymentModel.create({
        projectId: 'greenpulse',
        projectName: 'GreenPulse',
        type: 'invoice',
        amount: 100.0,
        paymentId: 'cs_test_3',
      })

      const ezbillPayments = await PaymentModel.find({ projectId: 'ezbill' })
      expect(ezbillPayments).toHaveLength(2)
    })

    it('should find payments by userId', async () => {
      const userId = '507f1f77bcf86cd799439011'

      await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        userId,
        paymentId: 'cs_test_1',
      })

      await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'invoice',
        amount: 100.0,
        userId,
        paymentId: 'cs_test_2',
      })

      const userPayments = await PaymentModel.find({ userId })
      expect(userPayments).toHaveLength(2)
    })

    it('should find payments by type and status', async () => {
      await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        status: 'completed',
        paymentId: 'cs_test_1',
      })

      await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 20.0,
        status: 'pending',
        paymentId: 'cs_test_2',
      })

      const completedDonations = await PaymentModel.find({
        type: 'donation',
        status: 'completed',
      })

      expect(completedDonations).toHaveLength(1)
      expect(completedDonations[0]!.amount).toBe(10.0)
    })
  })

  describe('Timestamps', () => {
    it('should auto-generate createdAt and updatedAt', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_123',
      })

      expect(payment.createdAt).toBeInstanceOf(Date)
      expect(payment.updatedAt).toBeInstanceOf(Date)
    })

    it('should update updatedAt on modification', async () => {
      const payment = await PaymentModel.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10.0,
        paymentId: 'cs_test_123',
      })

      const originalUpdatedAt = payment.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      payment.status = 'completed'
      await payment.save()

      const updated = await PaymentModel.findById(payment._id)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })
})
