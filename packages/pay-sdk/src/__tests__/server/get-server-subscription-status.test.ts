import { describe, it, expect, vi } from 'vitest'
import { getServerSubscriptionStatus } from '../../server/get-server-subscription-status.js'
import { EMPTY_SUBSCRIPTION_SNAPSHOT } from '../../core/derive-subscription-status.js'
import type { Payment } from '../../core/types.js'

const activeSub: Payment = {
  id: 'pay_1',
  projectId: 'proj_1',
  projectName: 'Acme',
  type: 'subscription',
  amount: 1900,
  currency: 'EUR',
  provider: 'stripe',
  paymentId: 'sub_stripe_1',
  status: 'completed',
  isAnonymous: false,
  liveMode: true,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: '2026-12-31T00:00:00.000Z',
  metadata: {
    planName: 'Pro',
    subscriptionStatus: 'active',
    features: ['Feature 1', 'Feature 2'],
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getServerSubscriptionStatus', () => {
  it('returns null when no auth credential is provided', async () => {
    const fetchImpl = vi.fn()
    const status = await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(status).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('derives an active snapshot from a completed subscription (cookie auth)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [activeSub] }))
    const status = await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      userId: 'u_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(status).toEqual({
      isActive: true,
      isTrialing: false,
      isCanceling: false,
      plan: 'Pro',
      features: ['Feature 1', 'Feature 2'],
      periodEnd: '2026-12-31T00:00:00.000Z',
      subscription: activeSub,
    })
    // Forwards the Cookie header + userId + limit=1.
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('https://api.example.com/api/subscriptions?userId=u_1&limit=1'),
      expect.objectContaining({ headers: expect.objectContaining({ Cookie: 'session=abc' }) })
    )
  })

  it('uses Bearer auth when bearerToken is provided', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [activeSub] }))
    await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      bearerToken: 'tok_123',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok_123' }),
      })
    )
  })

  it('returns the EMPTY snapshot when there is no active subscription', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    const status = await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(status).toEqual(EMPTY_SUBSCRIPTION_SNAPSHOT)
  })

  it('flags trialing + canceling from metadata', async () => {
    const trial: Payment = {
      ...activeSub,
      cancelAtPeriodEnd: true,
      metadata: { planName: 'Pro', subscriptionStatus: 'trialing', features: ['F'] },
    }
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [trial] }))
    const status = await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(status?.isTrialing).toBe(true)
    expect(status?.isCanceling).toBe(true)
  })

  it('resolves features from /plans when subscription metadata has none', async () => {
    const subNoFeatures: Payment = {
      ...activeSub,
      metadata: { planName: 'Pro', subscriptionStatus: 'active' },
    }
    const fetchImpl = vi
      .fn()
      // 1st call: subscriptions
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [subNoFeatures] }))
      // 2nd call: plans
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [{ name: 'Pro', features: ['Plan Feature A', 'Plan Feature B'] }],
        })
      )
    const status = await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(status?.features).toEqual(['Plan Feature A', 'Plan Feature B'])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/api/plans?applicationId=app_1'),
      expect.any(Object)
    )
  })

  it('skips the /plans lookup when skipPlanFeatures is true', async () => {
    const subNoFeatures: Payment = {
      ...activeSub,
      metadata: { planName: 'Pro', subscriptionStatus: 'active' },
    }
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [subNoFeatures] }))
    const status = await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      applicationId: 'app_1',
      skipPlanFeatures: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(status?.features).toEqual([])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('keeps the snapshot when the /plans lookup fails (best-effort)', async () => {
    const subNoFeatures: Payment = {
      ...activeSub,
      metadata: { planName: 'Pro', subscriptionStatus: 'active' },
    }
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [subNoFeatures] }))
      .mockRejectedValueOnce(new Error('plans down'))
    const status = await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      applicationId: 'app_1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(status?.isActive).toBe(true)
    expect(status?.features).toEqual([])
  })

  it('returns null on subscriptions non-2xx', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: false }, 500))
    const status = await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(status).toBeNull()
  })

  it('returns null and logs warn on network error (never throws)', async () => {
    const warn = vi.fn()
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const status = await getServerSubscriptionStatus({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: { warn },
    })
    expect(status).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
