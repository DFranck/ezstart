import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { getWebUrl, type AppName } from '@ezstart/config'
import { getPaymentModel } from '../models/Payment.js'
import { createCheckoutSession } from '../services/stripe.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const donationsRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(donationsRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const createDonationSchema = z.object({
  projectId: z.string().describe('Project identifier'),
  projectName: z.string().optional().describe('Project display name'),
  amount: z.number().positive().describe('Donation amount in currency units'),
  currency: z.string().default('USD').describe('Currency code (USD, EUR, etc.)'),
  message: z.string().optional().describe('Optional message from donor'),
  isPublic: z.boolean().default(true).describe('Whether donation is shown publicly'),
  isAnonymous: z.boolean().default(false).describe('Whether donor wants to stay anonymous'),
  userId: z.string().optional().describe('EZAuth user ID if logged in'),
  donorName: z.string().optional().describe('Donor name'),
  donorEmail: z.string().email().optional().describe('Donor email'),
  returnUrl: z.string().url().optional().describe('Custom return URL after payment'),
})

const donationsQuerySchema = z.object({
  projectId: z.string().optional().describe('Filter by project ID'),
  limit: z.coerce.number().default(10).describe('Number of donations to return'),
})

const donationStatsQuerySchema = z.object({
  projectId: z.string().optional().describe('Filter stats by project ID'),
})

const verifyPaymentParamsSchema = z.object({
  sessionId: z.string().describe('Stripe checkout session ID'),
})

const paymentResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payment: z.any().optional().describe('Payment object with details'),
  checkoutUrl: z.string().optional().describe('Stripe checkout URL to redirect user'),
  error: z.string().optional().describe('Error message if operation failed'),
})

const donationsListResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  payments: z.array(z.any()).describe('List of public donations'),
  total: z.number().describe('Total number of donations matching the query'),
})

const donationStatsResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation succeeded'),
  stats: z.object({
    total: z.number().describe('Total amount donated'),
    count: z.number().describe('Total number of donations'),
    byType: z.object({
      donation: z.object({
        total: z.number().describe('Total amount from donations'),
        count: z.number().describe('Number of donations'),
      }),
    }),
    recent: z.array(z.any()).describe('Recent donations (last 5)'),
  }).describe('Donation statistics'),
})

// ========================================
// Route Handlers
// ========================================

const createDonationHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel();
  try {
    const {
      projectId,
      projectName,
      amount,
      currency = 'USD',
      message,
      isPublic = true,
      isAnonymous = false,
      userId,
      donorName,
      donorEmail,
      returnUrl,
    } = req.body

    // Use custom returnUrl or fallback to project's web URL based on projectId
    // This allows EZPay to redirect back to the originating app (EZBill, Tower Defense, etc.)
    const baseUrl = returnUrl || getWebUrl(projectId as AppName)

    // Create Stripe checkout session
    const session = await createCheckoutSession({
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
      paymentId: session.id,
      status: 'pending',
      metadata: {
        message,
        isPublic,
      },
    })

    console.log(`💳 Donation created - Session ID: ${session.id}`)
    console.log(`🔗 Checkout URL: ${session.url}`)

    res.json({
      success: true,
      payment,
      checkoutUrl: session.url,
    })
  } catch (error) {
    console.error('Create donation error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create donation',
    })
  }
}

const getDonationsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel();
  try {
    const { projectId, limit = 10 } = req.query

    const query: any = {
      type: 'donation',
      status: 'completed',
      'metadata.isPublic': true,
    }

    if (projectId) {
      query.projectId = projectId
    }

    const donations = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .select('-customerEmail -paymentId')

    const total = await Payment.countDocuments(query)

    res.json({
      success: true,
      payments: donations,
      total,
    })
  } catch (error) {
    console.error('Get donations error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch donations',
    })
  }
}

const getDonationStatsHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel();
  try {
    const { projectId } = req.query

    const query: any = {
      type: 'donation',
      status: 'completed',
    }

    if (projectId) {
      query.projectId = projectId
    }

    const donations = await Payment.find(query)

    const total = donations.reduce((sum, d) => sum + d.amount, 0)
    const count = donations.length

    const recent = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-customerEmail -paymentId')

    res.json({
      success: true,
      stats: {
        total,
        count,
        byType: {
          donation: { total, count },
        },
        recent,
      },
    })
  } catch (error) {
    console.error('Get donation stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch donation stats',
    })
  }
}

const verifyPaymentHandler = async (req: Request, res: Response) => {
  const Payment = await getPaymentModel();
  try {
    const { sessionId } = req.params

    // Find payment in DB
    const payment = await Payment.findOne({ paymentId: sessionId })

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      })
    }

    // If already completed, return success
    if (payment.status === 'completed') {
      return res.json({
        success: true,
        payment,
      })
    }

    // Verify with Stripe API to prevent fraud
    const { stripe } = await import('../services/stripe.js')
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Missing sessionId' })
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Only mark as completed if Stripe confirms payment
    if (session.payment_status === 'paid' && session.status === 'complete') {
      payment.status = 'completed'
      payment.completedAt = new Date()
      payment.paymentMethod = session.payment_method_types?.[0]
      await payment.save()

      console.log(`✅ Payment verified with Stripe and completed: ${sessionId}`)

      res.json({
        success: true,
        payment,
      })
    } else {
      // Payment not confirmed by Stripe
      console.warn(`⚠️ Payment not confirmed by Stripe: ${sessionId} (status: ${session.status})`)
      res.status(400).json({
        success: false,
        error: 'Payment not confirmed',
      })
    }
  } catch (error) {
    console.error('Verify payment error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
    })
  }
}

// ========================================
// Routes with OpenAPI Documentation
// ========================================

docRouter.post('/donate', createDonationHandler, {
  summary: 'Create a donation checkout session',
  tags: ['Donations'],
  bodySchema: createDonationSchema,
  responseSchema: paymentResponseSchema,
  status: 201,
})

docRouter.get('/donations', getDonationsHandler, {
  summary: 'Get public donations (testimonials wall)',
  tags: ['Donations'],
  querySchema: donationsQuerySchema,
  responseSchema: donationsListResponseSchema,
})

docRouter.get('/donations/stats', getDonationStatsHandler, {
  summary: 'Get donation statistics',
  tags: ['Donations'],
  querySchema: donationStatsQuerySchema,
  responseSchema: donationStatsResponseSchema,
})

docRouter.post('/verify-payment/:sessionId', verifyPaymentHandler, {
  summary: 'Verify and complete payment after Stripe checkout',
  tags: ['Donations'],
  paramsSchema: verifyPaymentParamsSchema,
  responseSchema: paymentResponseSchema,
})

export default router
