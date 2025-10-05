import { Router } from '@ezstart/express-core'
import { Payment } from '../models/Payment.js'
import { createCheckoutSession } from '../services/stripe.js'
import type { Request, Response, Router as ExpressRouter } from 'express'

const router: ExpressRouter = Router()

// Create donation
router.post('/donate', async (req: Request, res: Response) => {
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
    } = req.body

    // Validation
    if (!projectId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'projectId and positive amount are required',
      })
    }

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
      successUrl: `${process.env.WEB_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.WEB_URL}/donate/cancel`,
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
})

// Get donations (for testimonials wall)
router.get('/donations', async (req: Request, res: Response) => {
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
})

// Get donation stats
router.get('/donations/stats', async (req: Request, res: Response) => {
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
})

export default router
