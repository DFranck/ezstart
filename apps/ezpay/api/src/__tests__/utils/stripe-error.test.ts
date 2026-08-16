/**
 * Unit tests for `mapStripeError` — the helper that converts Stripe SDK errors
 * into HTTP-friendly `{ status, message, code }` triples.
 *
 * Each Stripe error subclass has its own `type` discriminant, so we instantiate
 * them via the documented constructor signatures and assert the resulting
 * status code mapping. This is a guardrail against future Stripe SDK upgrades
 * silently changing the error hierarchy.
 */
import { describe, it, expect } from 'vitest'
import Stripe from 'stripe'
import { mapStripeError, isStripeError } from '../../utils/stripe-error.js'

type StripeErrorInstance = InstanceType<typeof Stripe.errors.StripeError>

function makeStripeError<T extends StripeErrorInstance>(
  Ctor: new (raw: Stripe.StripeRawError) => T,
  raw: Stripe.StripeRawError
): T {
  return new Ctor(raw)
}

describe('mapStripeError', () => {
  it('returns null for non-Stripe errors', () => {
    expect(mapStripeError(new Error('plain error'))).toBeNull()
    expect(mapStripeError(undefined)).toBeNull()
    expect(mapStripeError('string error')).toBeNull()
    expect(mapStripeError({ message: 'fake' })).toBeNull()
  })

  it('maps StripeInvalidRequestError → 400', () => {
    const err = makeStripeError(Stripe.errors.StripeInvalidRequestError, {
      type: 'invalid_request_error',
      message: 'head office address required for automatic_tax',
      code: 'parameter_missing',
    })
    const mapped = mapStripeError(err)
    expect(mapped).not.toBeNull()
    expect(mapped?.status).toBe(400)
    expect(mapped?.message).toContain('head office address')
    expect(mapped?.code).toBe('parameter_missing')
  })

  it('maps StripeCardError → 402', () => {
    const err = makeStripeError(Stripe.errors.StripeCardError, {
      type: 'card_error',
      message: 'Your card was declined.',
      code: 'card_declined',
    })
    expect(mapStripeError(err)?.status).toBe(402)
    expect(mapStripeError(err)?.code).toBe('card_declined')
  })

  it('maps StripeAuthenticationError → 401', () => {
    const err = makeStripeError(Stripe.errors.StripeAuthenticationError, {
      type: 'authentication_error',
      message: 'Invalid API key.',
    })
    const mapped = mapStripeError(err)
    expect(mapped?.status).toBe(401)
    // Falls back to type when code missing
    expect(mapped?.code).toBe('StripeAuthenticationError')
  })

  it('maps StripePermissionError → 403', () => {
    const err = makeStripeError(Stripe.errors.StripePermissionError, {
      type: 'invalid_request_error',
      message: 'Permission denied.',
    })
    expect(mapStripeError(err)?.status).toBe(403)
  })

  it('maps StripeRateLimitError → 429', () => {
    const err = makeStripeError(Stripe.errors.StripeRateLimitError, {
      type: 'rate_limit_error',
      message: 'Too many requests.',
    })
    expect(mapStripeError(err)?.status).toBe(429)
  })

  it('maps StripeIdempotencyError → 409', () => {
    const err = makeStripeError(Stripe.errors.StripeIdempotencyError, {
      type: 'idempotency_error',
      message: 'Idempotency key reused with different params.',
    })
    expect(mapStripeError(err)?.status).toBe(409)
  })

  it('maps StripeAPIError → 502', () => {
    const err = makeStripeError(Stripe.errors.StripeAPIError, {
      type: 'api_error',
      message: 'Stripe API error.',
    })
    expect(mapStripeError(err)?.status).toBe(502)
  })

  it('maps StripeConnectionError → 504', () => {
    // StripeConnectionError doesn't accept 'api_connection_error' in RawErrorType
    // (it's emitted at the network layer); pass `api_error` as the closest match.
    const err = makeStripeError(Stripe.errors.StripeConnectionError, {
      type: 'api_error',
      message: 'Network unreachable.',
    })
    expect(mapStripeError(err)?.status).toBe(504)
  })

  it('maps StripeSignatureVerificationError → 400', () => {
    const err = new Stripe.errors.StripeSignatureVerificationError('sig_header', 'payload_body', {
      type: 'invalid_request_error',
      message: 'Signature mismatch.',
    })
    expect(mapStripeError(err)?.status).toBe(400)
  })

  it('uses fallback message when Stripe error message is empty', () => {
    const err = makeStripeError(Stripe.errors.StripeInvalidRequestError, {
      type: 'invalid_request_error',
      message: '',
    })
    expect(mapStripeError(err)?.message).toBe('Stripe request failed')
  })
})

describe('isStripeError', () => {
  it('returns true for any StripeError subclass', () => {
    const err = makeStripeError(Stripe.errors.StripeCardError, {
      type: 'card_error',
      message: 'declined',
    })
    expect(isStripeError(err)).toBe(true)
  })

  it('returns false for plain Error', () => {
    expect(isStripeError(new Error('not stripe'))).toBe(false)
  })

  it('returns false for non-error values', () => {
    expect(isStripeError(undefined)).toBe(false)
    expect(isStripeError(null)).toBe(false)
    expect(isStripeError('string')).toBe(false)
    expect(isStripeError({ type: 'invalid_request_error' })).toBe(false)
  })
})
