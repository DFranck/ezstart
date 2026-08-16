/**
 * Unit tests for the test/live partition selector in `services/stripe.ts`
 * (Wave E MED-2).
 *
 * Verifies:
 *  - `resolveRequestMode` maps `req.derivedMode` to 'test' | 'live' (default live).
 *  - `getProviderForMode` builds the provider from the MODE's secret key, never
 *    the other mode's — and throws (fail-closed) when that key is absent.
 *  - The fail-safe NEVER falls back to the live key for a test request (the
 *    core MED-2 vulnerability).
 *  - `verifyStripeWebhook` tries the live secret then the test secret and
 *    returns the event from whichever matches.
 *
 * `@ezstart/pay-sdk/server` (`createStripeClient`) and the providers are mocked
 * so the test asserts WHICH secret key was used to build each client without
 * touching the real Stripe SDK or the env-safety guards.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { WebhookEvent } from '@ezstart/pay-sdk/providers'

// --- Mock pay-sdk so we can observe which secret key built each client -------
const createStripeClientMock = vi.fn<(opts: { secretKey: string }) => { __key: string }>()
vi.mock('@ezstart/pay-sdk/server', () => ({
  createStripeClient: (opts: { secretKey: string }) => createStripeClientMock(opts),
}))

// A StripeProvider stub that records the secret key its client was built from
// and exposes a controllable verifyWebhookSignature.
const webhookVerifyByKey = new Map<string, (payload: unknown, sig: string) => WebhookEvent>()

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
    private key: string
    private webhookSecret?: string
    constructor(config: { stripe: { __key: string }; webhookSecret?: string }) {
      this.key = config.stripe.__key
      this.webhookSecret = config.webhookSecret
    }
    verifyWebhookSignature(payload: unknown, sig: string): WebhookEvent {
      const fn = webhookVerifyByKey.get(this.key)
      if (!fn) throw new Error(`no verify stub for key ${this.key}`)
      if (!this.webhookSecret) throw new Error('Webhook secret not configured for Stripe provider')
      return fn(payload, sig)
    }
  }
  class ConsoleProvider {
    readonly name = 'console'
  }
  return { PaymentProviderRegistry, StripeProvider, ConsoleProvider }
})

const {
  resolveRequestMode,
  getProviderForMode,
  isStripeModeUnavailableError,
  verifyStripeWebhook,
  __resetStripeRegistries,
} = await import('../../services/stripe.js')

function setEnv(vars: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

describe('services/stripe — test/live partition (Wave E MED-2)', () => {
  beforeEach(() => {
    __resetStripeRegistries()
    createStripeClientMock.mockReset()
    // The mocked createStripeClient returns a client tagged with its key so we
    // can assert the StripeProvider was built from the correct secret.
    createStripeClientMock.mockImplementation(opts => ({ __key: opts.secretKey }))
    webhookVerifyByKey.clear()
    setEnv({
      STRIPE_SECRET_KEY: 'sk_live_REAL',
      STRIPE_TEST_SECRET_KEY: 'sk_test_REAL',
      STRIPE_WEBHOOK_SECRET: 'whsec_live',
      STRIPE_TEST_WEBHOOK_SECRET: 'whsec_test',
      PAYMENT_PROVIDER: undefined,
    })
  })

  describe('resolveRequestMode', () => {
    it("maps derivedMode 'test' → 'test'", () => {
      expect(resolveRequestMode({ derivedMode: 'test' })).toBe('test')
    })
    it("maps derivedMode 'live' → 'live'", () => {
      expect(resolveRequestMode({ derivedMode: 'live' })).toBe('live')
    })
    it('defaults to live when derivedMode is undefined', () => {
      expect(resolveRequestMode({})).toBe('live')
    })
  })

  describe('getProviderForMode — client selection', () => {
    it('test mode builds the client from STRIPE_TEST_SECRET_KEY', () => {
      getProviderForMode('test')
      expect(createStripeClientMock).toHaveBeenCalledTimes(1)
      expect(createStripeClientMock.mock.calls[0]?.[0]?.secretKey).toBe('sk_test_REAL')
    })

    it('live mode builds the client from STRIPE_SECRET_KEY', () => {
      getProviderForMode('live')
      expect(createStripeClientMock).toHaveBeenCalledTimes(1)
      expect(createStripeClientMock.mock.calls[0]?.[0]?.secretKey).toBe('sk_live_REAL')
    })

    it('memoises the per-mode registry (builds the client once)', () => {
      getProviderForMode('test')
      getProviderForMode('test')
      expect(createStripeClientMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('FAIL-SAFE — never falls back across the test/live boundary', () => {
    it('test mode WITHOUT STRIPE_TEST_SECRET_KEY throws (never uses sk_live_)', () => {
      setEnv({ STRIPE_TEST_SECRET_KEY: undefined })
      __resetStripeRegistries()

      let thrown: unknown
      try {
        getProviderForMode('test')
      } catch (err) {
        thrown = err
      }

      // It MUST throw a 503 mode-unavailable error...
      expect(isStripeModeUnavailableError(thrown)).toBe(true)
      if (isStripeModeUnavailableError(thrown)) {
        expect(thrown.mode).toBe('test')
        expect(thrown.statusCode).toBe(503)
      }
      // ...and it must NEVER have built a client from the live key.
      expect(createStripeClientMock).not.toHaveBeenCalled()
    })

    it('live mode WITHOUT STRIPE_SECRET_KEY throws (never uses sk_test_)', () => {
      setEnv({ STRIPE_SECRET_KEY: undefined })
      __resetStripeRegistries()

      let thrown: unknown
      try {
        getProviderForMode('live')
      } catch (err) {
        thrown = err
      }
      expect(isStripeModeUnavailableError(thrown)).toBe(true)
      expect(createStripeClientMock).not.toHaveBeenCalled()
    })
  })

  describe('verifyStripeWebhook — tries both secrets + binds mode to verifying secret', () => {
    it('returns the event verified by the LIVE secret with mode=live', () => {
      const liveEvent = { type: 'checkout.completed', livemode: true } as WebhookEvent
      webhookVerifyByKey.set('sk_live_REAL', () => liveEvent)
      webhookVerifyByKey.set('sk_test_REAL', () => {
        throw new Error('test secret mismatch')
      })

      const { event, mode } = verifyStripeWebhook('raw', 'sig')
      expect(event).toBe(liveEvent)
      expect(mode).toBe('live')
      expect(event.livemode).toBe(true)
    })

    it('falls through to the TEST secret when the live secret rejects (mode=test)', () => {
      const testEvent = { type: 'checkout.completed', livemode: false } as WebhookEvent
      webhookVerifyByKey.set('sk_live_REAL', () => {
        throw new Error('live secret mismatch')
      })
      webhookVerifyByKey.set('sk_test_REAL', () => testEvent)

      const { event, mode } = verifyStripeWebhook('raw', 'sig')
      expect(event).toBe(testEvent)
      expect(mode).toBe('test')
      expect(event.livemode).toBe(false)
    })

    it('REJECTS a test-secret-signed event that claims livemode:true (HACK E1.5)', () => {
      // Cross-mode forgery: payload says live but only the test secret verifies.
      const forged = { type: 'checkout.completed', livemode: true } as WebhookEvent
      webhookVerifyByKey.set('sk_live_REAL', () => {
        throw new Error('live secret mismatch')
      })
      webhookVerifyByKey.set('sk_test_REAL', () => forged)

      expect(() => verifyStripeWebhook('raw', 'sig')).toThrow(/livemode mismatch|cross-mode/i)
    })

    it('REJECTS a live-secret-signed event that claims livemode:false (HACK E1.5)', () => {
      const forged = { type: 'checkout.completed', livemode: false } as WebhookEvent
      webhookVerifyByKey.set('sk_live_REAL', () => forged)
      expect(() => verifyStripeWebhook('raw', 'sig')).toThrow(/livemode mismatch|cross-mode/i)
    })

    it('throws when neither secret verifies (unverifiable payload never processed)', () => {
      webhookVerifyByKey.set('sk_live_REAL', () => {
        throw new Error('live mismatch')
      })
      webhookVerifyByKey.set('sk_test_REAL', () => {
        throw new Error('test mismatch')
      })
      expect(() => verifyStripeWebhook('raw', 'forged')).toThrow()
    })

    it('skips the test mode when STRIPE_TEST_SECRET_KEY is unset (no fallback build)', () => {
      setEnv({ STRIPE_TEST_SECRET_KEY: undefined })
      __resetStripeRegistries()
      const liveEvent = { type: 'checkout.completed', livemode: true } as WebhookEvent
      webhookVerifyByKey.set('sk_live_REAL', () => liveEvent)

      const { event, mode } = verifyStripeWebhook('raw', 'sig')
      expect(event).toBe(liveEvent)
      expect(mode).toBe('live')
      // Only the live client was built — the unconfigured test mode was skipped.
      expect(createStripeClientMock).toHaveBeenCalledTimes(1)
      expect(createStripeClientMock.mock.calls[0]?.[0]?.secretKey).toBe('sk_live_REAL')
    })
  })
})
