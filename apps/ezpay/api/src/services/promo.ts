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
export async function validatePromo(
  code: string,
  appName: string
): Promise<PromoValidationResult> {
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
 * Increment the usage counter for a promo code.
 */
export async function incrementUsage(promoId: string): Promise<void> {
  const Promo = await getPromoModel()
  await Promo.findByIdAndUpdate(promoId, { $inc: { usedCount: 1 } })
}
