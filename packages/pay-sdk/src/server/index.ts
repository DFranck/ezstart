/**
 * `@ezstart/pay-sdk/server` — server-only exports.
 *
 * Server-side primitives for payment-service consumers (ezpay today, future
 * billing services tomorrow). Zero React, zero browser, zero hard dependency
 * on `@ezstart/*` runtime packages beyond `@ezstart/api-core` (used for the
 * EZStart-Signature webhook protocol).
 *
 * Imported via:
 *
 * ```ts
 * import {
 *   createStripeClient,
 *   computeConnectFee,
 *   signWebhook,
 * } from '@ezstart/pay-sdk/server'
 * ```
 *
 * The server-only guard at the top of each underlying file throws at
 * build/runtime if a client component (browser bundle) accidentally imports
 * from this entry point, preventing secret-key leaks. The guard uses a
 * runtime `window` check instead of the `server-only` npm package, which
 * crashes raw-Node API services at boot.
 *
 * @module @ezstart/pay-sdk/server
 */
import './_internal/server-only.js'

// ---------------------------------------------------------------------------
// Server primitives — Stripe client + Connect fee math + webhook signer
// ---------------------------------------------------------------------------

export { createStripeClient } from './stripe-client.js'
export type { CreateStripeClientOptions, CreateStripeClientLogger } from './stripe-client.js'

export { computeConnectFee } from './connect-fee.js'
export type { ComputeConnectFeeOptions, ConnectFeeAmounts } from './connect-fee.js'

export { signWebhook } from './webhook-signer.js'
export type { SignWebhookOptions } from './webhook-signer.js'

// ---------------------------------------------------------------------------
// Types — payment domain (re-exported from core for server-side consumers)
// ---------------------------------------------------------------------------

export type {
  Payment,
  Donation,
  Purchase,
  Subscription,
  Invoice,
  PaymentType,
  PaymentStatus,
  PaymentProvider,
  PayClientConfig,
  CreateDonationRequest,
  CreatePurchaseRequest,
  CreateSubscriptionRequest,
  PaymentResponse,
  PaymentsListResponse,
  StatsResponse,
} from '../core/types.js'

// ---------------------------------------------------------------------------
// Zod schemas — used by API route registrations + OpenAPI generation
// ---------------------------------------------------------------------------

export {
  paymentStatusSchema,
  paymentTypeSchema,
  paymentProviderSchema,
  basePaymentSchema,
  createDonationSchema,
  createPurchaseSchema,
  createSubscriptionSchema,
  paymentResponseSchema,
  paymentsListResponseSchema,
  statsResponseSchema,
  errorResponseSchema,
} from '../core/schemas.js'

// ---------------------------------------------------------------------------
// Provider abstraction (re-exported for server-side wiring)
// ---------------------------------------------------------------------------

export {
  PaymentProviderRegistry,
  StripeProvider,
  ConsoleProvider,
} from '../core/providers/index.js'
export type {
  IPaymentProvider,
  DiscountInfo,
  CheckoutOptions,
  CheckoutResult,
  SubscriptionCheckoutOptions,
  PaymentVerification,
  RefundResult,
  CancelResult,
  WebhookEvent,
  WebhookEventType,
  WebhookEventData,
  StripeProviderConfig,
  StripeInstance,
} from '../core/providers/index.js'

// ---------------------------------------------------------------------------
// Webhook signature verification (provider-agnostic helper)
// ---------------------------------------------------------------------------

export { verifyWebhookSignature } from '../core/verify-webhook-signature.js'
export type { VerifyWebhookSignatureOptions } from '../core/verify-webhook-signature.js'
