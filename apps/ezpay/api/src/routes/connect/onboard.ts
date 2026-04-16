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
import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
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
// Route Handler
// ========================================

const onboardHandler = async (req: Request, res: Response) => {
  try {
    const validation = onboardBodySchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid onboard data', validation.error.errors)
    }

    const { email, businessName, type: accountType } = validation.data
    const userId = req.userId as string

    const ConnectedAccount = await getConnectedAccountModel()

    // Check if user already has a connected account
    const existing = await ConnectedAccount.findOne({ userId })
    if (existing) {
      return sendError(res, 'User already has a connected account', 409)
    }

    const stripe = getStripeInstance()

    // Create Stripe Connect account (standard or express)
    const accountParams: Stripe.AccountCreateParams =
      accountType === 'express'
        ? {
            type: 'express',
            email,
            business_profile: { name: businessName },
            metadata: { userId },
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
          }
        : {
            type: 'standard',
            email,
            business_profile: { name: businessName },
            metadata: { userId },
          }

    const account = await stripe.accounts.create(accountParams)

    // Save to DB
    const connectedAccount = await ConnectedAccount.create({
      userId,
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

    logger.info(`Connect account created: ${account.id} for user ${userId}`)

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
  summary: 'Create a Stripe Connect account and start onboarding',
  tags: ['Connect'],
  bodySchema: onboardBodySchema,
  responseSchema: onboardResponseSchema,
  status: 201,
})

export { onboardRegistry as registry, router }
