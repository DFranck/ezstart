import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import { getProvider, getStripeInstance } from '../../services/stripe.js'
import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const createPortalSessionRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createPortalSessionRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const portalSessionResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  url: z.string().url().optional().describe('Stripe Customer Portal URL'),
  error: z.string().optional().describe('Error message if operation failed'),
})

// ========================================
// Route Handler
// ========================================

const createPortalSessionHandler = async (req: Request, res: Response) => {
  try {
    const { returnUrl } = req.body as { returnUrl?: string }
    const provider = getProvider()
    const stripe = getStripeInstance()

    if (!provider.createPortalSession || !stripe) {
      return sendError(res, 'Customer portal is not available (Stripe not configured)', 501)
    }

    // Find the Stripe customer ID:
    // 1. Try from existing payments with customerEmail
    // 2. Fall back to Stripe customer search by email
    let customerId: string | undefined

    const userEmail = req.user?.email
    if (!userEmail) {
      return sendError(res, 'User email is required to access the customer portal', 400)
    }

    // Look up the customer in Stripe by email
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 })
    customerId = customers.data[0]?.id

    if (!customerId) {
      return sendError(
        res,
        'No Stripe customer found for this account. You need at least one payment to access the portal.',
        404
      )
    }

    // Determine return URL
    const portalReturnUrl = returnUrl || req.headers.referer || req.headers.origin || ''

    if (!portalReturnUrl) {
      return sendError(res, 'Return URL is required', 400)
    }

    const session = await provider.createPortalSession(customerId, portalReturnUrl)

    logger.info(`🔗 Portal session created for customer ${customerId} (user: ${req.userId})`)

    sendSuccess(res, { url: session.url })
  } catch (error) {
    logger.error('Create portal session error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create portal session')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post(
  '/portal/session',
  authMiddleware,
  populateUserFromToken,
  createPortalSessionHandler,
  {
    summary: 'Create a Stripe Customer Portal session for subscription management',
    tags: ['Portal'],
    responseSchema: portalSessionResponseSchema,
  }
)

export { createPortalSessionRegistry as registry, router }
export default router
