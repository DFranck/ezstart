import { getPromoModel, type PromoDocument } from '../models/Promo.js'

export interface PromoValidationResult {
  valid: boolean
  reason?: string
  promo?: PromoDocument
}

export interface DiscountResult {
  originalAmount: number
  discountedAmount: number
  discountApplied: number
}

/**
 * Validate a promo code for a given app.
 * Checks: exists, active, not expired, usage limit not reached.
 */
export async function validatePromo(code: string, appName: string): Promise<PromoValidationResult> {
  const Promo = await getPromoModel()

  const promo = await Promo.findOne({
    code: code.toUpperCase().trim(),
    appName,
  })

  if (!promo) {
    return { valid: false, reason: 'Promo code not found' }
  }

  if (!promo.active) {
    return { valid: false, reason: 'Promo code is no longer active' }
  }

  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { valid: false, reason: 'Promo code has expired' }
  }

  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return { valid: false, reason: 'Promo code usage limit reached' }
  }

  return { valid: true, promo }
}

/**
 * Calculate the discount for a given amount.
 * - percent: discountValue is the percentage (e.g. 20 = 20%)
 * - fixed: discountValue is the amount in minor units (e.g. 500 = 5.00)
 * Returns at minimum 0 (never negative).
 */
export function calculateDiscount(amount: number, promo: PromoDocument): DiscountResult {
  let discountApplied: number

  if (promo.discountType === 'percent') {
    discountApplied = Math.round(amount * (promo.discountValue / 100))
  } else {
    // Fixed discount
    discountApplied = promo.discountValue
  }

  // Never discount more than the total amount
  discountApplied = Math.min(discountApplied, amount)

  return {
    originalAmount: amount,
    discountedAmount: amount - discountApplied,
    discountApplied,
  }
}

/**
 * Atomically claim one redemption of a promo code.
 *
 * Increments `usedCount` ONLY if the promo still has capacity. The check
 * (`usedCount < maxUses`) and the increment happen in a single atomic
 * `findOneAndUpdate` — there is no read-then-write window, so concurrent
 * redemptions of a `maxUses: 1` promo cannot both succeed (TOCTOU-safe).
 *
 * - When `maxUses` is set, the update matches `{ _id, usedCount: { $lt: maxUses } }`.
 *   If the promo is already exhausted the filter matches nothing and the call
 *   returns `false` (no increment performed) — the caller must reject the
 *   redemption.
 * - When `maxUses` is unset/null (unlimited), the increment is unconditional
 *   and always returns `true`.
 *
 * @param promoId - Mongo `_id` of the promo to redeem.
 * @returns `true` if a redemption was atomically claimed, `false` if the promo
 *   was already at its usage limit (over-redemption prevented).
 */
export async function incrementUsage(promoId: string): Promise<boolean> {
  const Promo = await getPromoModel()

  // Unlimited promos (no maxUses): unconditional atomic increment.
  // We use $expr so the same single-statement guard also covers the
  // bounded case below — `$lt: ['$usedCount', '$maxUses']` is evaluated
  // server-side against the live document, never a stale read.
  const updated = await Promo.findOneAndUpdate(
    {
      _id: promoId,
      $or: [
        { maxUses: { $in: [null, undefined] } },
        { $expr: { $lt: ['$usedCount', '$maxUses'] } },
      ],
    },
    { $inc: { usedCount: 1 } },
    { new: true }
  )

  // No document returned → either the promo doesn't exist OR it was already
  // at its usage limit. Both mean: redemption NOT claimed.
  return updated !== null
}
