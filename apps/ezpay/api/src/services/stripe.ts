import { logger } from '@ezstart/logger/server'
import {
  PaymentProviderRegistry,
  StripeProvider,
  ConsoleProvider,
} from '@ezstart/pay-sdk/providers'
import type { IPaymentProvider } from '@ezstart/pay-sdk/providers'
import Stripe from 'stripe'

// ========================================
// Provider Registry (singleton)
// ========================================

const registry = new PaymentProviderRegistry()

const stripeKey = process.env.STRIPE_SECRET_KEY
const useConsole = !stripeKey || process.env.PAYMENT_PROVIDER === 'console'

if (useConsole) {
  logger.warn(
    'No STRIPE_SECRET_KEY — using ConsoleProvider (payments will be logged, not processed)'
  )
  registry.register(new ConsoleProvider())
} else {
  // Safety: prevent live keys in local development
  const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT
  if (isLocalDev && stripeKey.startsWith('sk_live_')) {
    throw new Error('DANGER: Live Stripe key detected in local development! Use sk_test_ keys.')
  }
  if (process.env.NODE_ENV === 'production' && stripeKey.startsWith('sk_test_')) {
    logger.warn('WARNING: Test Stripe key in production — payments will not be processed')
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  registry.register(
    new StripeProvider({
      stripe: stripe as unknown as import('@ezstart/pay-sdk/providers').StripeInstance,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    })
  )
}

// ========================================
// Exports
// ========================================

/** The payment provider registry — use getDefault() for the active provider */
export { registry }

/** Shortcut to the default provider */
export function getProvider(): IPaymentProvider {
  return registry.getDefault()
}
