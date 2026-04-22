/**
 * StripeProvider — Connect application fee handling
 *
 * Regression coverage for the `application_fee_percent` bug:
 * `createSubscriptionCheckout` previously forwarded `applicationFeeAmount` (cents) into
 * `application_fee_percent` (expected 0-100). The fix adds `applicationFeePercent` on
 * `ConnectParams` and keeps a legacy derivation for callers that only pass the cents amount.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheckoutOptions, SubscriptionCheckoutOptions } from '../../core/providers/types.js'
import { StripeProvider, type StripeInstance } from '../../core/providers/stripe.js'

// ========================================
// Helpers — fake Stripe SDK
// ========================================

interface FakeStripeCalls {
  sessionCreate: ReturnType<typeof vi.fn>
  couponCreate: ReturnType<typeof vi.fn>
}

function createFakeStripe(): { stripe: StripeInstance; calls: FakeStripeCalls } {
  const sessionCreate = vi.fn(async (_params: Record<string, unknown>) => ({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.test/cs_test_123',
  }))
  const couponCreate = vi.fn(async (_params: Record<string, unknown>) => ({ id: 'coupon_123' }))

  const stripe: StripeInstance = {
    checkout: {
      sessions: {
        create: sessionCreate,
        retrieve: vi.fn(async () => ({ payment_status: 'paid', status: 'complete' })),
      },
    },
    coupons: { create: couponCreate },
    refunds: { create: vi.fn() },
    subscriptions: { cancel: vi.fn(), update: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  }

  return { stripe, calls: { sessionCreate, couponCreate } }
}

function baseSubOptions(
  overrides: Partial<SubscriptionCheckoutOptions> = {}
): SubscriptionCheckoutOptions {
  return {
    amount: 100, // $100.00 → 10000 cents
    currency: 'USD',
    description: 'Pro plan',
    metadata: {},
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    interval: 'month',
    ...overrides,
  }
}

function baseOneShotOptions(overrides: Partial<CheckoutOptions> = {}): CheckoutOptions {
  return {
    amount: 100, // $100.00 → 10000 cents
    currency: 'USD',
    description: 'One-time purchase',
    metadata: {},
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    ...overrides,
  }
}

function getSubscriptionData(params: Record<string, unknown>): Record<string, unknown> | undefined {
  return params.subscription_data as Record<string, unknown> | undefined
}

function getPaymentIntentData(
  params: Record<string, unknown>
): Record<string, unknown> | undefined {
  return params.payment_intent_data as Record<string, unknown> | undefined
}

// ========================================
// Tests
// ========================================

describe('StripeProvider — subscription connect fee', () => {
  let fake: ReturnType<typeof createFakeStripe>
  let provider: StripeProvider

  beforeEach(() => {
    fake = createFakeStripe()
    provider = new StripeProvider({ stripe: fake.stripe })
  })

  it('forwards applicationFeePercent as application_fee_percent (no conversion)', async () => {
    await provider.createSubscriptionCheckout(
      baseSubOptions({
        connect: {
          destinationAccountId: 'acct_connected',
          applicationFeePercent: 3,
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const subData = getSubscriptionData(call)
    expect(subData).toBeDefined()
    expect(subData?.application_fee_percent).toBe(3)
    expect(subData?.transfer_data).toEqual({ destination: 'acct_connected' })
  })

  it('accepts applicationFeePercent = 0 (no platform fee)', async () => {
    await provider.createSubscriptionCheckout(
      baseSubOptions({
        connect: {
          destinationAccountId: 'acct_connected',
          applicationFeePercent: 0,
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const subData = getSubscriptionData(call)
    expect(subData?.application_fee_percent).toBe(0)
  })

  it('rounds applicationFeePercent to 2 decimals', async () => {
    await provider.createSubscriptionCheckout(
      baseSubOptions({
        connect: {
          destinationAccountId: 'acct_connected',
          applicationFeePercent: 3.12345,
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const subData = getSubscriptionData(call)
    expect(subData?.application_fee_percent).toBe(3.12)
  })

  it('throws when applicationFeePercent > 100', async () => {
    await expect(
      provider.createSubscriptionCheckout(
        baseSubOptions({
          connect: {
            destinationAccountId: 'acct_connected',
            applicationFeePercent: 101,
          },
        })
      )
    ).rejects.toThrow(/between 0 and 100/)
  })

  it('throws when applicationFeePercent < 0', async () => {
    await expect(
      provider.createSubscriptionCheckout(
        baseSubOptions({
          connect: {
            destinationAccountId: 'acct_connected',
            applicationFeePercent: -1,
          },
        })
      )
    ).rejects.toThrow(/between 0 and 100/)
  })

  it('derives percent from legacy applicationFeeAmount (cents / unitAmount * 100)', async () => {
    // 300 cents fee / 10000 cents price = 3%
    await provider.createSubscriptionCheckout(
      baseSubOptions({
        amount: 100, // 10000 cents
        connect: {
          destinationAccountId: 'acct_connected',
          applicationFeeAmount: 300,
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const subData = getSubscriptionData(call)
    expect(subData?.application_fee_percent).toBe(3)
    // Critical regression assertion: we must NOT have forwarded the raw cents amount.
    expect(subData?.application_fee_percent).not.toBe(300)
  })

  it('derives percent with 2-decimal rounding from legacy amount', async () => {
    // 123 cents / 10000 cents = 1.23%
    await provider.createSubscriptionCheckout(
      baseSubOptions({
        amount: 100,
        connect: {
          destinationAccountId: 'acct_connected',
          applicationFeeAmount: 123,
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const subData = getSubscriptionData(call)
    expect(subData?.application_fee_percent).toBe(1.23)
  })

  it('prefers applicationFeePercent over legacy applicationFeeAmount when both are provided', async () => {
    await provider.createSubscriptionCheckout(
      baseSubOptions({
        amount: 100,
        connect: {
          destinationAccountId: 'acct_connected',
          applicationFeePercent: 7,
          applicationFeeAmount: 999, // should be ignored
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const subData = getSubscriptionData(call)
    expect(subData?.application_fee_percent).toBe(7)
  })

  it('throws when legacy applicationFeeAmount is provided with zero-amount subscription', async () => {
    await expect(
      provider.createSubscriptionCheckout(
        baseSubOptions({
          amount: 0,
          connect: {
            destinationAccountId: 'acct_connected',
            applicationFeeAmount: 100,
          },
        })
      )
    ).rejects.toThrow(/unit amount is zero or negative/)
  })

  it('omits application_fee_percent when neither fee is provided but keeps transfer_data', async () => {
    await provider.createSubscriptionCheckout(
      baseSubOptions({
        connect: {
          destinationAccountId: 'acct_connected',
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const subData = getSubscriptionData(call)
    expect(subData).toBeDefined()
    expect(subData?.application_fee_percent).toBeUndefined()
    expect(subData?.transfer_data).toEqual({ destination: 'acct_connected' })
  })
})

describe('StripeProvider — one-shot connect fee', () => {
  let fake: ReturnType<typeof createFakeStripe>
  let provider: StripeProvider

  beforeEach(() => {
    fake = createFakeStripe()
    provider = new StripeProvider({ stripe: fake.stripe })
  })

  it('forwards applicationFeeAmount as application_fee_amount (cents, no conversion)', async () => {
    await provider.createCheckoutSession(
      baseOneShotOptions({
        connect: {
          destinationAccountId: 'acct_connected',
          applicationFeeAmount: 500,
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const piData = getPaymentIntentData(call)
    expect(piData).toBeDefined()
    expect(piData?.application_fee_amount).toBe(500)
    // One-shot must NOT receive application_fee_percent
    expect(piData?.application_fee_percent).toBeUndefined()
    expect(piData?.transfer_data).toEqual({ destination: 'acct_connected' })
  })

  it('omits application_fee_amount when no fee is provided but keeps transfer_data', async () => {
    await provider.createCheckoutSession(
      baseOneShotOptions({
        connect: {
          destinationAccountId: 'acct_connected',
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const piData = getPaymentIntentData(call)
    expect(piData).toBeDefined()
    expect(piData?.application_fee_amount).toBeUndefined()
    expect(piData?.transfer_data).toEqual({ destination: 'acct_connected' })
  })

  it('ignores applicationFeePercent on one-shot (one-shots use cents only)', async () => {
    await provider.createCheckoutSession(
      baseOneShotOptions({
        connect: {
          destinationAccountId: 'acct_connected',
          applicationFeePercent: 3, // irrelevant for one-shots
        },
      })
    )

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const piData = getPaymentIntentData(call)
    expect(piData?.application_fee_amount).toBeUndefined()
    expect(piData?.application_fee_percent).toBeUndefined()
    expect(piData?.transfer_data).toEqual({ destination: 'acct_connected' })
  })
})

// ========================================
// P9-A — Trial period days
// ========================================

describe('StripeProvider — trial period days', () => {
  let fake: ReturnType<typeof createFakeStripe>
  let provider: StripeProvider

  beforeEach(() => {
    fake = createFakeStripe()
    provider = new StripeProvider({ stripe: fake.stripe })
  })

  it('forwards trialPeriodDays into subscription_data.trial_period_days', async () => {
    await provider.createSubscriptionCheckout(baseSubOptions({ trialPeriodDays: 14 }))

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    const subData = getSubscriptionData(call)
    expect(subData).toBeDefined()
    expect(subData?.trial_period_days).toBe(14)
  })

  it('omits subscription_data.trial_period_days when trialPeriodDays is 0 or undefined', async () => {
    await provider.createSubscriptionCheckout(baseSubOptions({ trialPeriodDays: 0 }))

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(getSubscriptionData(call)).toBeUndefined()

    fake.calls.sessionCreate.mockClear()
    await provider.createSubscriptionCheckout(baseSubOptions())
    const call2 = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(getSubscriptionData(call2)).toBeUndefined()
  })
})

// ========================================
// P9-C — Stripe automatic tax
// ========================================

describe('StripeProvider — automatic tax', () => {
  let fake: ReturnType<typeof createFakeStripe>
  let provider: StripeProvider

  beforeEach(() => {
    fake = createFakeStripe()
    provider = new StripeProvider({ stripe: fake.stripe })
  })

  it('sets automatic_tax on subscription checkout when automaticTax is true', async () => {
    await provider.createSubscriptionCheckout(baseSubOptions({ automaticTax: true }))

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.automatic_tax).toEqual({ enabled: true })
  })

  it('sets automatic_tax on one-shot checkout when automaticTax is true', async () => {
    await provider.createCheckoutSession(baseOneShotOptions({ automaticTax: true }))

    const call = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.automatic_tax).toEqual({ enabled: true })
  })

  it('omits automatic_tax when automaticTax is false or undefined', async () => {
    await provider.createSubscriptionCheckout(baseSubOptions({ automaticTax: false }))
    const call1 = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call1.automatic_tax).toBeUndefined()

    fake.calls.sessionCreate.mockClear()
    await provider.createCheckoutSession(baseOneShotOptions())
    const call2 = fake.calls.sessionCreate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call2.automatic_tax).toBeUndefined()
  })
})
