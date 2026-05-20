/**
 * Wave E MED-2 — `verifyStripeWebhook` binds the test/live mode to the secret
 * that actually verified the signature, never to the payload's self-declared
 * `livemode`.
 *
 * Exercises the REAL `verifyStripeWebhook` (services/stripe.ts) against a mocked
 * pay-sdk where each mode's StripeProvider verifies ONLY against its own webhook
 * secret — the realistic behaviour of `stripe.webhooks.constructEvent`, which
 * validates the HMAC of the payload against a secret and then returns the parsed
 * JSON whose `livemode` field is whatever the signer put there.
 *
 * Security property proven:
 *  - an event signed with the TEST secret but carrying `livemode: true` (or the
 *    inverse: live-signed but `livemode: false`) is REJECTED — the verifier
 *    refuses to trust a payload mode that contradicts the verifying secret.
 *  - honest test/live events verify with the expected `mode`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { WebhookEvent } from '@ezstart/pay-sdk/providers'

// ---------------------------------------------------------------------------
// Mock pay-sdk so each mode's StripeProvider verifies ONLY against its own
// secret — the realistic behaviour of stripe.webhooks.constructEvent.
// ---------------------------------------------------------------------------
vi.mock('@ezstart/pay-sdk/server', () => ({
  createStripeClient: (opts: { secretKey: string }) => ({ __key: opts.secretKey }),
}))

vi.mock('@ezstart/pay-sdk/providers', () => {
  class PaymentProviderRegistry {
    private providers = new Map<string, unknown>()
    private defaultName: string | null = null
    register(provider: { name: string }): void {
      this.providers.set(provider.name, provider)
      if (!this.defaultName) this.defaultName = provider.name
    }
    getDefault(): unknown {
      if (!this.defaultName) throw new Error('No providers registered')
      return this.providers.get(this.defaultName)
    }
  }
  class StripeProvider {
    readonly name = 'stripe'
    private webhookSecret?: string
    constructor(config: { stripe: { __key: string }; webhookSecret?: string }) {
      this.webhookSecret = config.webhookSecret
    }
    // Realistic HMAC behaviour: the "signature" is the secret the signer used.
    // constructEvent succeeds iff that secret == this provider's webhookSecret,
    // then returns the parsed payload (the signer controls `livemode`).
    verifyWebhookSignature(_payload: string | Buffer, signature: string): WebhookEvent {
      if (!this.webhookSecret) throw new Error('Webhook secret not configured for Stripe provider')
      // `signature` carries `${secretUsedToSign}|${jsonPayload}`.
      const [signedWith, json] = String(signature).split('|')
      if (signedWith !== this.webhookSecret || !json) {
        throw new Error('Stripe signature verification failed')
      }
      const parsed = JSON.parse(json) as { type: string; livemode: boolean; id: string }
      return {
        type: parsed.type,
        livemode: parsed.livemode,
        raw: { id: parsed.id, livemode: parsed.livemode },
        data: {},
      } as WebhookEvent
    }
  }
  class ConsoleProvider {
    readonly name = 'console'
  }
  return { PaymentProviderRegistry, StripeProvider, ConsoleProvider }
})

const { verifyStripeWebhook, __resetStripeRegistries } = await import('../../services/stripe.js')

/** Build a signature string the StripeProvider stub understands. */
function sign(secret: string, event: { type: string; livemode: boolean; id: string }): string {
  return `${secret}|${JSON.stringify(event)}`
}

function setEnv(vars: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

describe('verifyStripeWebhook — mode bound to the verifying secret', () => {
  beforeEach(() => {
    __resetStripeRegistries()
    setEnv({
      STRIPE_SECRET_KEY: 'sk_live_REAL',
      STRIPE_TEST_SECRET_KEY: 'sk_test_REAL',
      STRIPE_WEBHOOK_SECRET: 'whsec_LIVE',
      STRIPE_TEST_WEBHOOK_SECRET: 'whsec_TEST',
      PAYMENT_PROVIDER: undefined,
    })
  })

  it('rejects an event signed with the TEST secret but claiming livemode:true', () => {
    // The payload's livemode:true contradicts the verifying (test) secret.
    const forged = { type: 'checkout.completed', livemode: true, id: 'evt_forged_1' }
    const signature = sign('whsec_TEST', forged)

    expect(
      () => verifyStripeWebhook('rawbody', signature),
      'verifyStripeWebhook must reject an event whose payload livemode ' +
        'contradicts the verifying secret — never trust the payload'
    ).toThrow(/livemode mismatch|cross-mode/i)
  })

  it('rejects an event signed with the LIVE secret but claiming livemode:false', () => {
    const forged = { type: 'checkout.completed', livemode: false, id: 'evt_forged_2' }
    expect(() => verifyStripeWebhook('rawbody', sign('whsec_LIVE', forged))).toThrow(
      /livemode mismatch|cross-mode/i
    )
  })

  it('verifies an honest TEST event (test-signed, livemode:false) as mode=test', () => {
    const honest = { type: 'checkout.completed', livemode: false, id: 'evt_test_ok' }
    const { event, mode } = verifyStripeWebhook('rawbody', sign('whsec_TEST', honest))
    expect(mode).toBe('test')
    expect(event.livemode).toBe(false)
  })

  it('verifies an honest LIVE event (live-signed, livemode:true) as mode=live', () => {
    const honest = { type: 'checkout.completed', livemode: true, id: 'evt_live_ok' }
    const { event, mode } = verifyStripeWebhook('rawbody', sign('whsec_LIVE', honest))
    expect(mode).toBe('live')
    expect(event.livemode).toBe(true)
  })
})
