import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { getStripeInstance } from '../../services/stripe-connect.js'
import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const dashboardLinkRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(dashboardLinkRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const dashboardLinkResponseSchema = z.object({
  success: z.boolean(),
  loginLinkUrl: z.string().optional().describe('Stripe Dashboard login link'),
  message: z.string().optional().describe('Additional info for standard accounts'),
  error: z.string().optional(),
})

// ========================================
// Route Handler
// ========================================

const dashboardLinkHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string
    const ConnectedAccount = await getConnectedAccountModel()
    const account = await ConnectedAccount.findOne({ userId }).lean()

    if (!account) {
      return sendError(res, 'No connected account found', 404)
    }

    if (account.status !== 'active') {
      return sendError(res, 'Connected account is not active. Complete onboarding first.', 400)
    }

    const stripe = getStripeInstance()

    // Express accounts use createLoginLink; Standard accounts manage their own Stripe dashboard
    if (account.accountType === 'express') {
      const loginLink = await stripe.accounts.createLoginLink(account.stripeAccountId)
      sendSuccess(res, { loginLinkUrl: loginLink.url })
    } else {
      sendSuccess(res, {
        loginLinkUrl: 'https://dashboard.stripe.com/',
        message: 'Standard accounts manage their Stripe dashboard directly',
      })
    }
  } catch (error) {
    logger.error('Dashboard link error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create dashboard link')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get(
  '/connect/dashboard-link',
  authMiddleware,
  populateUserFromToken,
  dashboardLinkHandler,
  {
    summary: 'Get Stripe Express Dashboard login link for connected account',
    tags: ['Connect'],
    responseSchema: dashboardLinkResponseSchema,
  }
)

export { dashboardLinkRegistry as registry, router }
