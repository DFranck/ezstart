/**
 * Provider-agnostic webhook signature verification helper.
 *
 * Currently supports the same providers as `IPaymentProvider` (Stripe today,
 * future PayPal / Adyen / etc.). Each provider branch verifies the signature
 * using the SDK instance that the consumer must supply — keeping pay-sdk
 * itself dependency-free.
 *
 * For Stripe, this wraps `stripe.webhooks.constructEvent` and maps the
 * resulting payload through the same `WebhookEvent` shape used by the rest of
 * pay-sdk (`StripeProvider.verifyWebhookSignature` shares this code path).
 *
 * @example
 * ```ts
 * import Stripe from 'stripe'
 * import { verifyWebhookSignature } from '@ezstart/pay-sdk/server'
 *
 * const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
 *
 * app.post('/webhooks/stripe', async (req, res) => {
 *   const event = verifyWebhookSignature({
 *     provider: 'stripe',
 *     stripe,
 *     payload: req.rawBody,
 *     signature: req.headers['stripe-signature'] as string,
 *     secret: process.env.STRIPE_WEBHOOK_SECRET!,
 *   })
 *   // event.type, event.data — typed by `WebhookEvent`
 *   res.json({ received: true })
 * })
 * ```
 */

import { mapStripeWebhookEvent } from './providers/stripe-event-mapper.js'
import type { StripeInstance } from './providers/stripe.js'
import type { WebhookEvent } from './providers/types.js'

/** Discriminated union — every supported provider declares its required SDK / config. */
export type VerifyWebhookSignatureOptions = {
  provider: 'stripe'
  /** A pre-constructed Stripe SDK instance (peer dependency on the consumer). */
  stripe: StripeInstance
  /** Raw request body — Stripe REQUIRES the unparsed bytes. */
  payload: string | Buffer
  /** Value of the `Stripe-Signature` request header. */
  signature: string
  /** The webhook endpoint secret (`whsec_…`). */
  secret: string
}

/**
 * Verify a webhook signature and return a normalised `WebhookEvent`.
 *
 * Throws when the signature does not match, when the secret is invalid or
 * when the provider SDK rejects the payload. Callers SHOULD treat any thrown
 * error as a 400 response — never as 500 — to avoid retries from the
 * upstream provider.
 */
export function verifyWebhookSignature(options: VerifyWebhookSignatureOptions): WebhookEvent {
  switch (options.provider) {
    case 'stripe': {
      const { stripe, payload, signature, secret } = options
      if (!secret || secret.length === 0) {
        throw new Error('verifyWebhookSignature: secret is required')
      }
      if (!signature || signature.length === 0) {
        throw new Error('verifyWebhookSignature: signature is required')
      }
      const event = stripe.webhooks.constructEvent(payload, signature, secret)
      return mapStripeWebhookEvent(event)
    }
    default: {
      // Exhaustiveness guard — TS will flag here if a new provider literal is
      // added to the union without a switch branch.
      const exhaustiveCheck: never = options.provider
      throw new Error(`verifyWebhookSignature: unsupported provider "${String(exhaustiveCheck)}"`)
    }
  }
}
