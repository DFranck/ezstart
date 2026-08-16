import { logger } from '@ezstart/logger/server'
import { Router, sendError } from '@ezstart/api-core'
import { getWebUrl } from '@ezstart/config'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { getStripeInstanceForMode } from '../../services/stripe-connect.js'
import { isStripeModeUnavailableError } from '../../services/stripe.js'
import { verifyConnectState, ConnectStateError } from '../../utils/connect-state.js'
import type { Request, Response, Router as ExpressRouter } from 'express'

const router: ExpressRouter = Router()

// Locales supported by the ezpay web app. Keep in sync with
// `apps/ezpay/web/src/i18n/locales.ts`. Using a conservative allow-list
// avoids open-redirect / locale-injection vectors on the query string.
const SUPPORTED_LOCALES = ['en', 'fr'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function resolveLocale(raw: unknown): SupportedLocale {
  if (typeof raw === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return raw as SupportedLocale
  }
  return 'en'
}

// ========================================
// Route Handler
// ========================================

/**
 * GET /api/connect/callback
 *
 * Stripe redirects here after onboarding (both `return_url` and `refresh_url`
 * point to this endpoint). The caller must present a signed `state` query
 * param that was minted by `POST /api/connect/onboard` — without it, an
 * attacker could burn Stripe quota and enumerate `stripeAccountId →
 * applicationId` mappings through the 302 `Location` header.
 *
 * On success we refresh the ConnectedAccount's status from the Stripe account
 * object, then 302-redirect the end user back to the EZPay web UI (the
 * per-Application Connect page) so they land on a real dashboard instead of
 * seeing the raw JSON envelope.
 */
router.get('/connect/callback', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.account_id as string | undefined
    const rawState = req.query.state

    if (!accountId) {
      return sendError(res, 'Missing account_id query parameter', 400)
    }

    // Verify signed state FIRST — before any Stripe API call. This makes the
    // endpoint self-authenticating: only the holder of a state minted in the
    // last hour by `/connect/onboard` can reach the Stripe.retrieve below,
    // which prevents forged calls from burning quota or leaking mappings.
    if (typeof rawState !== 'string' || rawState.length === 0) {
      return sendError(res, 'Invalid or missing state', 400)
    }
    let trustedApplicationId: string
    try {
      const decoded = verifyConnectState(rawState)
      trustedApplicationId = decoded.applicationId
    } catch (err) {
      if (err instanceof ConnectStateError) {
        return sendError(res, 'Invalid or missing state', 400)
      }
      throw err
    }

    const ConnectedAccount = await getConnectedAccountModel()

    // Resolve the ConnectedAccount's own partition mode FIRST — this callback
    // is a Stripe redirect with no API key, so we cannot derive the mode from
    // the request. Retrieve the account from the Stripe account (test vs live)
    // that actually owns it; fail-closed when that mode's key is unavailable.
    const ownerRow = await ConnectedAccount.findOne({
      stripeAccountId: accountId,
      applicationId: trustedApplicationId,
    }).lean()
    if (!ownerRow) {
      return sendError(res, 'Invalid or missing state', 400)
    }
    const stripe = getStripeInstanceForMode(ownerRow.isTestMode ? 'test' : 'live')
    const account = await stripe.accounts.retrieve(accountId)

    const status = resolveAccountStatus(
      account.charges_enabled ?? false,
      account.payouts_enabled ?? false,
      account.details_submitted ?? false
    )

    // Update the account scoped by BOTH applicationId (from trusted state)
    // AND stripeAccountId. This prevents a valid state for app A from being
    // used to update a ConnectedAccount that belongs to app B.
    const updated = await ConnectedAccount.findOneAndUpdate(
      { stripeAccountId: accountId, applicationId: trustedApplicationId },
      {
        status,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        ...(status === 'active' ? { onboardedAt: new Date() } : {}),
      },
      { new: true }
    ).lean()

    if (!updated) {
      // Fallback: look up by stripeAccountId alone to surface a diagnostic
      // warning. If the row exists but its applicationId differs from the
      // state, an attacker may be replaying a legitimate state for a
      // different account — log and bail out without redirecting into the
      // app scope controlled by the state, to avoid giving attackers a
      // mapping primitive.
      const existing = await ConnectedAccount.findOne({ stripeAccountId: accountId }).lean()
      if (existing && existing.applicationId !== trustedApplicationId) {
        logger.warn(
          `Connect callback: state/DB applicationId mismatch — state=${trustedApplicationId} db=${existing.applicationId} account=${accountId}`
        )
      }
      return sendError(res, 'Invalid or missing state', 400)
    }

    logger.info(`Connect callback: ${accountId} → ${status}`)

    // Redirect to the per-Application Connect page in the EZPay web app so
    // the user sees an actual UI (toast + fresh status card) instead of the
    // JSON envelope.
    const locale = resolveLocale(req.query.locale)
    const redirectStatus: 'complete' | 'refresh' = status === 'active' ? 'complete' : 'refresh'
    const webBase = getWebUrl('ezpay')
    const target = `${webBase}/${locale}/developer/applications/${trustedApplicationId}/connect?status=${redirectStatus}`

    return res.redirect(302, target)
  } catch (error) {
    if (isStripeModeUnavailableError(error)) {
      logger.error(`Connect callback refused — ${error.message}`)
      return sendError(res, `Payments are not available in ${error.mode} mode`, error.statusCode)
    }
    logger.error('Connect callback error:', error instanceof Error ? error : String(error))
    return sendError(res, error instanceof Error ? error.message : 'Failed to process callback')
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
