import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/express-core'
import { getWebUrl, type AppName } from '@ezstart/config'
import { getPaymentModel } from '../../models/Payment.js'
import { getProvider } from '../../services/stripe.js'
import { authMiddleware } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const createSubscriptionRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createSubscriptionRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createSubscriptionSchema = z.object({
  projectId: z.string().describe('Project identifier'),
  planId: z.string().describe('Plan identifier'),
  planName: z.string().describe('Plan display name'),
  amount: z.number().positive().describe('Subscription amount per interval'),
  interval: z.enum(['month']).default('month').describe('Billing interval (always month)'),
  intervalCount: z
    .number()
    .int()
    .min(1)
    .max(12)
    .default(1)
    .describe(
      'Number of months between billings (1=monthly, 3=quarterly, 6=semi-annual, 12=annual)'
    ),
  currency: z.string().default('EUR').describe('Currency code (EUR, USD, GBP, etc.)'),
  userId: z.string().optional().describe('EZAuth user ID if logged in'),
  customerEmail: z.string().email().optional().describe('Customer email'),
  returnUrl: z.string().url().optional().describe('Custom return URL after payment'),
})

const paymentResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payment: z.any().optional().describe('Payment object with details'),
  checkoutUrl: z.string().optional().describe('Stripe checkout URL to redirect user'),
  error: z.string().optional().describe('Error message if operation failed'),
})

// ========================================
// Route Handler
// ========================================

const createSubscriptionHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const validation = createSubscriptionSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid subscription data', validation.error.errors)
    }

    const {
      projectId,
      planId,
      planName,
      amount,
      interval = 'month',
      intervalCount = 1,
      currency = 'EUR',
      userId,
      customerEmail,
      returnUrl,
    } = validation.data

    const baseUrl = returnUrl || getWebUrl(projectId as AppName)

    const provider = getProvider()
    const session = await provider.createSubscriptionCheckout({
      amount,
      currency,
      interval,
      intervalCount,
      description: `Subscription: ${planName}`,
      metadata: {
        type: 'subscription',
        projectId,
        planId,
        planName,
        userId: userId || '',
      },
      successUrl: `${baseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/subscribe/cancel`,
    })

    const payment = await Payment.create({
      projectId,
      projectName: projectId,
      type: 'subscription',
      amount,
      currency,
      userId,
      customerEmail,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: session.sessionId,
      status: 'pending',
      metadata: {
        planId,
        planName,
        interval: 'month',
        intervalCount,
      },
    })

    logger.info(`💳 Subscription created - Session ID: ${session.sessionId}`)

    sendSuccess(res, { payment, checkoutUrl: session.url })
  } catch (error) {
    logger.error('Create subscription error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create subscription')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/subscribe', authMiddleware, createSubscriptionHandler, {
  summary: 'Create a subscription checkout session',
  tags: ['Subscriptions'],
  bodySchema: createSubscriptionSchema,
  responseSchema: paymentResponseSchema,
  status: 201,
})

export { createSubscriptionRegistry as registry, router }
export default router
