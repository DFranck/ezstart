import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'
import { getPaymentModel } from '../../models/Payment.js'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const verifyPaymentRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(verifyPaymentRegistry, router)

// ========================================
// Zod Schemas
// ========================================

const verifyPaymentParamsSchema = z.object({
  sessionId: z.string().describe('Stripe checkout session ID'),
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
    const { stripe } = await import('../../services/stripe.js')
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
// Route with OpenAPI Documentation
// ========================================

docRouter.post('/verify-payment/:sessionId', verifyPaymentHandler, {
  summary: 'Verify and complete payment after Stripe checkout',
  tags: ['Donations'],
  paramsSchema: verifyPaymentParamsSchema,
  responseSchema: paymentResponseSchema,
})

export { verifyPaymentRegistry as registry, router }
export default router
