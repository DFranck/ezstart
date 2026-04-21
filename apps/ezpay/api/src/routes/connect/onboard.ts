import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getApiUrl } from '@ezstart/config'
import { getConnectedAccountModel } from '../../models/ConnectedAccount.js'
import { getStripeInstance } from '../../services/stripe-connect.js'
import { getApplication } from '../../services/ezauth-client.js'
import { authMiddleware, populateUserFromToken, isAdminUser } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import type Stripe from 'stripe'
import { z } from 'zod'

export const onboardRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(onboardRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const onboardBodySchema = z.object({
  applicationId: z
    .string()
    .min(1)
    .describe('Ezauth Application id this Connect account will be scoped to'),
  email: z.string().email().describe('Business email for the connected account'),
  businessName: z.string().min(1).describe('Business or individual name'),
  type: z
    .enum(['standard', 'express'])
    .default('standard')
    .describe('Account type: standard (full dashboard) or express (simplified onboarding)'),
})

const onboardResponseSchema = z.object({
  success: z.boolean(),
  accountLinkUrl: z.string().optional().describe('Stripe onboarding URL to redirect the user'),
  connectedAccount: z.record(z.unknown()).optional(),
  error: z.string().optional(),
})

// ========================================
// Helpers
// ========================================

/** Extract the raw JWT the caller sent so we can propagate it to ezauth. */
function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieHeader = req.headers.cookie || ''
  const cookieToken = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('ezauth_token='))
    ?.split('=')[1]
  return cookieToken
}

// ========================================
// Route Handler
// ========================================

const onboardHandler = async (req: Request, res: Response) => {
  try {
    const validation = onboardBodySchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid onboard data', validation.error.errors)
    }

    const { applicationId, email, businessName, type: accountType } = validation.data
    const userId = req.userId as string

    // Cross-service ownership check — the caller must own the Application
    // (or be superadmin). Matches the api-keys create flow.
    const bearerToken = extractBearerToken(req)
    const application = await getApplication(applicationId, { bearerToken })
    if (!application) {
      return sendError(res, 'Application not found', 404)
    }
    if (application.status !== 'active') {
      return sendError(res, 'Application is archived', 400)
    }
    if (application.ownerId !== userId && !isAdminUser(req)) {
      return sendError(res, 'Not allowed to onboard Connect for this Application', 403)
    }

    const ConnectedAccount = await getConnectedAccountModel()

    // One ConnectedAccount per Application — reject if one already exists.
    const existing = await ConnectedAccount.findOne({ applicationId })
    if (existing) {
      return sendError(res, 'Application already has a connected account', 409)
    }

    const stripe = getStripeInstance()

    // Create Stripe Connect account (standard or express)
    const accountParams: Stripe.AccountCreateParams =
      accountType === 'express'
        ? {
            type: 'express',
            email,
            business_profile: { name: businessName },
            metadata: { userId, applicationId },
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
          }
        : {
            type: 'standard',
            email,
            business_profile: { name: businessName },
            metadata: { userId, applicationId },
          }

    const account = await stripe.accounts.create(accountParams)

    // Save to DB
    const connectedAccount = await ConnectedAccount.create({
      applicationId,
      userId,
      isPlatformAccount: false,
      stripeAccountId: account.id,
      email,
      businessName,
      accountType,
      status: 'pending',
      chargesEnabled: false,
      payoutsEnabled: false,
      defaultFeePercent: 3,
    })

    // Create account link for onboarding
    const baseUrl = getApiUrl('ezpay')
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/api/connect/callback?account_id=${account.id}`,
      return_url: `${baseUrl}/api/connect/callback?account_id=${account.id}`,
      type: 'account_onboarding',
    })

    logger.info(
      `Connect account created: ${account.id} for user ${userId} (application ${applicationId})`
    )

    sendSuccess(res, {
      accountLinkUrl: accountLink.url,
      connectedAccount,
    })
  } catch (error) {
    logger.error('Connect onboard error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create connected account')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/connect/onboard', authMiddleware, populateUserFromToken, onboardHandler, {
  summary: 'Create a Stripe Connect account scoped to an Application and start onboarding',
  tags: ['Connect'],
  bodySchema: onboardBodySchema,
  responseSchema: onboardResponseSchema,
  status: 201,
})

export { onboardRegistry as registry, router }
export default router
