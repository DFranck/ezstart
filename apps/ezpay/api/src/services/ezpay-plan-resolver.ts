/**
 * EZPay Self-Subscription Plan Resolver
 *
 * Given a userId (EZPay customer / Application owner), resolve the EZPay
 * subscription plan they are CURRENTLY ACTIVE on. Used by the connect-fee
 * service to pick the right `application_fee_percent` for Connect
 * destination charges.
 *
 * The resolution logic :
 *   1. Find the latest `completed` subscription Payment for the user where
 *      `projectId === 'ezpay'` (EZPay dogfood — the user is paying US).
 *   2. If none found → fallback to **Starter** (free tier, 5% fee).
 *   3. If the latest subscription has been cancelled (`cancelAtPeriodEnd`)
 *      AND `currentPeriodEnd` has already elapsed → fallback to **Starter**.
 *   4. Look up the `Plan` document via `metadata.planId` on that Payment.
 *      If the Plan row is missing or has no `metadata.feePercent` → fallback
 *      to **Starter**.
 *   5. Otherwise, return the Plan's `{ planId, planName, feePercent }`.
 *
 * The Starter fallback at every failure path ensures that fee calculation
 * cannot fail — we'll always produce a non-zero percentage (5% worst case)
 * so a connected creator never gets a free ride by having a corrupted
 * Payment or missing Plan row.
 *
 * @module apps/ezpay/api/src/services/ezpay-plan-resolver
 */
import { logger } from '@ezstart/logger/server'
import { getPaymentModel } from '../models/Payment.js'
import { getPlanModel } from '../models/Plan.js'

/** Slug of the EZPay self-subscription Application — projectId on Payments. */
const EZPAY_PROJECT_ID = 'ezpay'

/** Fee percent applied to the free Starter tier. */
const STARTER_FEE_PERCENT = 5

export interface ActiveEzpayPlan {
  /** MongoDB `_id` of the Plan document (`null` for the free fallback). */
  planId: string | null
  /** Display name — `'Starter'`, `'Growth'`, `'Enterprise'` for the canonical 3. */
  planName: string
  /**
   * Application fee percentage in `[0, 100]` charged on Connect
   * transactions owned by this user.
   */
  feePercent: number
}

const STARTER_FALLBACK: ActiveEzpayPlan = {
  planId: null,
  planName: 'Starter',
  feePercent: STARTER_FEE_PERCENT,
}

/**
 * Resolve the currently active EZPay plan for a given user.
 *
 * Falls back to `Starter` (5%) when no active paid subscription exists, when
 * the latest one has lapsed, or when the underlying Plan row is missing its
 * metadata. This function NEVER throws — a resolution failure logs a debug
 * line and returns the Starter fallback.
 *
 * @param userId - The EZPay customer / Application owner id.
 */
export async function resolveActiveEzpayPlan(userId: string): Promise<ActiveEzpayPlan> {
  if (!userId) {
    return STARTER_FALLBACK
  }

  const Payment = await getPaymentModel()

  // Latest completed EZPay self-subscription for this user.
  const latest = await Payment.findOne({
    userId,
    projectId: EZPAY_PROJECT_ID,
    type: 'subscription',
    status: 'completed',
  })
    .sort({ createdAt: -1 })
    .lean()

  if (!latest) {
    return STARTER_FALLBACK
  }

  // Cancellation check — if the user cancelled AND the current billing
  // period has already ended, they're no longer on the paid plan.
  if (
    latest.cancelAtPeriodEnd &&
    latest.currentPeriodEnd &&
    new Date(latest.currentPeriodEnd) < new Date()
  ) {
    return STARTER_FALLBACK
  }

  const planId = latest.metadata?.planId
  if (!planId) {
    logger.debug('ezpay-plan-resolver: latest subscription has no planId metadata', {
      userId,
      paymentId: String(latest._id),
    })
    return STARTER_FALLBACK
  }

  const Plan = await getPlanModel()
  const plan = await Plan.findById(planId).lean()

  if (!plan) {
    logger.debug('ezpay-plan-resolver: referenced Plan no longer exists', {
      userId,
      planId,
    })
    return STARTER_FALLBACK
  }

  const feePercent = plan.metadata?.feePercent
  if (typeof feePercent !== 'number') {
    logger.debug('ezpay-plan-resolver: Plan has no metadata.feePercent, falling back', {
      userId,
      planId,
      planName: plan.name,
    })
    return STARTER_FALLBACK
  }

  return {
    planId: String(plan._id),
    planName: plan.name,
    feePercent,
  }
}
