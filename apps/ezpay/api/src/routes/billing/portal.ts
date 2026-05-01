/**
 * POST /api/billing/portal — create a Stripe Customer Portal session.
 *
 * Auth: Bearer JWT. The caller may pass an explicit `customerId`; otherwise
 * the route resolves it from the user's most recent subscription `Payment`
 * by looking up the Stripe subscription and extracting its `customer`.
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
import { getStripeInstance } from '../../services/stripe-connect.js'

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
      'Stripe customer id. When omitted, the route resolves the customer from the latest subscription payment of the authenticated user.',
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

    const stripe = getStripeInstance()

    let customerId = explicitCustomerId

    if (!customerId) {
      const Payment = await getPaymentModel()
      const latest = await Payment.findOne({
        userId,
        type: 'subscription',
        'metadata.subscriptionId': { $exists: true, $ne: null },
      })
        .sort({ createdAt: -1 })
        .lean()

      const subscriptionId = latest?.metadata?.subscriptionId
      if (!subscriptionId) {
        return sendError(res, 'No subscription found for this user', 404)
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const resolved = extractCustomerId(subscription)
        if (!resolved) {
          return sendError(res, 'No subscription found for this user', 404)
        }
        customerId = resolved
      } catch (err) {
        logger.error('Failed to retrieve Stripe subscription for portal session:', err)
        return sendError(res, 'No subscription found for this user', 404)
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl ?? resolveDefaultReturnUrl(req),
    })

    return sendSuccess(res, { url: session.url })
  } catch (error: unknown) {
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
    404: { description: 'No subscription found for this user', schema: errorResponseSchema },
    500: { description: 'Failed to create billing portal session', schema: errorResponseSchema },
  },
})

export default router
