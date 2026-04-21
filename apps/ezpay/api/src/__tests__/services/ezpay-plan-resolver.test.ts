/**
 * EZPay Plan Resolver tests (Phase C — active subscription lookup).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getPaymentModel, type PaymentDocument } from '../../models/Payment.js'
import { getPlanModel, type PlanDocument } from '../../models/Plan.js'
import { resolveActiveEzpayPlan } from '../../services/ezpay-plan-resolver.js'
import type { Model } from 'mongoose'

describe('resolveActiveEzpayPlan', () => {
  let PaymentModel: Model<PaymentDocument>
  let PlanModel: Model<PlanDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    PaymentModel = await getPaymentModel()
    PlanModel = await getPlanModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await PaymentModel.deleteMany({})
    await PlanModel.deleteMany({})
  })

  it('returns Starter fallback (5%) when user has no EZPay subscription at all', async () => {
    const result = await resolveActiveEzpayPlan('user_no_sub')
    expect(result.planId).toBeNull()
    expect(result.planName).toBe('Starter')
    expect(result.feePercent).toBe(5)
  })

  it('returns Starter fallback when userId is empty string', async () => {
    const result = await resolveActiveEzpayPlan('')
    expect(result.planName).toBe('Starter')
    expect(result.feePercent).toBe(5)
  })

  it('returns Growth plan fee when user has an active Growth subscription', async () => {
    const plan = await PlanModel.create({
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
      userId: 'user_growth',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_growth_plan',
      status: 'completed',
      liveMode: false,
      metadata: { planId: String(plan._id), planName: 'Growth' },
    })

    const result = await resolveActiveEzpayPlan('user_growth')
    expect(result.planId).toBe(String(plan._id))
    expect(result.planName).toBe('Growth')
    expect(result.feePercent).toBe(3)
  })

  it('returns Enterprise plan fee with fractional percent', async () => {
    const plan = await PlanModel.create({
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
      userId: 'user_ent',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_ent_plan',
      status: 'completed',
      liveMode: false,
      metadata: { planId: String(plan._id), planName: 'Enterprise' },
    })

    const result = await resolveActiveEzpayPlan('user_ent')
    expect(result.feePercent).toBe(1.5)
    expect(result.planName).toBe('Enterprise')
  })

  it('falls back to Starter when subscription is cancelled and the period has already ended', async () => {
    const plan = await PlanModel.create({
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
      userId: 'user_lapsed',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_lapsed',
      status: 'completed',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
      liveMode: false,
      metadata: { planId: String(plan._id), planName: 'Growth' },
    })

    const result = await resolveActiveEzpayPlan('user_lapsed')
    expect(result.planName).toBe('Starter')
    expect(result.feePercent).toBe(5)
    expect(result.planId).toBeNull()
  })

  it('keeps the paid plan when cancelled but period still in the future', async () => {
    const plan = await PlanModel.create({
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
      userId: 'user_future_cancel',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_future_cancel',
      status: 'completed',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
      liveMode: false,
      metadata: { planId: String(plan._id), planName: 'Growth' },
    })

    const result = await resolveActiveEzpayPlan('user_future_cancel')
    expect(result.feePercent).toBe(3)
    expect(result.planName).toBe('Growth')
  })

  it('falls back to Starter when planId in Payment references a deleted Plan', async () => {
    await PaymentModel.create({
      projectId: 'ezpay',
      projectName: 'EZPay',
      type: 'subscription',
      amount: 49,
      currency: 'EUR',
      userId: 'user_dangling',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_dangling',
      status: 'completed',
      liveMode: false,
      metadata: {
        planId: '507f1f77bcf86cd799439011', // non-existent
        planName: 'Growth',
      },
    })

    const result = await resolveActiveEzpayPlan('user_dangling')
    expect(result.planName).toBe('Starter')
    expect(result.feePercent).toBe(5)
  })

  it('falls back to Starter when Plan has no metadata.feePercent set', async () => {
    const plan = await PlanModel.create({
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
      userId: 'user_no_meta',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_no_meta',
      status: 'completed',
      liveMode: false,
      metadata: { planId: String(plan._id), planName: plan.name },
    })

    const result = await resolveActiveEzpayPlan('user_no_meta')
    expect(result.planName).toBe('Starter')
    expect(result.feePercent).toBe(5)
  })

  it('falls back to Starter when the Payment has no planId metadata', async () => {
    await PaymentModel.create({
      projectId: 'ezpay',
      projectName: 'EZPay',
      type: 'subscription',
      amount: 49,
      currency: 'EUR',
      userId: 'user_no_planid',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_no_planid',
      status: 'completed',
      liveMode: false,
      metadata: { planName: 'Growth' },
    })

    const result = await resolveActiveEzpayPlan('user_no_planid')
    expect(result.planName).toBe('Starter')
    expect(result.feePercent).toBe(5)
  })

  it('ignores subscriptions for other projects (not ezpay self-sub)', async () => {
    const plan = await PlanModel.create({
      name: 'Pro',
      applicationId: 'app_ezbill_self',
      amount: 999,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
      active: true,
      metadata: { feePercent: 2 },
    })

    // User pays for an ezbill subscription — NOT an ezpay self-subscription
    await PaymentModel.create({
      projectId: 'ezbill',
      projectName: 'EZBill',
      type: 'subscription',
      amount: 9.99,
      currency: 'EUR',
      userId: 'user_ezbill_customer',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_ezbill_sub',
      status: 'completed',
      liveMode: false,
      metadata: { planId: String(plan._id), planName: 'Pro' },
    })

    const result = await resolveActiveEzpayPlan('user_ezbill_customer')
    expect(result.planName).toBe('Starter')
    expect(result.feePercent).toBe(5)
  })

  it('ignores non-completed subscriptions', async () => {
    const plan = await PlanModel.create({
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
      userId: 'user_pending',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_pending_sub',
      status: 'pending', // still pending, not completed
      liveMode: false,
      metadata: { planId: String(plan._id), planName: 'Growth' },
    })

    const result = await resolveActiveEzpayPlan('user_pending')
    expect(result.planName).toBe('Starter')
    expect(result.feePercent).toBe(5)
  })

  it('picks the latest subscription when multiple exist', async () => {
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

    await PaymentModel.create({
      projectId: 'ezpay',
      projectName: 'EZPay',
      type: 'subscription',
      amount: 0,
      currency: 'EUR',
      userId: 'user_multi',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_multi_old',
      status: 'completed',
      liveMode: false,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      metadata: { planId: String(starter._id), planName: 'Starter' },
    })

    await PaymentModel.create({
      projectId: 'ezpay',
      projectName: 'EZPay',
      type: 'subscription',
      amount: 199,
      currency: 'EUR',
      userId: 'user_multi',
      isAnonymous: false,
      provider: 'stripe',
      paymentId: 'cs_multi_new',
      status: 'completed',
      liveMode: false,
      metadata: { planId: String(enterprise._id), planName: 'Enterprise' },
    })

    const result = await resolveActiveEzpayPlan('user_multi')
    expect(result.planName).toBe('Enterprise')
    expect(result.feePercent).toBe(1.5)
  })
})
