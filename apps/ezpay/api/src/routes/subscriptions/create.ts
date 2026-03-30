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
import { createSubscriptionSession } from '../../services/stripe.js'
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
  interval: z.enum(['month', 'year']).describe('Billing interval'),
  currency: z.string().default('USD').describe('Currency code (USD, EUR, etc.)'),
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
      interval,
      currency = 'USD',
      userId,
      customerEmail,
      returnUrl,
    } = validation.data

    const baseUrl = returnUrl || getWebUrl(projectId as AppName)

    const session = await createSubscriptionSession({
      amount,
      currency,
      interval,
      description: `Subscription: ${planName}`,
      metadata: {
        type: 'subscription',
        projectId,
        planId,
        planName,
        userId: userId || '',
      },
      successUrl: `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/donate/cancel`,
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
      paymentId: session.id,
      status: 'pending',
      metadata: {
        planId,
        planName,
        interval,
      },
    })

    logger.info(`💳 Subscription created - Session ID: ${session.id}`)

    sendSuccess(res, { payment, checkoutUrl: session.url })
  } catch (error) {
    logger.error('Create subscription error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create subscription')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/subscribe', createSubscriptionHandler, {
  summary: 'Create a subscription checkout session',
  tags: ['Subscriptions'],
  bodySchema: createSubscriptionSchema,
  responseSchema: paymentResponseSchema,
  status: 201,
})

export { createSubscriptionRegistry as registry, router }
export default router
