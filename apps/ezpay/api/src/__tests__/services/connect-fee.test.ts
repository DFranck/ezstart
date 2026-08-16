/**
 * Connect Fee Service tests (Phase C — applicationId-based resolver).
 *
 * Coverage:
 *   - No ConnectedAccount → isConnect: false
 *   - Status pending / restricted / chargesEnabled false → isConnect: false
 *   - Platform account (dogfood) → isConnect: false
 *   - External active + no EZPay sub → Starter fallback 5%
 *   - External active + Growth sub (3%) → fee matches plan
 *   - External active + cancelled lapsed sub → Starter fallback 5%
 *   - External active + Plan deleted → Starter fallback 5%
 *   - External active + Plan missing feePercent → Starter fallback 5%
 *   - Amount rounding (negative → 0, decimals → round)
 *   - Multi-account: wrong applicationId does not leak account data
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

describe('Connect Fee Service (applicationId-based)', () => {
  let ConnectedAccountModel: Model<ConnectedAccountDocument>
  let PaymentModel: Model<PaymentDocument>
  let PlanModel: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    ConnectedAccountModel = await getConnectedAccountModel()
    PaymentModel = await getPaymentModel()
    PlanModel = await getPlanModel()
    try {
      await ConnectedAccountModel.collection.dropIndexes()
    } catch {
      // Ignore — indexes may not exist on first run
    }
    await ConnectedAccountModel.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ConnectedAccountModel.deleteMany({})
    await PaymentModel.deleteMany({})
    await PlanModel.deleteMany({})
  })

  // ------------------------------------------------------------------
  // Happy/early-exit paths (isConnect: false)
  // ------------------------------------------------------------------
  describe('isConnect: false paths', () => {
    it('returns isConnect: false when no ConnectedAccount exists for the Application', async () => {
      const result = await resolveConnectFee('app_nonexistent', 10000)
      expect(result.isConnect).toBe(false)
      expect(result.stripeAccountId).toBeUndefined()
      expect(result.applicationFeeAmount).toBeUndefined()
      expect(result.applicationFeePercent).toBeUndefined()
    })

    it('returns isConnect: false when the account status is pending', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_pending',
        userId: 'owner_pending',
        isPlatformAccount: false,
        stripeAccountId: 'acct_pending',
        email: 'pending@example.com',
        businessName: 'Pending Biz',
        status: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
      })

      const result = await resolveConnectFee('app_pending', 10000)
      expect(result.isConnect).toBe(false)
    })

    it('returns isConnect: false when status is restricted', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_restricted',
        userId: 'owner_restricted',
        isPlatformAccount: false,
        stripeAccountId: 'acct_restricted',
        email: 'r@example.com',
        businessName: 'Restricted Biz',
        status: 'restricted',
        chargesEnabled: true, // technically true but status blocks
        payoutsEnabled: false,
      })

      const result = await resolveConnectFee('app_restricted', 10000)
      expect(result.isConnect).toBe(false)
    })

    it('returns isConnect: false when charges are not enabled', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_nochg',
        userId: 'owner_nochg',
        isPlatformAccount: false,
        stripeAccountId: 'acct_nochg',
        email: 'nochg@example.com',
        businessName: 'No Charges Biz',
        status: 'active',
        chargesEnabled: false,
        payoutsEnabled: true,
      })

      const result = await resolveConnectFee('app_nochg', 10000)
      expect(result.isConnect).toBe(false)
    })

    it('returns isConnect: false for platform (dogfood) accounts', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_ezpay_platform',
        userId: 'system',
        isPlatformAccount: true,
        stripeAccountId: 'acct_ezstart_llc',
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

  // ------------------------------------------------------------------
  // External Connect + plan resolution
  // ------------------------------------------------------------------
  describe('External Connect with plan resolution', () => {
    async function createActiveExternalAccount(
      applicationId: string,
      userId: string,
      stripeAccountId = 'acct_ext_default'
    ) {
      return ConnectedAccountModel.create({
        applicationId,
        userId,
        isPlatformAccount: false,
        stripeAccountId,
        email: `${userId}@example.com`,
        businessName: `${userId} Biz`,
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
        defaultFeePercent: 3,
      })
    }

    it('uses Starter 5% fallback when the owner has no EZPay subscription', async () => {
      await createActiveExternalAccount('app_new', 'owner_new', 'acct_new_ext')

      const result = await resolveConnectFee('app_new', 10000)
      expect(result.isConnect).toBe(true)
      expect(result.stripeAccountId).toBe('acct_new_ext')
      expect(result.applicationFeePercent).toBe(5)
      expect(result.applicationFeeAmount).toBe(500) // 5% of 10000
    })

    it('uses Growth 3% fee when owner has an active Growth subscription', async () => {
      await createActiveExternalAccount('app_growth', 'owner_growth', 'acct_growth_ext')

      const growthPlan = await PlanModel.create({
        name: 'Growth',
        applicationId: 'app_ezpay_self',
        amount: 4900,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        active: true,
        metadata: { feePercent: 3 },
      })

      await PaymentModel.create({
        projectId: 'ezpay',
        projectName: 'EZPay',
        type: 'subscription',
        amount: 49,
        currency: 'EUR',
        userId: 'owner_growth',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_growth_1',
        status: 'completed',
        liveMode: false,
        metadata: {
          planId: String(growthPlan._id),
          planName: 'Growth',
          interval: 'month',
          intervalCount: 1,
        },
      })

      const result = await resolveConnectFee('app_growth', 10000)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeePercent).toBe(3)
      expect(result.applicationFeeAmount).toBe(300) // 3% of 10000
    })

    it('uses Enterprise 1.5% fee when owner has an active Enterprise subscription', async () => {
      await createActiveExternalAccount('app_enterprise', 'owner_enterprise', 'acct_ent_ext')

      const enterprisePlan = await PlanModel.create({
        name: 'Enterprise',
        applicationId: 'app_ezpay_self',
        amount: 19900,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        active: true,
        metadata: { feePercent: 1.5 },
      })

      await PaymentModel.create({
        projectId: 'ezpay',
        projectName: 'EZPay',
        type: 'subscription',
        amount: 199,
        currency: 'EUR',
        userId: 'owner_enterprise',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_ent_1',
        status: 'completed',
        liveMode: false,
        metadata: {
          planId: String(enterprisePlan._id),
          planName: 'Enterprise',
        },
      })

      const result = await resolveConnectFee('app_enterprise', 20000)
      expect(result.applicationFeePercent).toBe(1.5)
      expect(result.applicationFeeAmount).toBe(300) // 1.5% of 20000
    })

    it('falls back to Starter when the latest subscription is cancelled and lapsed', async () => {
      await createActiveExternalAccount('app_cancelled', 'owner_cancelled', 'acct_cancelled_ext')

      const growthPlan = await PlanModel.create({
        name: 'Growth',
        applicationId: 'app_ezpay_self',
        amount: 4900,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        active: true,
        metadata: { feePercent: 3 },
      })

      await PaymentModel.create({
        projectId: 'ezpay',
        projectName: 'EZPay',
        type: 'subscription',
        amount: 49,
        currency: 'EUR',
        userId: 'owner_cancelled',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_cancelled_1',
        status: 'completed',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        liveMode: false,
        metadata: {
          planId: String(growthPlan._id),
          planName: 'Growth',
        },
      })

      const result = await resolveConnectFee('app_cancelled', 10000)
      expect(result.applicationFeePercent).toBe(5) // Starter fallback
      expect(result.applicationFeeAmount).toBe(500)
    })

    it('keeps the plan fee when cancelled but still within the paid period', async () => {
      await createActiveExternalAccount(
        'app_pending_cancel',
        'owner_pending_cancel',
        'acct_pending_cancel_ext'
      )

      const growthPlan = await PlanModel.create({
        name: 'Growth',
        applicationId: 'app_ezpay_self',
        amount: 4900,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        active: true,
        metadata: { feePercent: 3 },
      })

      await PaymentModel.create({
        projectId: 'ezpay',
        projectName: 'EZPay',
        type: 'subscription',
        amount: 49,
        currency: 'EUR',
        userId: 'owner_pending_cancel',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_pending_cancel_1',
        status: 'completed',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        liveMode: false,
        metadata: {
          planId: String(growthPlan._id),
          planName: 'Growth',
        },
      })

      const result = await resolveConnectFee('app_pending_cancel', 10000)
      expect(result.applicationFeePercent).toBe(3) // still on Growth
    })

    it('falls back to Starter when referenced Plan was deleted', async () => {
      await createActiveExternalAccount(
        'app_deleted_plan',
        'owner_deleted_plan',
        'acct_deleted_plan_ext'
      )

      await PaymentModel.create({
        projectId: 'ezpay',
        projectName: 'EZPay',
        type: 'subscription',
        amount: 49,
        currency: 'EUR',
        userId: 'owner_deleted_plan',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_dp_1',
        status: 'completed',
        liveMode: false,
        metadata: {
          planId: '507f1f77bcf86cd799439099', // dangling reference
          planName: 'Growth',
        },
      })

      const result = await resolveConnectFee('app_deleted_plan', 10000)
      expect(result.applicationFeePercent).toBe(5)
      expect(result.applicationFeeAmount).toBe(500)
    })

    it('falls back to Starter when Plan has no metadata.feePercent', async () => {
      await createActiveExternalAccount('app_no_meta', 'owner_no_meta', 'acct_no_meta_ext')

      const bareplan = await PlanModel.create({
        name: 'Mystery',
        applicationId: 'app_ezpay_self',
        amount: 1000,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        active: true,
        // no metadata
      })

      await PaymentModel.create({
        projectId: 'ezpay',
        projectName: 'EZPay',
        type: 'subscription',
        amount: 10,
        currency: 'EUR',
        userId: 'owner_no_meta',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_nm_1',
        status: 'completed',
        liveMode: false,
        metadata: {
          planId: String(bareplan._id),
          planName: bareplan.name,
        },
      })

      const result = await resolveConnectFee('app_no_meta', 10000)
      expect(result.applicationFeePercent).toBe(5)
    })

    it('uses the LATEST completed subscription when the user has multiple', async () => {
      await createActiveExternalAccount('app_multi', 'owner_multi', 'acct_multi_ext')

      const starter = await PlanModel.create({
        name: 'Starter',
        applicationId: 'app_ezpay_self',
        amount: 0,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        active: true,
        metadata: { feePercent: 5 },
      })
      const enterprise = await PlanModel.create({
        name: 'Enterprise',
        applicationId: 'app_ezpay_self',
        amount: 19900,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
        active: true,
        metadata: { feePercent: 1.5 },
      })

      // Older Starter
      await PaymentModel.create({
        projectId: 'ezpay',
        projectName: 'EZPay',
        type: 'subscription',
        amount: 0,
        currency: 'EUR',
        userId: 'owner_multi',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_multi_old',
        status: 'completed',
        liveMode: false,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        metadata: { planId: String(starter._id), planName: 'Starter' },
      })
      // Newer Enterprise
      await PaymentModel.create({
        projectId: 'ezpay',
        projectName: 'EZPay',
        type: 'subscription',
        amount: 199,
        currency: 'EUR',
        userId: 'owner_multi',
        isAnonymous: false,
        provider: 'stripe',
        paymentId: 'cs_multi_new',
        status: 'completed',
        liveMode: false,
        metadata: { planId: String(enterprise._id), planName: 'Enterprise' },
      })

      const result = await resolveConnectFee('app_multi', 10000)
      expect(result.applicationFeePercent).toBe(1.5)
    })
  })

  // ------------------------------------------------------------------
  // Amount rounding
  // ------------------------------------------------------------------
  describe('Amount handling', () => {
    it('clamps negative amounts to zero fee', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_neg',
        userId: 'owner_neg',
        isPlatformAccount: false,
        stripeAccountId: 'acct_neg',
        email: 'n@example.com',
        businessName: 'Neg Biz',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
      })

      const result = await resolveConnectFee('app_neg', -1000)
      expect(result.isConnect).toBe(true)
      expect(result.applicationFeeAmount).toBe(0)
    })

    it('rounds fee amount correctly (5% of 999 → 50 cents)', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_round',
        userId: 'owner_round',
        isPlatformAccount: false,
        stripeAccountId: 'acct_round',
        email: 'r@example.com',
        businessName: 'Round Biz',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
      })

      // 5% of 999 = 49.95 -> rounds to 50
      const result = await resolveConnectFee('app_round', 999)
      expect(result.applicationFeeAmount).toBe(50)
    })
  })

  // ------------------------------------------------------------------
  // Cross-application isolation
  // ------------------------------------------------------------------
  describe('Cross-application isolation', () => {
    it('does not leak another Application account when the id does not match', async () => {
      await ConnectedAccountModel.create({
        applicationId: 'app_a',
        userId: 'owner_a',
        isPlatformAccount: false,
        stripeAccountId: 'acct_a',
        email: 'a@example.com',
        businessName: 'A Biz',
        status: 'active',
        chargesEnabled: true,
        payoutsEnabled: true,
      })

      const result = await resolveConnectFee('app_b_does_not_exist', 10000)
      expect(result.isConnect).toBe(false)
      expect(result.stripeAccountId).toBeUndefined()
    })
  })
})
