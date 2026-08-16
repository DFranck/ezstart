/**
 * Tests for the standalone `verifyWebhookSignature` helper.
 *
 * The helper is provider-agnostic; today only Stripe is supported. We use a
 * fake Stripe SDK instance so no real cryptography is involved — the helper's
 * contract is exclusively about plumbing payload + signature + secret into
 * `stripe.webhooks.constructEvent` and mapping the result via
 * `mapStripeWebhookEvent`.
 */
import { describe, expect, it, vi } from 'vitest'
import { verifyWebhookSignature } from '../../core/verify-webhook-signature.js'
import type { StripeInstance } from '../../core/providers/stripe.js'

function createFakeStripe(constructEventImpl: StripeInstance['webhooks']['constructEvent']) {
  const constructEvent = vi.fn(constructEventImpl)
  const stripe: StripeInstance = {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    coupons: { create: vi.fn() },
    refunds: { create: vi.fn() },
    subscriptions: { cancel: vi.fn(), update: vi.fn() },
    webhooks: { constructEvent },
  }
  return { stripe, constructEvent }
}

describe('verifyWebhookSignature — Stripe', () => {
  it('forwards payload + signature + secret to stripe.webhooks.constructEvent', () => {
    const { stripe, constructEvent } = createFakeStripe(() => ({
      type: 'checkout.session.completed',
      livemode: true,
      data: { object: { id: 'cs_123', mode: 'payment' } },
    }))

    const payload = '{"id":"evt_1","type":"checkout.session.completed"}'
    const signature = 't=1700000000,v1=fake-sig'
    const secret = 'whsec_test'

    const event = verifyWebhookSignature({
      provider: 'stripe',
      stripe,
      payload,
      signature,
      secret,
    })

    expect(constructEvent).toHaveBeenCalledTimes(1)
    expect(constructEvent).toHaveBeenCalledWith(payload, signature, secret)
    expect(event.type).toBe('checkout.completed')
    expect(event.livemode).toBe(true)
    if (event.type === 'checkout.completed' && 'sessionId' in event.data) {
      expect(event.data.sessionId).toBe('cs_123')
    }
  })

  it('accepts a Buffer payload (Stripe accepts both string and Buffer)', () => {
    const { stripe, constructEvent } = createFakeStripe(() => ({
      type: 'invoice.payment_succeeded',
      livemode: false,
      data: {
        object: {
          subscription: 'sub_42',
          amount_paid: 1999,
          currency: 'eur',
        },
      },
    }))

    const payload = Buffer.from('{"id":"evt_2"}')
    verifyWebhookSignature({
      provider: 'stripe',
      stripe,
      payload,
      signature: 'sig',
      secret: 'whsec',
    })

    expect(constructEvent).toHaveBeenCalledWith(payload, 'sig', 'whsec')
  })

  it('maps unknown Stripe event types to "unknown"', () => {
    const { stripe } = createFakeStripe(() => ({
      type: 'some.unknown.event',
      livemode: false,
      data: { object: {} },
    }))

    const event = verifyWebhookSignature({
      provider: 'stripe',
      stripe,
      payload: 'x',
      signature: 'sig',
      secret: 'whsec',
    })

    expect(event.type).toBe('unknown')
    expect(event.livemode).toBe(false)
  })

  it('rethrows when stripe.webhooks.constructEvent throws (invalid signature)', () => {
    const { stripe } = createFakeStripe(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    expect(() =>
      verifyWebhookSignature({
        provider: 'stripe',
        stripe,
        payload: 'x',
        signature: 'bad',
        secret: 'whsec',
      })
    ).toThrow('No signatures found matching')
  })

  it('throws when the secret is missing', () => {
    const { stripe, constructEvent } = createFakeStripe(() => ({
      type: 'checkout.session.completed',
      livemode: false,
      data: { object: { id: 'cs', mode: 'payment' } },
    }))

    expect(() =>
      verifyWebhookSignature({
        provider: 'stripe',
        stripe,
        payload: 'x',
        signature: 'sig',
        secret: '',
      })
    ).toThrow('secret is required')
    expect(constructEvent).not.toHaveBeenCalled()
  })

  it('throws when the signature is missing', () => {
    const { stripe, constructEvent } = createFakeStripe(() => ({
      type: 'checkout.session.completed',
      livemode: false,
      data: { object: { id: 'cs', mode: 'payment' } },
    }))

    expect(() =>
      verifyWebhookSignature({
        provider: 'stripe',
        stripe,
        payload: 'x',
        signature: '',
        secret: 'whsec',
      })
    ).toThrow('signature is required')
    expect(constructEvent).not.toHaveBeenCalled()
  })
})
