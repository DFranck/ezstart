/**
 * EZPay Stripe registry — wires the singleton `PaymentProviderRegistry` for
 * this API process from environment variables.
 *
 * The Stripe SDK construction + safety guards live in
 * `@ezstart/pay-sdk/server` (`createStripeClient`). This file is the
 * ezpay-specific glue:
 *   - reads `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `PAYMENT_PROVIDER`
 *   - falls back to `ConsoleProvider` when the key is absent or the operator
 *     opted into console mode
 *   - registers the result on the singleton registry
 *
 * Future payment services (ezbill billing events, etc.) repeat the same
 * pattern — they consume `createStripeClient` from pay-sdk/server.
 */
import { logger } from '@ezstart/logger/server'
import { createStripeClient } from '@ezstart/pay-sdk/server'
import {
  PaymentProviderRegistry,
  StripeProvider,
  ConsoleProvider,
} from '@ezstart/pay-sdk/providers'
import type { IPaymentProvider, StripeInstance } from '@ezstart/pay-sdk/providers'

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
  // Safety guards (live-key-in-dev throw, test-key-in-prod warn) are enforced
  // inside `createStripeClient` — see @ezstart/pay-sdk/server.
  const stripe = createStripeClient({
    secretKey: stripeKey,
    logger,
  })

  registry.register(
    new StripeProvider({
      stripe: stripe as unknown as StripeInstance,
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
