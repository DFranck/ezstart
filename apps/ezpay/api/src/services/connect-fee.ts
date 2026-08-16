/**
 * Connect Fee Service — ezpay-specific glue.
 *
 * Resolves whether a checkout for a given Application should route through
 * Stripe Connect and, if so, delegates the pure fee math to
 * `computeConnectFee` from `@ezstart/pay-sdk/server`.
 *
 * Flow (per request):
 *   1. Look up the ConnectedAccount for the caller's Application id.
 *      - No active + charges-enabled account → `{ isConnect: false }`
 *        (the customer pays the platform Stripe account directly, no
 *        application fee, no destination charge).
 *      - `isPlatformAccount === true` → `{ isConnect: false }` as well
 *        (dogfood skip: platform-owned apps like `ezauth`, `ezpay` etc.
 *        charge the same Stripe account that receives the money, so
 *        taking a fee from ourselves is a no-op).
 *   2. Resolve the Application owner's ACTIVE EZPay self-subscription
 *      via `resolveActiveEzpayPlan(ownerId)` to get the current fee
 *      percentage (Starter 5% fallback, Growth 3%, Enterprise 1.5% etc.).
 *   3. Forward `(baseAmountCents, feePercent)` to `computeConnectFee` and
 *      return both `applicationFeeAmount` (for one-shot donations/purchases)
 *      and `applicationFeePercent` (for Stripe subscriptions).
 *
 * The DB lookups stay here because they're ezpay-specific (`ConnectedAccount`
 * + `EzpayPlan` models live in this app). The pure math lives in pay-sdk so
 * future payment services share the exact same fee model.
 *
 * @module apps/ezpay/api/src/services/connect-fee
 */
import { logger } from '@ezstart/logger/server'
import { computeConnectFee } from '@ezstart/pay-sdk/server'
import { getConnectedAccountModel } from '../models/ConnectedAccount.js'
import { resolveActiveEzpayPlan } from './ezpay-plan-resolver.js'

export interface ConnectFeeResult {
  /** Whether the payment should be routed through Stripe Connect. */
  isConnect: boolean
  /** Destination connected account id (`acct_*`). Present when `isConnect: true`. */
  stripeAccountId?: string
  /**
   * Application fee in cents — forward to Stripe as `application_fee_amount`
   * for one-shot checkouts (donations, purchases, invoices).
   */
  applicationFeeAmount?: number
  /**
   * Application fee as a percentage in the range `[0, 100]` — forward to
   * Stripe as `application_fee_percent` for subscriptions. Preferred over
   * `applicationFeeAmount` for recurring charges since Stripe applies it to
   * every invoice automatically.
   */
  applicationFeePercent?: number
}

/**
 * Resolve the Connect fee for a checkout on behalf of the given Application.
 *
 * Returns `{ isConnect: false }` when:
 *   - No `ConnectedAccount` exists for the Application, OR
 *   - The account is not `status: 'active'` / `chargesEnabled: true`, OR
 *   - The account is a platform (dogfood) account.
 *
 * Otherwise returns the destination `acct_*` plus both cents- and
 * percent-based fees so the caller can choose which to forward.
 *
 * @param applicationId - The ezauth Application id the checkout is for.
 * @param amountInCents - Checkout amount in minor currency units (cents).
 */
export async function resolveConnectFee(
  applicationId: string,
  amountInCents: number
): Promise<ConnectFeeResult> {
  const ConnectedAccount = await getConnectedAccountModel()
  const account = await ConnectedAccount.findOne({
    applicationId,
    status: 'active',
    chargesEnabled: true,
  }).lean()

  // No active Connect account → platform charge (no fee, no destination)
  if (!account) {
    return { isConnect: false }
  }

  // Dogfood skip — platform-owned apps share the EZStart LLC Stripe account
  // with the platform itself. Taking a fee from ourselves is a no-op, so we
  // fall back to a plain platform charge.
  if (account.isPlatformAccount) {
    return { isConnect: false }
  }

  // Resolve the active EZPay plan for the Application OWNER (not the
  // end-customer paying the checkout). The owner is the one who signed up
  // to EZPay and whose plan dictates how much fee we take.
  const plan = await resolveActiveEzpayPlan(account.userId)

  // Pure fee math — defensive clamps on negative amounts / out-of-range
  // percentages live in `computeConnectFee`.
  const fees = computeConnectFee({
    baseAmountCents: amountInCents,
    feePercent: plan.feePercent,
  })

  logger.debug('connect-fee resolved', {
    applicationId,
    ownerId: account.userId,
    planName: plan.planName,
    feePercent: fees.applicationFeePercent,
    amountInCents: Math.max(0, amountInCents),
    applicationFeeAmount: fees.applicationFeeAmount,
  })

  return {
    isConnect: true,
    stripeAccountId: account.stripeAccountId,
    applicationFeeAmount: fees.applicationFeeAmount,
    applicationFeePercent: fees.applicationFeePercent,
  }
}
