import { logger } from '@ezstart/logger/server'
import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  throw new Error('STRIPE_SECRET_KEY required')
}

// Safety: prevent live keys in development
if (process.env.NODE_ENV !== 'production' && stripeKey.startsWith('sk_live_')) {
  throw new Error('DANGER: Live Stripe key detected in development! Use sk_test_ keys.')
}
if (process.env.NODE_ENV === 'production' && stripeKey.startsWith('sk_test_')) {
  logger.warn('WARNING: Test Stripe key in production — payments will not be processed')
}

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
})

interface CreateCheckoutParams {
  amount: number
  currency: string
  description: string
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
}

export async function createCheckoutSession(params: CreateCheckoutParams) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: {
            name: params.description,
          },
          unit_amount: Math.round(params.amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  })

  return session
}

export async function createSubscriptionSession(
  params: CreateCheckoutParams & { interval: string }
) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: {
            name: params.description,
          },
          unit_amount: Math.round(params.amount * 100),
          recurring: {
            interval: params.interval as 'month' | 'year',
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  })

  return session
}

export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId)
  return subscription
}

export async function refundPayment(paymentIntentId: string) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
  })
  return refund
}
