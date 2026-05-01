/**
 * Pure Connect fee math.
 *
 * Computes the destination-charge / application-fee values for a checkout
 * routed through Stripe Connect. This module is **pure** — no DB lookups, no
 * provider calls, no env reading. The consumer (ezpay today) loads the
 * `ConnectedAccount` + active subscription plan and passes the resolved
 * `feePercent` to this function, which returns both:
 *
 *   - `applicationFeeAmount` — cents — for one-shot checkouts
 *     (`payment_intent_data.application_fee_amount`)
 *   - `applicationFeePercent` — `[0, 100]` — for subscriptions
 *     (`subscription_data.application_fee_percent`)
 *
 * Splitting the math out of the DB lookup makes it trivially testable and
 * lets future payment services (ezbill recurring, in-app credits, etc.)
 * reuse the same fee model without forking ezpay-internal code.
 *
 * @module @ezstart/pay-sdk/server/connect-fee
 */
import 'server-only'

/** Result of `computeConnectFee` — both cents- and percent-based fees. */
export interface ConnectFeeAmounts {
  /**
   * Application fee in cents — forward to Stripe as `application_fee_amount`
   * for one-shot checkouts (donations, purchases, invoices). Always
   * non-negative; floored to integer cents via `Math.round`.
   */
  applicationFeeAmount: number
  /**
   * Application fee as a percentage in `[0, 100]` — forward to Stripe as
   * `application_fee_percent` for subscriptions. Stripe applies it to every
   * invoice automatically, so it's preferred over the cents form for
   * recurring charges.
   */
  applicationFeePercent: number
}

/** Options for `computeConnectFee`. */
export interface ComputeConnectFeeOptions {
  /**
   * Base checkout amount in cents (the gross amount the customer pays). Negative
   * values are clamped to 0 — guards against caller bugs that would otherwise
   * generate a negative `application_fee_amount` (Stripe rejects that with a
   * cryptic 400).
   */
  baseAmountCents: number
  /**
   * Platform fee percentage in `[0, 100]`. Typically resolved from the
   * Application owner's active subscription plan (Starter 5%, Growth 3%,
   * Enterprise 1.5%, ...). Negative values clamp to 0; values > 100 clamp to 100.
   */
  feePercent: number
}

/**
 * Compute the application fee for a Connect destination charge.
 *
 * Pure — same inputs always produce the same output. No I/O. Returns 0 fees
 * when either `baseAmountCents` or `feePercent` is 0 (or negative — clamped).
 *
 * @example
 * computeConnectFee({ baseAmountCents: 1000, feePercent: 5 })
 * // → { applicationFeeAmount: 50, applicationFeePercent: 5 }
 *
 * @example
 * // Subscription — pass the percent to Stripe as application_fee_percent
 * const { applicationFeePercent } = computeConnectFee({
 *   baseAmountCents: amount * 100,
 *   feePercent: plan.feePercent,
 * })
 * await stripe.subscriptions.create({
 *   ...,
 *   application_fee_percent: applicationFeePercent,
 * })
 */
export function computeConnectFee(opts: ComputeConnectFeeOptions): ConnectFeeAmounts {
  const safeAmount = Math.max(0, opts.baseAmountCents)
  const safePercent = Math.max(0, Math.min(100, opts.feePercent))
  const applicationFeeAmount = Math.round((safeAmount * safePercent) / 100)
  return {
    applicationFeeAmount,
    applicationFeePercent: safePercent,
  }
}
