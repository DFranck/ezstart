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
import { createCheckoutSession } from '../../services/stripe.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const createPurchaseRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createPurchaseRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createPurchaseSchema = z.object({
  projectId: z.string().describe('Project identifier'),
  productId: z.string().describe('Product identifier'),
  productName: z.string().describe('Product display name'),
  amount: z.number().positive().describe('Purchase amount in currency units'),
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

const createPurchaseHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const validation = createPurchaseSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid purchase data', validation.error.errors)
    }

    const {
      projectId,
      productId,
      productName,
      amount,
      currency = 'USD',
      userId,
      customerEmail,
      returnUrl,
    } = validation.data

    const baseUrl = returnUrl || getWebUrl(projectId as AppName)

    const session = await createCheckoutSession({
      amount,
      currency,
      description: `Purchase: ${productName}`,
      metadata: {
        type: 'purchase',
        projectId,
        productId,
        productName,
        userId: userId || '',
      },
      successUrl: `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/donate/cancel`,
    })

    const payment = await Payment.create({
      projectId,
      projectName: projectId,
      type: 'purchase',
      amount,
      currency,
      userId,
      customerEmail,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: session.id,
      status: 'pending',
      metadata: {
        productId,
        productName,
      },
    })

    logger.info(`💳 Purchase created - Session ID: ${session.id}`)

    sendSuccess(res, { payment, checkoutUrl: session.url })
  } catch (error) {
    logger.error('Create purchase error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create purchase')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/purchase', createPurchaseHandler, {
  summary: 'Create a purchase checkout session',
  tags: ['Purchases'],
  bodySchema: createPurchaseSchema,
  responseSchema: paymentResponseSchema,
  status: 201,
})

export { createPurchaseRegistry as registry, router }
export default router
