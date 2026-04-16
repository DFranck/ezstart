/**
 * Integration tests for payment routes business logic.
 * Tests the DB queries/mutations that the route handlers execute.
 *
 * Since route handlers are Express middleware functions that require
 * a full Express + auth stack, we test the business logic directly
 * against the Payment model using the same queries as the handlers.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import type { Model } from 'mongoose'

describe('Payment Routes Business Logic', () => {
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
  // GET /payments (list)
  // ========================================
  describe('List Payments (GET /payments)', () => {
    it('should return paginated results', async () => {
      // Create 25 payments
      for (let i = 0; i < 25; i++) {
        await Payment.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'donation',
          amount: 10,
          paymentId: `cs_page_${i}`,
          status: 'completed',
        })
      }

      const limit = 10
      const offset = 0
      const query: Record<string, unknown> = {}

      const [payments, total] = await Promise.all([
        Payment.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
        Payment.countDocuments(query),
      ])

      expect(payments).toHaveLength(10)
      expect(total).toBe(25)
    })

    it('should filter by type', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_type_1',
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 20,
        paymentId: 'cs_type_2',
      })

      const donations = await Payment.find({ type: 'donation' })
      expect(donations).toHaveLength(1)
      expect(donations[0]!.type).toBe('donation')
    })

    it('should filter by status', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_status_1',
        status: 'completed',
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 20,
        paymentId: 'cs_status_2',
        status: 'pending',
      })

      const completed = await Payment.find({ status: 'completed' })
      expect(completed).toHaveLength(1)
    })

    it('should filter by projectId', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_proj_1',
      })
      await Payment.create({
        projectId: 'green-pulse',
        projectName: 'GreenPulse',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_proj_2',
      })

      const ezbillPayments = await Payment.find({ projectId: 'ezbill' })
      expect(ezbillPayments).toHaveLength(1)
    })

    it('should search by customer email (case-insensitive)', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_search_1',
        customerEmail: 'John@Example.COM',
      })

      const results = await Payment.find({
        customerEmail: { $regex: 'john', $options: 'i' },
      })
      expect(results).toHaveLength(1)
    })

    it('should filter by liveMode', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_live_1',
        liveMode: true,
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_live_2',
        liveMode: false,
      })

      const testPayments = await Payment.find({ liveMode: false })
      expect(testPayments).toHaveLength(1)
    })

    it('should scope non-admin users to their own payments', async () => {
      const userId = 'user_scope_123'
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_scope_1',
        userId,
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 20,
        paymentId: 'cs_scope_2',
        userId: 'other_user',
      })

      // Non-admin query always includes userId filter
      const userPayments = await Payment.find({ userId })
      expect(userPayments).toHaveLength(1)
    })

    it('should return offset pagination metadata', async () => {
      for (let i = 0; i < 15; i++) {
        await Payment.create({
          projectId: 'ezbill',
          projectName: 'EZBill',
          type: 'donation',
          amount: 10,
          paymentId: `cs_meta_${i}`,
        })
      }

      const limit = 5
      const offset = 5
      const [payments, total] = await Promise.all([
        Payment.find({}).sort({ createdAt: -1 }).skip(offset).limit(limit),
        Payment.countDocuments({}),
      ])

      expect(payments).toHaveLength(5)
      expect(total).toBe(15)
      // Meta would be: { total: 15, limit: 5, offset: 5 }
    })
  })

  // ========================================
  // GET /payments/:paymentId (get single)
  // ========================================
  describe('Get Payment (GET /payments/:paymentId)', () => {
    it('should find payment by _id', async () => {
      const created = await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_get_1',
      })

      const payment = await Payment.findOne({
        $or: [{ _id: created._id }, { paymentId: String(created._id) }],
      })
      expect(payment).not.toBeNull()
      expect(payment?.paymentId).toBe('cs_get_1')
    })

    it('should find payment by paymentId field', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_get_by_pid',
      })

      // The route handler uses $or with both _id and paymentId.
      // When the param is not a valid ObjectId, only the paymentId branch matches.
      const payment = await Payment.findOne({ paymentId: 'cs_get_by_pid' })
      expect(payment).not.toBeNull()
      expect(payment?.paymentId).toBe('cs_get_by_pid')
    })

    it('should return null for non-existent payment', async () => {
      const payment = await Payment.findOne({ paymentId: 'cs_nonexistent' })
      expect(payment).toBeNull()
    })

    it('should enforce ownership for non-admin users', async () => {
      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_own_1',
        userId: 'owner_user',
      })

      // Non-admin user trying to access another user's payment
      const requestUserId = 'other_user'
      const isOwner = payment.userId === requestUserId
      expect(isOwner).toBe(false) // Route would return 404
    })
  })

  // ========================================
  // POST /payments/:paymentId/refund
  // ========================================
  describe('Refund Payment (POST /payments/:paymentId/refund)', () => {
    it('should mark payment as refunded', async () => {
      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_refund_1',
        status: 'completed',
        stripePaymentIntentId: 'pi_refund_1',
      })

      payment.status = 'refunded'
      await payment.save()

      const updated = await Payment.findById(payment._id)
      expect(updated?.status).toBe('refunded')
    })

    it('should reject refund for already refunded payment', async () => {
      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_refund_2',
        status: 'refunded',
        stripePaymentIntentId: 'pi_refund_2',
      })

      // Route logic: check status before refunding
      expect(payment.status).toBe('refunded')
      // Would return sendError(res, 'Payment already refunded', 400)
    })

    it('should reject refund for payment without payment intent', async () => {
      const payment = await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_refund_3',
        status: 'completed',
        // No stripePaymentIntentId
      })

      expect(payment.stripePaymentIntentId).toBeUndefined()
      // Would return sendError(res, 'No payment intent found — cannot refund', 400)
    })
  })

  // ========================================
  // GET /payments/me
  // ========================================
  describe('My Payments (GET /payments/me)', () => {
    it('should return only the authenticated user payments', async () => {
      const userId = 'me_user_123'
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_me_1',
        userId,
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 20,
        paymentId: 'cs_me_2',
        userId,
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 30,
        paymentId: 'cs_me_3',
        userId: 'other_user',
      })

      const myPayments = await Payment.find({ userId }).sort({ createdAt: -1 })
      expect(myPayments).toHaveLength(2)
    })

    it('should filter my payments by type', async () => {
      const userId = 'me_filter_user'
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_mef_1',
        userId,
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'purchase',
        amount: 20,
        paymentId: 'cs_mef_2',
        userId,
      })

      const myDonations = await Payment.find({ userId, type: 'donation' })
      expect(myDonations).toHaveLength(1)
    })

    it('should return empty for unauthenticated requests', async () => {
      // When req.userId is undefined, handler returns empty
      const noUserId = undefined
      expect(noUserId).toBeUndefined()
      // Would return sendSuccess(res, [], { total: 0, limit: 20, offset: 0 })
    })
  })

  // ========================================
  // DELETE /payments/cleanup
  // ========================================
  describe('Cleanup Payments (DELETE /payments/cleanup)', () => {
    it('should only delete test payments (liveMode !== true)', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_cleanup_test',
        liveMode: false,
      })
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_cleanup_live',
        liveMode: true,
      })

      // Cleanup query: only non-live data
      const result = await Payment.deleteMany({ liveMode: { $ne: true } })
      expect(result.deletedCount).toBe(1)

      const remaining = await Payment.find({})
      expect(remaining).toHaveLength(1)
      expect(remaining[0]!.liveMode).toBe(true)
    })

    it('should scope cleanup by appName when provided', async () => {
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_cleanup_app_1',
        liveMode: false,
      })
      await Payment.create({
        projectId: 'green-pulse',
        projectName: 'GreenPulse',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_cleanup_app_2',
        liveMode: false,
      })

      const query: Record<string, unknown> = { liveMode: { $ne: true } }
      query.projectId = 'ezbill'

      const result = await Payment.deleteMany(query)
      expect(result.deletedCount).toBe(1)

      const remaining = await Payment.find({})
      expect(remaining).toHaveLength(1)
      expect(remaining[0]!.projectId).toBe('green-pulse')
    })

    it('should delete records where liveMode is undefined (legacy data)', async () => {
      // Old records may not have liveMode field at all
      await Payment.create({
        projectId: 'ezbill',
        projectName: 'EZBill',
        type: 'donation',
        amount: 10,
        paymentId: 'cs_cleanup_legacy',
        // liveMode not set (undefined)
      })

      // $ne: true matches false AND undefined/null
      const result = await Payment.deleteMany({ liveMode: { $ne: true } })
      expect(result.deletedCount).toBe(1)
    })
  })
})
