/**
 * Stripe Connect service — exposes the raw Stripe SDK for Connect-specific
 * operations that are not covered by the provider abstraction in pay-sdk.
 */
import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

/**
 * Returns the singleton Stripe SDK instance.
 * Throws if STRIPE_SECRET_KEY is not configured.
 */
export function getStripeInstance(): Stripe {
  if (stripeInstance) return stripeInstance

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is required for Stripe Connect operations')
  }

  stripeInstance = new Stripe(key)
  return stripeInstance
}
