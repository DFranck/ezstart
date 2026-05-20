/**
 * POST /api/billing/portal — create a Stripe Customer Portal session.
 *
 * Auth: Bearer JWT. The portal session is ALWAYS scoped to the authenticated
 * user: the Stripe customer is resolved server-side from the user's own
 * subscription `Payment` records (looking up the Stripe subscription and
 * extracting its `customer`). A caller MAY pass an explicit `customerId`, but
 * it is accepted ONLY when it matches one of the user's own customers —
 * otherwise the request is rejected (403). This prevents a portal-hijack where
 * an attacker passes the victim's `customerId` to open the victim's billing
 * portal (Wave E finding C-2).
 *
 * Subscriptions created via Connect `transfer_data.destination` live on the
 * platform account — the portal session is created platform-side (no
 * `Stripe-Account` header).
 *
 * @module apps/ezpay/api/src/routes/billing/portal
 */
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendError,
  sendSuccess,
  sendValidationError,
} from '@ezstart/api-core'
import Stripe from 'stripe'

import { authJwtOrKey } from '../../middleware/unified-auth.js'
import { getPaymentModel } from '../../models/Payment.js'
import { getStripeInstanceForRequest } from '../../services/stripe-connect.js'
import { isStripeModeUnavailableError } from '../../services/stripe.js'

export const billingPortalRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(billingPortalRegistry, router)

// ----------------------------------------------------------------------------
// Zod schemas
// ----------------------------------------------------------------------------

const billingPortalBodySchema = z.object({
  returnUrl: z
    .string()
    .url()
    .optional()
    .openapi({ description: 'URL the customer is redirected to after leaving the portal' }),
  customerId: z.string().min(1).optional().openapi({
    description:
      'Stripe customer id. Accepted ONLY when it belongs to the authenticated user (verified server-side). When omitted, the route resolves the customer from the latest subscription payment of the authenticated user.',
  }),
})

const billingPortalResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    url: z.string().url().describe('Stripe-hosted portal URL — redirect the user there'),
  }),
})

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Upper bound on the number of subscription → Stripe customer lookups we
 * perform when resolving the authenticated user's owned customer ids. Keeps
 * the ownership check bounded even for users with many historical
 * subscriptions; the most recent ones are checked first.
 */
const MAX_SUBSCRIPTION_LOOKUPS = 10

/** Default return URL when none is provided by the caller. */
function resolveDefaultReturnUrl(req: Request): string {
  const origin = req.headers.origin
  if (typeof origin === 'string' && origin.length > 0) return origin
  const referer = req.headers.referer
  if (typeof referer === 'string' && referer.length > 0) return referer
  return 'https://ezstart.dev'
}

/**
 * Extract the Stripe customer id from a subscription object regardless of the
 * expansion state returned by the Stripe SDK.
 */
function extractCustomerId(subscription: Stripe.Subscription): string | null {
  const customer = subscription.customer
  if (typeof customer === 'string') return customer
  if (customer && typeof customer === 'object' && 'id' in customer) return customer.id
  return null
}

/**
 * Resolve the Stripe customer ids that belong to the authenticated user, in
 * recency order (latest subscription first). The set is derived ONLY from the
 * user's own subscription `Payment` records — never from the request body —
 * so it is the authoritative ownership boundary for the portal.
 *
 * At most {@link MAX_SUBSCRIPTION_LOOKUPS} Stripe lookups are performed to
 * bound the cost; the first resolved id is the user's primary customer.
 *
 * @internal
 */
async function resolveOwnedCustomerIds(stripe: Stripe, userId: string): Promise<string[]> {
  const Payment = await getPaymentModel()
  const subscriptions = await Payment.find({
    userId,
    type: 'subscription',
    'metadata.subscriptionId': { $exists: true, $ne: null },
  })
    .sort({ createdAt: -1 })
    .limit(MAX_SUBSCRIPTION_LOOKUPS)
    .lean()

  const customerIds: string[] = []
  for (const payment of subscriptions) {
    const subscriptionId = payment.metadata?.subscriptionId
    if (!subscriptionId) continue
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const resolved = extractCustomerId(subscription)
      if (resolved && !customerIds.includes(resolved)) {
        customerIds.push(resolved)
      }
    } catch (err) {
      logger.warn('Failed to retrieve Stripe subscription while resolving owned customers', {
        subscriptionId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return customerIds
}

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

const billingPortalController = async (req: Request, res: Response) => {
  try {
    const parsed = billingPortalBodySchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid request body', parsed.error.issues)
    }

    const userId = req.userId
    if (!userId) {
      return sendError(res, 'Authentication required', 401)
    }

    const { returnUrl, customerId: explicitCustomerId } = parsed.data

    // Resolve the Stripe account for the caller's derived mode — the portal
    // for a test subscription opens on the test account, never the live one.
    const stripe = getStripeInstanceForRequest(req)

    // The customer is ALWAYS resolved from the authenticated user's own
    // subscriptions — never trusted from the request body. This is the
    // ownership boundary that prevents a portal hijack.
    const ownedCustomerIds = await resolveOwnedCustomerIds(stripe, userId)
    if (ownedCustomerIds.length === 0) {
      return sendError(res, 'No subscription found for this user', 404)
    }

    let customerId: string
    if (explicitCustomerId) {
      // An explicit customerId is honoured ONLY when it belongs to the
      // authenticated user. Otherwise the caller is attempting to open
      // someone else's portal — reject.
      if (!ownedCustomerIds.includes(explicitCustomerId)) {
        return sendError(res, 'Customer does not belong to the authenticated user', 403)
      }
      customerId = explicitCustomerId
    } else {
      // Default: the user's most recent subscription customer.
      customerId = ownedCustomerIds[0] as string
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl ?? resolveDefaultReturnUrl(req),
    })

    return sendSuccess(res, { url: session.url })
  } catch (error: unknown) {
    if (isStripeModeUnavailableError(error)) {
      logger.error(`Billing portal refused — ${error.message}`)
      return sendError(res, `Payments are not available in ${error.mode} mode`, error.statusCode)
    }
    logger.error('Billing portal session error:', error)
    return sendError(res, 'Failed to create billing portal session', 500)
  }
}

docRouter.post('/portal', authJwtOrKey(), billingPortalController, {
  summary: 'Create a Stripe Customer Portal session for the authenticated user',
  tags: ['Billing'],
  bodySchema: billingPortalBodySchema,
  responseSchema: billingPortalResponseSchema,
  extraResponses: {
    400: { description: 'Validation error', schema: errorResponseSchema },
    401: { description: 'Authentication required', schema: errorResponseSchema },
    403: {
      description: 'Customer does not belong to the authenticated user',
      schema: errorResponseSchema,
    },
    404: { description: 'No subscription found for this user', schema: errorResponseSchema },
    500: { description: 'Failed to create billing portal session', schema: errorResponseSchema },
  },
})

export default router
