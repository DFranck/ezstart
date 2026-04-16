/**
 * Connect Fee Service
 * Resolves whether a checkout should route through Stripe Connect
 * and calculates the platform fee.
 */
import { getConnectedAccountModel } from '../models/ConnectedAccount.js'

export interface ConnectFeeResult {
  /** Whether payment should be routed through Connect */
  isConnect: boolean
  /** Stripe connected account ID (acct_xxx) */
  stripeAccountId?: string
  /** Application fee in cents (for Stripe payment_intent_data) */
  applicationFeeAmount?: number
}

/**
 * Look up a connected account for the given userId and compute the platform fee.
 * Returns isConnect: false if user has no active connected account.
 *
 * @param userId - The user who owns the API key / project
 * @param amountInCents - Total checkout amount in minor currency units (cents)
 */
export async function resolveConnectFee(
  userId: string,
  amountInCents: number
): Promise<ConnectFeeResult> {
  const ConnectedAccount = await getConnectedAccountModel()
  const account = await ConnectedAccount.findOne({
    userId,
    status: 'active',
    chargesEnabled: true,
  }).lean()

  if (!account) {
    return { isConnect: false }
  }

  const feeAmount = Math.round((amountInCents * account.defaultFeePercent) / 100)

  return {
    isConnect: true,
    stripeAccountId: account.stripeAccountId,
    applicationFeeAmount: feeAmount,
  }
}
