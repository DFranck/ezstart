/**
 * Map a Stripe SDK error to a `{ status, message, code }` triple suitable for
 * `sendError(res, message, status, { code })`.
 *
 * The Stripe Node SDK exposes a hierarchy of typed errors (cf.
 * https://stripe.com/docs/api/errors/handling). When one bubbles out of an
 * `await stripe.checkout.sessions.create(...)` call inside a route handler we
 * MUST surface it as a 4xx (client mistake / config issue) instead of a 500
 * (server crash) — otherwise consumers can't react to it (e.g. retry, prompt
 * the user, fix dashboard config).
 *
 * Mapping:
 * - `StripeInvalidRequestError`        → 400 (bad params, missing setup, etc.)
 * - `StripeCardError`                  → 402 (card declined, insufficient funds)
 * - `StripeAuthenticationError`        → 401 (bad API key)
 * - `StripePermissionError`            → 403
 * - `StripeRateLimitError`             → 429 (with `retryAfter` hint)
 * - `StripeIdempotencyError`           → 409
 * - `StripeAPIError`                   → 502 (Stripe upstream broken)
 * - `StripeConnectionError`            → 504 (network)
 * - `StripeSignatureVerificationError` → 400 (webhook signature)
 * - Anything else (non-Stripe Error)   → null (caller falls back to 500)
 *
 * @example
 * ```ts
 * try {
 *   const session = await provider.createCheckoutSession({...})
 * } catch (err) {
 *   const mapped = mapStripeError(err)
 *   if (mapped) {
 *     return sendError(res, mapped.message, mapped.status, { code: mapped.code })
 *   }
 *   // Non-Stripe error — let the generic catch handle it
 *   throw err
 * }
 * ```
 */

import Stripe from 'stripe'

export interface MappedStripeError {
  status: number
  message: string
  code: string
}

const STRIPE_TYPE_TO_STATUS: Record<string, number> = {
  StripeInvalidRequestError: 400,
  StripeCardError: 402,
  StripeAuthenticationError: 401,
  StripePermissionError: 403,
  StripeRateLimitError: 429,
  StripeIdempotencyError: 409,
  StripeAPIError: 502,
  StripeConnectionError: 504,
  StripeSignatureVerificationError: 400,
}

/**
 * Returns a mapped triple if `err` is a recognised Stripe SDK error, or `null`
 * otherwise (caller should treat it as a 500).
 */
export function mapStripeError(err: unknown): MappedStripeError | null {
  if (!(err instanceof Stripe.errors.StripeError)) {
    return null
  }

  const status = STRIPE_TYPE_TO_STATUS[err.type] ?? err.statusCode ?? 502
  const message = err.message || 'Stripe request failed'
  // Stripe error codes (e.g. `card_declined`, `parameter_missing`) live on
  // `err.code`; fall back to the type name for invariant routing in tests.
  const code = err.code || err.type

  return { status, message, code }
}

/**
 * Type guard — useful when callers want to branch on the typed error before
 * deciding whether to map it.
 */
export function isStripeError(err: unknown): err is InstanceType<typeof Stripe.errors.StripeError> {
  return err instanceof Stripe.errors.StripeError
}
