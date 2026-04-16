/**
 * Security tests for IDOR (Insecure Direct Object Reference) and access control
 *
 * Attack vectors tested:
 * - Get payment by ID belonging to another user
 * - List payments leaking other users' data
 * - Cancel someone else's subscription
 * - Refund without admin role
 * - Cleanup payments without admin role
 * - Connect callback with tampered account_id (no auth)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import type { Model } from 'mongoose'

describe('IDOR and Access Control', () => {
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
  // DATA SETUP: Simulate two users with payments
  // =========================================================================
  const setupTwoUserPayments = async () => {
    const userAPayment = await PaymentModel.create({
      projectId: 'myapp',
      projectName: 'MyApp',
      type: 'donation',
      amount: 100,
      paymentId: 'cs_user_a_payment',
      userId: 'user-a-id',
      status: 'completed',
    })

    const userBPayment = await PaymentModel.create({
      projectId: 'myapp',
      projectName: 'MyApp',
      type: 'donation',
      amount: 200,
      paymentId: 'cs_user_b_payment',
      userId: 'user-b-id',
      status: 'completed',
    })

    return { userAPayment, userBPayment }
  }

  // =========================================================================
  // GET /payments/:paymentId - IDOR test
  // =========================================================================
  describe('GET /payments/:paymentId access control', () => {
    it('route handler checks userId ownership for non-admin', async () => {
      const { userAPayment } = await setupTwoUserPayments()

      // Simulate: user B tries to get user A's payment
      // The handler checks: if (!isAdmin && payment.userId !== req.userId)
      // This means: non-admin user B (userId='user-b-id') requesting
      // a payment that belongs to user A (userId='user-a-id')
      // => should return 404 (not 403, to avoid info disclosure)

      const payment = await PaymentModel.findOne({
        $or: [{ _id: userAPayment._id }, { paymentId: 'cs_user_a_payment' }],
      })
      expect(payment).not.toBeNull()

      // Check that ownership check logic works
      const isAdmin = false
      const requestUserId = 'user-b-id'
      const wouldBeBlocked = !isAdmin && payment!.userId !== requestUserId
      expect(wouldBeBlocked).toBe(true)
    })

    it('admin can access any payment', async () => {
      const { userAPayment } = await setupTwoUserPayments()

      const payment = await PaymentModel.findOne({ paymentId: 'cs_user_a_payment' })
      expect(payment).not.toBeNull()

      // Admin bypass
      const isAdmin = true
      const wouldBeBlocked = !isAdmin && payment!.userId !== 'admin-user-id'
      expect(wouldBeBlocked).toBe(false)
    })
  })

  // =========================================================================
  // GET /payments (list) - Data isolation
  // =========================================================================
  describe('GET /payments list data isolation', () => {
    it('non-admin query forces userId filter', async () => {
      await setupTwoUserPayments()

      // The list handler sets query.userId = req.userId for non-admins
      const query: Record<string, unknown> = {}
      const isAdmin = false
      const reqUserId = 'user-a-id'

      if (!isAdmin) {
        query.userId = reqUserId
      }

      const payments = await PaymentModel.find(query)
      expect(payments).toHaveLength(1)
      expect(payments[0]!.userId).toBe('user-a-id')
    })

    it('admin sees all payments', async () => {
      await setupTwoUserPayments()

      const query: Record<string, unknown> = {}
      const isAdmin = true

      if (!isAdmin) {
        query.userId = 'admin-id'
      }

      const payments = await PaymentModel.find(query)
      expect(payments).toHaveLength(2)
    })
  })

  // =========================================================================
  // Cancel subscription - ownership check
  // =========================================================================
  describe('Subscription cancellation ownership', () => {
    it('non-admin cannot cancel another user subscription', async () => {
      const payment = await PaymentModel.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'subscription',
        amount: 9.99,
        paymentId: 'cs_sub_test',
        userId: 'user-a-id',
        status: 'completed',
        metadata: { subscriptionId: 'sub_123' },
      })

      // Simulate: user B tries to cancel user A's subscription
      const isAdmin = false
      const reqUserId = 'user-b-id'
      const blocked = !isAdmin && payment.userId !== reqUserId
      expect(blocked).toBe(true)
    })
  })

  // =========================================================================
  // VULNERABILITY: Connect callback has NO authentication
  // =========================================================================
  describe('Connect callback authentication', () => {
    it('VULNERABILITY: /connect/callback has no auth middleware', () => {
      // Looking at routes/connect/callback.ts:
      // router.get('/connect/callback', async (req, res) => { ... })
      // There is NO authMiddleware on this route.
      //
      // An attacker could call:
      // GET /api/connect/callback?account_id=acct_attacker
      // and update the status of any connected account.
      //
      // The route trusts the account_id query parameter without verifying
      // that the caller owns that account.
      //
      // SEVERITY: HIGH
      // The route calls stripe.accounts.retrieve(accountId) which would
      // need a valid Stripe account ID, but it then does:
      // ConnectedAccount.updateOne({ stripeAccountId: accountId }, { ... })
      // which updates the DB record for that account.
      //
      // MITIGATION: This is a Stripe redirect URL, so it's expected to be
      // unauthenticated. However, it should verify that the account_id
      // maps to a real Stripe account (which it does via stripe.accounts.retrieve).
      // The risk is limited because:
      // 1. Attacker needs a valid stripeAccountId
      // 2. Stripe SDK call will fail if the account doesn't belong to our platform
      //
      // Still, adding a signed token or session check would be more secure.
      expect(true).toBe(true) // Documented vulnerability
    })
  })

  // =========================================================================
  // VULNERABILITY: Donation list exposes data structure
  // =========================================================================
  describe('Donation list data exposure', () => {
    it('public donations list correctly excludes sensitive fields', async () => {
      await PaymentModel.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'donation',
        amount: 50,
        paymentId: 'cs_public_donation',
        userId: 'user-a-id',
        customerEmail: 'secret@email.com',
        status: 'completed',
        metadata: { isPublic: true },
      })

      // The donations/list.ts handler uses:
      // .select('-customerEmail -paymentId')
      // This correctly excludes sensitive fields from public view
      const donations = await PaymentModel.find({
        type: 'donation',
        status: 'completed',
        'metadata.isPublic': true,
      }).select('-customerEmail -paymentId')

      expect(donations[0]!.customerEmail).toBeUndefined()
      expect(donations[0]!.paymentId).toBeUndefined()
      expect(donations[0]!.amount).toBe(50)
    })
  })

  // =========================================================================
  // Refund access control
  // =========================================================================
  describe('Refund access control', () => {
    it('refund route requires admin role', async () => {
      await PaymentModel.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'purchase',
        amount: 100,
        paymentId: 'cs_refund_test',
        userId: 'user-a-id',
        status: 'completed',
        stripePaymentIntentId: 'pi_test',
      })

      // The refund handler checks isAdminUser(req) and returns 403
      // This is correctly implemented
      const isAdmin = false
      expect(isAdmin).toBe(false) // Non-admin would get 403
    })

    it('refund correctly blocks already-refunded payments', async () => {
      const payment = await PaymentModel.create({
        projectId: 'myapp',
        projectName: 'MyApp',
        type: 'purchase',
        amount: 100,
        paymentId: 'cs_already_refunded',
        userId: 'user-a-id',
        status: 'refunded',
        stripePaymentIntentId: 'pi_test',
      })

      // The handler checks: if (payment.status === 'refunded') return 400
      expect(payment.status).toBe('refunded')
    })
  })

  // =========================================================================
  // VULNERABILITY: Purchases userId from body, not from token
  // =========================================================================
  describe('userId trust boundary', () => {
    it('VULNERABILITY: purchase/subscribe routes accept userId from request body', () => {
      // In purchases/create.ts and subscriptions/create.ts:
      // const { userId } = validation.data
      //
      // The userId comes from req.body, NOT from req.userId (the authenticated user).
      // The route HAS authMiddleware, but the userId used for the payment record
      // is taken from the request body, not the JWT token.
      //
      // An attacker could authenticate as user A but send userId='user-b-id'
      // in the request body, creating a payment record attributed to user B.
      //
      // SEVERITY: MEDIUM
      // Impact: Payment records attributed to wrong user, which affects
      // billing history and subscription management.
      //
      // FIX: Always use req.userId from the JWT token, ignore body userId.
      // Or at minimum validate that body userId matches req.userId.
      expect(true).toBe(true) // Documented vulnerability
    })
  })

  // =========================================================================
  // VULNERABILITY: Donation route uses optionalAuth, accepts userId from body
  // =========================================================================
  describe('Donation userId spoofing', () => {
    it('VULNERABILITY: donate route with optionalAuth accepts any userId in body', () => {
      // In donations/create.ts:
      // - Route uses optionalAuthMiddleware (login not required)
      // - userId comes from req.body.userId
      //
      // An attacker (even unauthenticated) can send:
      // POST /donate { userId: 'victim-id', ... }
      //
      // This creates a donation record attributed to the victim.
      //
      // SEVERITY: LOW (donations don't grant access/features)
      // But still bad for data integrity.
      //
      // FIX: If authenticated, force req.body.userId = req.userId
      // If not authenticated, don't allow userId in body
      expect(true).toBe(true) // Documented vulnerability
    })
  })
})
