/**
 * Security tests for Stripe Connect fee calculation (Phase C — applicationId-based).
 *
 * Attack vectors tested:
 * - Fee calculation with 0 amount
 * - Fee calculation with negative amount (clamped)
 * - Fee with fractional cents (rounding)
 * - Fee percentage edge cases (0%, 100%) — driven by the owner's EZPay plan
 * - Account-status and platform-account filtering
 *
 * Note: since Phase C, the per-request fee percent is resolved from the
 * Application owner's ACTIVE EZPay subscription plan (not from
 * `defaultFeePercent` on the ConnectedAccount). These tests drive custom
 * percentages via ezpay self-sub Payment rows + Plan metadata.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  getConnectedAccountModel,
  type ConnectedAccountDocument,
} from '../../models/ConnectedAccount.js'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import { resolveConnectFee } from '../../services/connect-fee.js'
import type { Model } from 'mongoose'

describe('Connect Fee Security', () => {
  let ConnectedAccount: Model<ConnectedAccountDocument>
  let Payment: Model<PaymentDocument>
  let Plan: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ConnectedAccount = await getConnectedAccountModel()
    Payment = await getPaymentModel()
    Plan = await getPlanModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ConnectedAccount.deleteMany({})
    await Payment.deleteMany({})
    await Plan.deleteMany({})
  })

  /**
   * Create an active external ConnectedAccount for the given suffix.
   * Returns the deterministic applicationId + userId so the caller can
   * target the resolver.
   */
  async function createActiveAccount(
    suffix: string
  ): Promise<{ applicationId: string; userId: string }> {
    const applicationId = `app_${suffix}`
    const userId = `user_${suffix}`
    await ConnectedAccount.create({
      applicationId,
      userId,
      isPlatformAccount: false,
      stripeAccountId: `acct_${suffix}`,
      email: 'test@test.com',
      businessName: 'Test',
      status: 'active',
      chargesEnabled: true,
      payoutsEnabled: true,
    })
    return { applicationId, userId }
  }

  /**
   * Seed an active EZPay self-subscription for `userId` with the given
   * `feePercent` so the resolver returns that percent for the owner.
   */
  async function seedFeePercent(userId: string, feePercent: number): Promise<void> {
    const plan = await Plan.create({
      name: `Custom-${feePercent}`,
      applicationId: 'app_ezpay_self',
      amount: 1,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      metadata: { feePercent },
    })
    await Payment.create({
      projectId: 'ezpay',
      projectName: 'EZPay',
      type: 'subscription',
      amount: 49,
      currency: 'EUR',
      userId,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: `cs_custom_${userId}`,
      status: 'completed',
      liveMode: false,
      metadata: { planId: String(plan._id), planName: plan.name },
    })
  }

  // =========================================================================
  // Fee with edge amounts
  // =========================================================================
  describe('Fee calculation edge cases', () => {
    it('fee with 0 amount should return 0 fee', async () => {
      const { applicationId, userId } = await createActiveAccount('1')
      await seedFeePercent(userId, 3)
      const result = await resolveConnectFee(applicationId, 0)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(0)
    })

    it('FIXED: fee with negative amount is clamped to 0', async () => {
      const { applicationId, userId } = await createActiveAccount('2')
      await seedFeePercent(userId, 3)
      const result = await resolveConnectFee(applicationId, -1000)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(0)
    })

    it('fee rounding with fractional cents', async () => {
      const { applicationId, userId } = await createActiveAccount('3')
      await seedFeePercent(userId, 7)
      // 7% of 333 cents = 23.31 -> rounds to 23
      const result = await resolveConnectFee(applicationId, 333)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(23)
    })

    it('fee with 0% should return 0', async () => {
      const { applicationId, userId } = await createActiveAccount('4')
      await seedFeePercent(userId, 0)
      const result = await resolveConnectFee(applicationId, 10000)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(0)
    })

    it('fee with 100% takes entire amount', async () => {
      const { applicationId, userId } = await createActiveAccount('5')
      await seedFeePercent(userId, 100)
      const result = await resolveConnectFee(applicationId, 10000)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(10000)
    })
  })

  // =========================================================================
  // Account status checks
  // =========================================================================
  describe('Account status filtering', () => {
    it('should not route through charges-disabled account', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_inactive1',
        userId: 'inactive1',
        isPlatformAccount: false,
        stripeAccountId: 'acct_inactive1',
        email: 'test@test.com',
        businessName: 'Test',
        status: 'active',
        chargesEnabled: false, // Not enabled
        payoutsEnabled: true,
      })

      const result = await resolveConnectFee('app_inactive1', 1000)
      expect(result.isConnect).toBe(false)
    })

    it('should not route through pending account', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_pending1',
        userId: 'pending1',
        isPlatformAccount: false,
        stripeAccountId: 'acct_pending1',
        email: 'test@test.com',
        businessName: 'Test',
        status: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
      })

      const result = await resolveConnectFee('app_pending1', 1000)
      expect(result.isConnect).toBe(false)
    })

    it('should return isConnect false for unknown applicationId', async () => {
      const result = await resolveConnectFee('app_does_not_exist', 1000)
      expect(result.isConnect).toBe(false)
    })

    it('should skip platform (dogfood) accounts — no self-fee', async () => {
      await ConnectedAccount.create({
        applicationId: 'app_ezpay_platform',
        userId: 'system',
        isPlatformAccount: true,
        stripeAccountId: 'acct_platform',
        email: 'platform@ezstart.llc',
        businessName: 'EZStart LLC',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
      })

      const result = await resolveConnectFee('app_ezpay_platform', 10000)
      expect(result.isConnect).toBe(false)
      expect(result.stripeAccountId).toBeUndefined()
    })
  })
})
