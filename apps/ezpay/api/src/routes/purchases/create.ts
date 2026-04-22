import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
  sendValidationError,
} from '@ezstart/api-core'
import { getWebUrl, type AppName } from '@ezstart/config'
import { getPaymentModel } from '../../models/Payment.js'
import { getProvider } from '../../services/stripe.js'
import { validatePromo, calculateDiscount } from '../../services/promo.js'
import { resolveConnectFee } from '../../services/connect-fee.js'
import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const createPurchaseRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createPurchaseRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createPurchaseSchema = z.object({
  projectId: z.string().max(100).describe('Project identifier'),
  applicationId: z
    .string()
    .optional()
    .describe(
      'ezauth Application id owning the checkout (required when not authenticated via API key)'
    ),
  productId: z.string().describe('Product identifier'),
  productName: z.string().describe('Product display name'),
  amount: z.number().positive().describe('Purchase amount in currency units'),
  currency: z
    .string()
    .regex(/^[a-z]{3}$/i, 'Must be a valid ISO 4217 currency code')
    .default('EUR')
    .describe('Currency code (EUR, USD, GBP, etc.)'),
  customerEmail: z.string().email().optional().describe('Customer email'),
  returnUrl: z.string().url().optional().describe('Custom return URL after payment'),
  promoCode: z.string().optional().describe('Optional promo code for discount'),
})

const paymentResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payment: z.record(z.unknown()).optional().describe('Payment object with details'),
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
      applicationId: bodyApplicationId,
      productId,
      productName,
      amount,
      currency = 'EUR',
      customerEmail,
      returnUrl,
      promoCode,
    } = validation.data

    // Always use the authenticated user ID from JWT, never from the request body
    const userId = req.userId

    // Resolve the target Application id:
    //   1. API-key auth → middleware populates `req.apiKeyApplicationId`
    //   2. Bearer/JWT auth → caller passes `applicationId` in body
    //   3. Neither → 422 (cannot route Connect fee without the owner)
    const applicationId = req.apiKeyApplicationId ?? bodyApplicationId
    if (!applicationId) {
      return sendValidationError(res, 'applicationId required', [
        {
          code: 'custom',
          path: ['applicationId'],
          message:
            'applicationId is required when not authenticated via API key (body field or X-API-Key)',
        },
      ])
    }

    // Promo code validation and discount calculation
    let finalAmount = amount
    let promoMetadata: { promoCode?: string; originalAmount?: number; discountApplied?: number } =
      {}
    let promoId: string | undefined
    let validatedPromo: Awaited<ReturnType<typeof validatePromo>>['promo']

    if (promoCode) {
      const promoResult = await validatePromo(promoCode, projectId)
      if (!promoResult.valid) {
        return sendError(res, promoResult.reason || 'Invalid promo code', 400)
      }

      validatedPromo = promoResult.promo
      const discount = calculateDiscount(amount, promoResult.promo!)
      finalAmount = discount.discountedAmount
      promoId = String(promoResult.promo!._id)
      promoMetadata = {
        promoCode: promoResult.promo!.code,
        originalAmount: discount.originalAmount,
        discountApplied: discount.discountApplied,
      }
    }

    const baseUrl = returnUrl || getWebUrl(projectId as AppName)

    // Resolve Connect fee for the target Application
    const connectFee = await resolveConnectFee(applicationId, Math.round(finalAmount * 100))

    // Stripe automatic tax — opt-out via env var. See subscribe route for details.
    const automaticTax = process.env.STRIPE_AUTOMATIC_TAX !== 'false'

    const provider = getProvider()
    const session = await provider.createCheckoutSession({
      amount: finalAmount, // Discounted amount OK for one-time purchases
      currency,
      description: `Purchase: ${productName}`,
      metadata: {
        type: 'purchase',
        projectId,
        productId,
        productName,
        userId: userId || '',
        promoId: promoId || '',
      },
      successUrl: `${baseUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/purchase/cancel`,
      automaticTax,
      discount: validatedPromo
        ? {
            type: validatedPromo.discountType,
            value: validatedPromo.discountValue,
            duration: validatedPromo.duration,
            durationInMonths: validatedPromo.durationInMonths,
            code: promoCode,
          }
        : undefined,
      connect:
        connectFee.isConnect && connectFee.stripeAccountId
          ? {
              destinationAccountId: connectFee.stripeAccountId,
              // One-shots use cents-based fee
              applicationFeeAmount: connectFee.applicationFeeAmount,
            }
          : undefined,
    })

    // Detect live vs test mode from Stripe key
    const isLiveMode = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_')

    const payment = await Payment.create({
      projectId,
      projectName: projectId,
      type: 'purchase',
      amount: finalAmount,
      currency,
      userId,
      customerEmail,
      isAnonymous: false,
      provider: 'stripe',
      paymentId: session.sessionId,
      status: 'pending',
      liveMode: isLiveMode,
      metadata: {
        productId,
        productName,
        ...promoMetadata,
      },
    })

    // Promo usage is incremented in the webhook handler (checkout.completed)
    // to avoid wasting promo uses on abandoned checkouts

    logger.info(`💳 Purchase created - Session ID: ${session.sessionId}`)

    sendSuccess(res, { payment, checkoutUrl: session.url })
  } catch (error) {
    logger.error('Create purchase error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create purchase')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/purchase', authMiddleware, populateUserFromToken, createPurchaseHandler, {
  summary: 'Create a purchase checkout session',
  tags: ['Purchases'],
  bodySchema: createPurchaseSchema,
  responseSchema: paymentResponseSchema,
  status: 201,
})

export { createPurchaseRegistry as registry, router }
export default router
