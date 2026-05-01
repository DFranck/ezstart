/**
 * Tests for `createStripeClient` — the agnostic Stripe client factory.
 *
 * No real Stripe HTTP is performed — the `Stripe` constructor is invoked but
 * its first call is the constructor only (no network), which is safe to
 * exercise in unit tests. We assert on:
 *   - the safety guards (live key in dev, test key in prod)
 *   - the default vs explicit `apiVersion` plumbing
 *   - the optional logger contract
 */
import { describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { createStripeClient } from '../../server/stripe-client.js'

describe('createStripeClient', () => {
  it('returns a Stripe SDK instance for a valid test key with default apiVersion', () => {
    const client = createStripeClient({
      secretKey: 'sk_test_abc123',
      env: { isProduction: false, isManagedHost: true },
    })
    expect(client).toBeInstanceOf(Stripe)
  })

  it('forwards the explicit apiVersion when provided', () => {
    // We can't easily inspect Stripe's internal config, but we can prove
    // construction succeeds when an explicit version literal is passed.
    const client = createStripeClient({
      secretKey: 'sk_test_abc123',
      apiVersion: '2025-09-30.clover',
      env: { isProduction: false, isManagedHost: true },
    })
    expect(client).toBeInstanceOf(Stripe)
  })

  it('throws when secretKey is missing', () => {
    expect(() =>
      createStripeClient({
        secretKey: '',
        env: { isProduction: false, isManagedHost: true },
      })
    ).toThrow('secretKey is required')
  })

  it('throws when a sk_live_* key is used in local development', () => {
    expect(() =>
      createStripeClient({
        secretKey: 'sk_live_dangerouslyReal',
        env: { isProduction: false, isManagedHost: false },
      })
    ).toThrow('live Stripe key (sk_live_*) detected in local development')
  })

  it('allows sk_live_* keys when running on a managed host', () => {
    const client = createStripeClient({
      secretKey: 'sk_live_managedHost',
      env: { isProduction: true, isManagedHost: true },
    })
    expect(client).toBeInstanceOf(Stripe)
  })

  it('allows sk_test_* keys in production but warns via the logger', () => {
    const warn = vi.fn()
    const client = createStripeClient({
      secretKey: 'sk_test_inProd',
      env: { isProduction: true, isManagedHost: true },
      logger: { warn, error: vi.fn() },
    })
    expect(client).toBeInstanceOf(Stripe)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/test Stripe key.*production/)
  })

  it('does not throw when no logger is provided (silent default)', () => {
    expect(() =>
      createStripeClient({
        secretKey: 'sk_test_inProd',
        env: { isProduction: true, isManagedHost: true },
      })
    ).not.toThrow()
  })
})
