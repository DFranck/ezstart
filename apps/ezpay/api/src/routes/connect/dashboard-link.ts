import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { getStripeInstanceForMode } from '../../services/stripe-connect.js'
import { isStripeModeUnavailableError } from '../../services/stripe.js'
import { authJwtOrKey } from '../../middleware/unified-auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const dashboardLinkRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(dashboardLinkRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const dashboardLinkQuerySchema = z.object({
  applicationId: z
    .string()
    .min(1)
    .describe('Ezauth Application id — scopes the dashboard link to a specific Connect account'),
})

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
    const queryValidation = dashboardLinkQuerySchema.safeParse(req.query)
    if (!queryValidation.success) {
      return sendValidationError(res, 'Invalid dashboard-link query', queryValidation.error.errors)
    }

    const userId = req.userId as string
    const { applicationId } = queryValidation.data

    const ConnectedAccount = await getConnectedAccountModel()
    const account = await ConnectedAccount.findOne({ applicationId, userId }).lean()

    if (!account) {
      return sendError(res, 'No connected account found', 404)
    }

    if (account.status !== 'active') {
      return sendError(res, 'Connected account is not active. Complete onboarding first.', 400)
    }

    // Use the Stripe account matching the ConnectedAccount's own partition.
    const stripe = getStripeInstanceForMode(account.isTestMode ? 'test' : 'live')

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
    if (isStripeModeUnavailableError(error)) {
      logger.error(`Dashboard link refused — ${error.message}`)
      return sendError(res, `Payments are not available in ${error.mode} mode`, error.statusCode)
    }
    logger.error('Dashboard link error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create dashboard link')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.get('/connect/dashboard-link', authJwtOrKey(), dashboardLinkHandler, {
  summary: 'Get Stripe Express Dashboard login link for a specific Application Connect account',
  tags: ['Connect'],
  querySchema: dashboardLinkQuerySchema,
  responseSchema: dashboardLinkResponseSchema,
})

export { dashboardLinkRegistry as registry, router }
export default router
