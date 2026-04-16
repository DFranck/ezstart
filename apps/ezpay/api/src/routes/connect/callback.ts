import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { getStripeInstance } from '../../services/stripe-connect.js'
import type { Request, Response, Router as ExpressRouter } from 'express'

const router: ExpressRouter = Router()

// ========================================
// Route Handler
// ========================================

/**
 * GET /api/connect/callback
 * Stripe redirects here after onboarding. Updates the connected account status.
 */
router.get('/connect/callback', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.account_id as string | undefined

    if (!accountId) {
      return sendError(res, 'Missing account_id query parameter', 400)
    }

    const stripe = getStripeInstance()
    const account = await stripe.accounts.retrieve(accountId)

    const ConnectedAccount = await getConnectedAccountModel()

    const status = resolveAccountStatus(
      account.charges_enabled ?? false,
      account.payouts_enabled ?? false,
      account.details_submitted ?? false
    )

    await ConnectedAccount.updateOne(
      { stripeAccountId: accountId },
      {
        status,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        ...(status === 'active' ? { onboardedAt: new Date() } : {}),
      }
    )

    logger.info(`Connect callback: ${accountId} → ${status}`)

    sendSuccess(res, {
      stripeAccountId: accountId,
      status,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
    })
  } catch (error) {
    logger.error('Connect callback error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to process callback')
  }
})

// ========================================
// Helpers
// ========================================

function resolveAccountStatus(
  chargesEnabled: boolean,
  payoutsEnabled: boolean,
  detailsSubmitted: boolean
): 'active' | 'restricted' | 'pending' {
  if (chargesEnabled && payoutsEnabled) return 'active'
  if (detailsSubmitted) return 'restricted'
  return 'pending'
}

export { router }
