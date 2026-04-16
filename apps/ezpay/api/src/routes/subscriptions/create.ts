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
import { getPlanModel } from '../../models/Plan.js'
import { getProvider } from '../../services/stripe.js'
import { validatePromo, calculateDiscount, incrementUsage } from '../../services/promo.js'
import { resolveConnectFee } from '../../services/connect-fee.js'
import { authMiddleware, populateUserFromToken } from '../../middleware/auth.js'
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
      promoCode,
    } = validation.data

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

    // Fetch the plan to snapshot its features at checkout time
    const Plan = await getPlanModel()
    const plan = await Plan.findById(planId).lean()
    const snapshotFeatures = plan?.features || []

    const baseUrl = returnUrl || getWebUrl(projectId as AppName)

    // Resolve Connect fee if the user has an active connected account
    const connectFee = userId ? await resolveConnectFee(userId, Math.round(amount * 100)) : null

    const provider = getProvider()
    const session = await provider.createSubscriptionCheckout({
      amount, // FULL price — provider handles discount via native mechanism (coupon)
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
        connectFee?.isConnect && connectFee.stripeAccountId && connectFee.applicationFeeAmount
          ? {
              destinationAccountId: connectFee.stripeAccountId,
              applicationFeeAmount: connectFee.applicationFeeAmount,
            }
          : undefined,
    })

    // Detect live vs test mode from Stripe key
    const isLiveMode = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_')

    const payment = await Payment.create({
      projectId,
      projectName: projectId,
      type: 'subscription',
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
        planId,
        planName,
        interval: 'month',
        intervalCount,
        features: snapshotFeatures,
        ...promoMetadata,
      },
    })

    // Increment promo usage after successful payment creation
    if (promoId) {
      await incrementUsage(promoId)
    }

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

docRouter.post('/subscribe', authMiddleware, populateUserFromToken, createSubscriptionHandler, {
  summary: 'Create a subscription checkout session',
  tags: ['Subscriptions'],
  bodySchema: createSubscriptionSchema,
  responseSchema: paymentResponseSchema,
  status: 201,
})

export { createSubscriptionRegistry as registry, router }
export default router
