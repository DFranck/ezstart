/**
 * Stripe ↔ Plan sync service.
 *
 * EZPay Plans are the source of truth for subscription tiers; Stripe mirrors
 * them as `Product` + `Price` pairs. The API publishes a Plan to Stripe via
 * {@link syncPlanToStripe}, archives a deleted Plan via
 * {@link archivePlanInStripe}, and re-prices on mutation via
 * {@link repriceStripePlan} (Stripe Prices are immutable — we archive the
 * old price and create a new one).
 *
 * All writes use deterministic `idempotencyKey`s so replaying the same CRUD
 * operation never duplicates Stripe entities.
 *
 * @module apps/ezpay/api/src/services/stripe-plan-sync
 */

import { logger } from '@ezstart/logger/server'
import { getStripeInstance } from './stripe-connect.js'
import type { PlanDocument } from '../models/Plan.js'

export interface StripeSyncResult {
  stripeProductId: string
  stripePriceId: string
}

/**
 * Snapshot of the immutable price-defining fields from a previous Plan
 * revision. Used by {@link repriceStripePlan} to build a unique
 * idempotencyKey when creating the replacement Price.
 */
export interface PlanPriceSnapshot {
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
}

/** Narrow the expected interval union without relying on structural typing. */
type PlanInterval = 'month' | 'year'

function toStripeInterval(interval: string | undefined): PlanInterval {
  return interval === 'year' ? 'year' : 'month'
}

/**
 * Create (or re-create idempotently) the Stripe `Product` and `Price` that
 * mirror a Plan. Safe to call multiple times with the same Plan id thanks to
 * the deterministic idempotency keys.
 *
 * @example
 * const plan = await Plan.create({...})
 * const { stripeProductId, stripePriceId } = await syncPlanToStripe(plan)
 * plan.stripeProductId = stripeProductId
 * plan.stripePriceId = stripePriceId
 * await plan.save()
 */
export async function syncPlanToStripe(plan: PlanDocument): Promise<StripeSyncResult> {
  const stripe = getStripeInstance()
  const planId = String(plan._id)

  const product = await stripe.products.create(
    {
      name: plan.name,
      description: plan.description,
      metadata: {
        planId,
        applicationId: plan.applicationId,
      },
    },
    { idempotencyKey: `plan-product-${planId}` }
  )

  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: plan.amount,
      currency: plan.currency.toLowerCase(),
      recurring: {
        interval: toStripeInterval(plan.interval),
        interval_count: plan.intervalCount,
      },
      metadata: {
        planId,
      },
    },
    {
      idempotencyKey: `plan-price-${planId}-${plan.amount}-${plan.currency.toLowerCase()}-${plan.interval}-${plan.intervalCount}`,
    }
  )

  return { stripeProductId: product.id, stripePriceId: price.id }
}

/**
 * Archive the Stripe Product + Price mirroring a Plan. Silently ignores
 * missing Stripe ids so a soft-delete on a legacy Plan (without Stripe
 * linkage) is still a valid no-op. Errors are logged but not re-thrown — the
 * caller already committed the DB-side soft delete and we don't want a
 * downstream Stripe outage to block the delete response.
 */
export async function archivePlanInStripe(plan: PlanDocument): Promise<void> {
  const stripe = getStripeInstance()

  if (plan.stripePriceId) {
    try {
      await stripe.prices.update(plan.stripePriceId, { active: false })
    } catch (err) {
      logger.warn('archivePlanInStripe: failed to deactivate price', {
        planId: String(plan._id),
        priceId: plan.stripePriceId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (plan.stripeProductId) {
    try {
      await stripe.products.update(plan.stripeProductId, { active: false })
    } catch (err) {
      logger.warn('archivePlanInStripe: failed to deactivate product', {
        planId: String(plan._id),
        productId: plan.stripeProductId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

/**
 * Replace the Stripe Price for a Plan whose price-defining fields changed
 * (amount / currency / interval / intervalCount). Stripe Prices are
 * immutable — we archive the old one and create a new one tied to the same
 * Product (which may itself have its metadata updated by the caller if
 * name/description also changed).
 *
 * The idempotency key incorporates the NEW price snapshot, so the same
 * mutation always yields the same Price id on retry. A separate mutation
 * (with a different snapshot) produces a distinct Price.
 *
 * @returns The new Stripe Price id (caller must persist it on the Plan).
 * @throws If the Plan has no `stripeProductId` (nothing to reprice against).
 */
export async function repriceStripePlan(
  plan: PlanDocument,
  prev: PlanPriceSnapshot
): Promise<string> {
  const stripe = getStripeInstance()
  const planId = String(plan._id)

  if (!plan.stripeProductId) {
    throw new Error(`repriceStripePlan: plan ${planId} has no stripeProductId — cannot reprice`)
  }

  if (plan.stripePriceId) {
    try {
      await stripe.prices.update(plan.stripePriceId, { active: false })
    } catch (err) {
      logger.warn('repriceStripePlan: failed to archive previous price', {
        planId,
        priceId: plan.stripePriceId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const price = await stripe.prices.create(
    {
      product: plan.stripeProductId,
      unit_amount: plan.amount,
      currency: plan.currency.toLowerCase(),
      recurring: {
        interval: toStripeInterval(plan.interval),
        interval_count: plan.intervalCount,
      },
      metadata: {
        planId,
        previousAmount: String(prev.amount),
        previousCurrency: prev.currency.toLowerCase(),
        previousInterval: prev.interval,
        previousIntervalCount: String(prev.intervalCount),
      },
    },
    {
      idempotencyKey: `plan-price-${planId}-${plan.amount}-${plan.currency.toLowerCase()}-${plan.interval}-${plan.intervalCount}`,
    }
  )

  return price.id
}
