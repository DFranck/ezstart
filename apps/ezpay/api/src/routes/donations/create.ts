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
import { resolveConnectFee } from '../../services/connect-fee.js'
import { optionalAuthMiddleware } from '../../middleware/auth.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const createDonationRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(createDonationRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createDonationSchema = z.object({
  projectId: z.string().max(100).describe('Project identifier'),
  projectName: z.string().optional().describe('Project display name'),
  amount: z.number().nonnegative().describe('Donation amount in currency units (0 = testimonial)'),
  currency: z.string().regex(/^[a-z]{3}$/i, 'Must be a valid ISO 4217 currency code').default('EUR').describe('Currency code (EUR, USD, GBP, etc.)'),
  message: z.string().optional().describe('Optional message from donor'),
  isPublic: z.boolean().default(true).describe('Whether donation is shown publicly'),
  isAnonymous: z.boolean().default(false).describe('Whether donor wants to stay anonymous'),
  donorName: z.string().optional().describe('Donor name'),
  donorEmail: z.string().email().optional().describe('Donor email'),
  returnUrl: z.string().url().optional().describe('Custom return URL after payment'),
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

const createDonationHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel()
  try {
    const validation = createDonationSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid donation data', validation.error.errors)
    }

    const {
      projectId,
      projectName,
      amount,
      currency = 'EUR',
      message,
      isPublic = true,
      isAnonymous = false,
      donorName,
      donorEmail,
      returnUrl,
    } = validation.data

    // Use the authenticated user ID from JWT if available, never from the request body
    const userId = req.userId

    // Detect live vs test mode from Stripe key
    const livePrefix = 'sk_' + 'live_'
    const isLiveMode = (process.env.STRIPE_SECRET_KEY || '').startsWith(livePrefix)

    // Testimonial: bypass Stripe for €0 donations, save directly to DB
    if (amount === 0) {
      const payment = await Payment.create({
        projectId,
        projectName: projectName || projectId,
        type: 'testimonial',
        amount: 0,
        currency: currency || 'USD',
        provider: 'stripe',
        paymentId: `testimonial-${Date.now()}`,
        status: 'completed',
        completedAt: new Date(),
        userId: userId || undefined,
        customerName: donorName || undefined,
        customerEmail: donorEmail || undefined,
        isAnonymous: isAnonymous || false,
        liveMode: isLiveMode,
        metadata: {
          message: message || undefined,
          isPublic: isPublic !== false,
        },
      })

      logger.info(`💬 Testimonial created - ID: ${payment._id}`)

      return sendSuccess(res, {
        payment: { id: payment._id, ...payment.toObject() },
        checkoutUrl: null,
      })
    }

    // Use custom returnUrl or fallback to project's web URL based on projectId
    // This allows EZPay to redirect back to the originating app (EZBill, FengShui, etc.)
    const baseUrl = returnUrl || getWebUrl(projectId as AppName)

    // Resolve Connect fee if the user has an active connected account
    const connectFee = userId ? await resolveConnectFee(userId, Math.round(amount * 100)) : null

    // Create checkout session via provider
    const provider = getProvider()
    const session = await provider.createCheckoutSession({
      amount,
      currency,
      description: `Donation to ${projectName || projectId}`,
      metadata: {
        type: 'donation',
        projectId,
        projectName: projectName || projectId,
        userId: userId || '',
        message: message || '',
        isPublic: isPublic.toString(),
        isAnonymous: isAnonymous.toString(),
      },
      successUrl: `${baseUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/donate/cancel`,
      connect:
        connectFee?.isConnect && connectFee.stripeAccountId && connectFee.applicationFeeAmount
          ? {
              destinationAccountId: connectFee.stripeAccountId,
              applicationFeeAmount: connectFee.applicationFeeAmount,
            }
          : undefined,
    })

    // Create payment record in DB
    const payment = await Payment.create({
      projectId,
      projectName: projectName || projectId,
      type: 'donation',
      amount,
      currency,
      userId,
      customerName: isAnonymous ? 'Anonymous' : donorName,
      customerEmail: donorEmail,
      isAnonymous,
      provider: 'stripe',
      paymentId: session.sessionId,
      status: 'pending',
      liveMode: isLiveMode,
      metadata: {
        message,
        isPublic,
      },
    })

    logger.info(`💳 Donation created - Session ID: ${session.sessionId}`)
    logger.info(`🔗 Checkout URL: ${session.url}`)

    sendSuccess(res, { payment, checkoutUrl: session.url })
  } catch (error) {
    logger.error('Create donation error:', error instanceof Error ? error : String(error))
    sendError(res, error instanceof Error ? error.message : 'Failed to create donation')
  }
}

// ========================================
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/donate', optionalAuthMiddleware, createDonationHandler, {
  summary: 'Create a donation checkout session',
  tags: ['Donations'],
  bodySchema: createDonationSchema,
  responseSchema: paymentResponseSchema,
  status: 201,
})

export { createDonationRegistry as registry, router }
export default router
