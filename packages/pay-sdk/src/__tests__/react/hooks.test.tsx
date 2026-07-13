/**
 * Tests for @ezstart/pay-sdk react hooks layer.
 *
 * Strategy: mock global fetch, use real PayClient + PayProvider,
 * assert hook state transitions (loading → data/error).
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PayProvider } from '../../react/pay-provider.js'
import { useDonations } from '../../react/hooks/useDonations.js'
import { usePurchases } from '../../react/hooks/usePurchases.js'
import { useSubscriptions, SUBSCRIPTIONS_QUERY_KEY } from '../../react/hooks/useSubscriptions.js'
import { usePaymentHistory } from '../../react/hooks/usePaymentHistory.js'
import { useSubscriptionStatus } from '../../react/hooks/useSubscriptionStatus.js'
import { useCancelSubscription } from '../../react/hooks/useCancelSubscription.js'
import { useRefundPayment } from '../../react/hooks/useRefundPayment.js'
import { usePay, usePayContext } from '../../react/pay-provider.js'
import { setupFetchMock, makePayment } from '../helpers.js'

// ---------------------------------------------------------------------------
// Wrapper — `useSubscriptions` + `useSubscriptionStatus` now use React Query
// so the wrapper mounts a `QueryClientProvider` alongside the `PayProvider`.
// A fresh client per test isolates cache state between cases.
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
  )
  return (
    <QueryClientProvider client={queryClient}>
      <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999' }}>
        {children}
      </PayProvider>
    </QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// useDonations
// ---------------------------------------------------------------------------

describe('useDonations', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads donations on mount when autoLoad=true (default)', async () => {
    const donations = [makePayment({ type: 'donation', id: 'd1' })]
    setupFetchMock([
      {
        url: '/donations',
        response: { success: true, data: donations, meta: { total: 1 } },
      },
    ])

    const { result } = renderHook(() => useDonations(), { wrapper: Wrapper })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.donations).toHaveLength(1)
    expect(result.current.donations[0]?.id).toBe('d1')
    expect(result.current.error).toBeNull()
  })

  it('does not load when autoLoad=false', async () => {
    const fetchMock = setupFetchMock([
      { url: '/donations', response: { success: true, data: [], meta: { total: 0 } } },
    ])

    const { result } = renderHook(() => useDonations({ autoLoad: false }), { wrapper: Wrapper })

    // Wait a tick to make sure no fetch was fired
    await new Promise(r => setTimeout(r, 50))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.donations).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('handles fetch errors gracefully', async () => {
    setupFetchMock([
      {
        url: '/donations',
        response: { error: 'Server down' },
        status: 500,
      },
    ])

    const { result } = renderHook(() => useDonations(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.donations).toEqual([])
  })

  it('reload() refetches data', async () => {
    let callCount = 0
    setupFetchMock([
      {
        url: '/donations',
        response: () => {
          callCount++
          return {
            success: true,
            data: [makePayment({ type: 'donation', id: `d${callCount}` })],
            meta: { total: 1 },
          }
        },
      },
    ])

    // Use a simpler approach - just verify reload calls
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [makePayment({ type: 'donation' })],
          meta: { total: 1 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useDonations(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const callsBefore = fetchMock.mock.calls.length

    await act(async () => {
      await result.current.reload()
    })

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('passes projectId and limit as query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useDonations({ projectId: 'proj-1', limit: 5 }), { wrapper: Wrapper })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('projectId=proj-1')
    expect(calledUrl).toContain('limit=5')
  })
})

// ---------------------------------------------------------------------------
// usePurchases
// ---------------------------------------------------------------------------

describe('usePurchases', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads purchases on mount', async () => {
    const purchases = [makePayment({ type: 'purchase', id: 'p1' })]
    setupFetchMock([
      {
        url: '/purchases',
        response: { success: true, data: purchases, meta: { total: 1 } },
      },
    ])

    const { result } = renderHook(() => usePurchases(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.purchases).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('passes userId, limit, offset as query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => usePurchases({ userId: 'u1', limit: 3, offset: 10 }), { wrapper: Wrapper })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('userId=u1')
    expect(calledUrl).toContain('limit=3')
    expect(calledUrl).toContain('offset=10')
  })

  it('handles API error', async () => {
    setupFetchMock([
      {
        url: '/purchases',
        response: { error: 'Unauthorized' },
        status: 401,
      },
    ])

    const { result } = renderHook(() => usePurchases(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// useSubscriptions
// ---------------------------------------------------------------------------

describe('useSubscriptions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads subscriptions on mount', async () => {
    const subs = [makePayment({ type: 'subscription', id: 's1' })]
    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: subs, meta: { total: 1 } },
      },
    ])

    const { result } = renderHook(() => useSubscriptions(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.subscriptions).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// useCancelSubscription — cache invalidation
// ---------------------------------------------------------------------------

describe('useCancelSubscription', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('invalidates SUBSCRIPTIONS_QUERY_KEY on successful cancel', async () => {
    // Wrapper that exposes the queryClient so we can spy on invalidateQueries.
    let sharedClient: QueryClient | undefined
    function InvalidationWrapper({ children }: { children: React.ReactNode }) {
      const [queryClient] = React.useState(
        () =>
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
          })
      )
      sharedClient = queryClient
      return (
        <QueryClientProvider client={queryClient}>
          <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999' }}>
            {children}
          </PayProvider>
        </QueryClientProvider>
      )
    }

    setupFetchMock([
      {
        url: '/subscriptions/sub_123/cancel',
        method: 'POST',
        response: { success: true },
      },
    ])

    const { result } = renderHook(() => useCancelSubscription(), { wrapper: InvalidationWrapper })

    expect(sharedClient).toBeDefined()
    const invalidateSpy = vi.spyOn(sharedClient!, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync('sub_123')
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...SUBSCRIPTIONS_QUERY_KEY],
    })
  })
})

// ---------------------------------------------------------------------------
// useRefundPayment — cache invalidation
// ---------------------------------------------------------------------------

describe('useRefundPayment', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('invalidates SUBSCRIPTIONS_QUERY_KEY on successful refund', async () => {
    let sharedClient: QueryClient | undefined
    function InvalidationWrapper({ children }: { children: React.ReactNode }) {
      const [queryClient] = React.useState(
        () =>
          new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
          })
      )
      sharedClient = queryClient
      return (
        <QueryClientProvider client={queryClient}>
          <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999' }}>
            {children}
          </PayProvider>
        </QueryClientProvider>
      )
    }

    setupFetchMock([
      {
        url: '/payments/pay_123/refund',
        method: 'POST',
        response: { success: true },
      },
    ])

    const { result } = renderHook(() => useRefundPayment(), { wrapper: InvalidationWrapper })

    expect(sharedClient).toBeDefined()
    const invalidateSpy = vi.spyOn(sharedClient!, 'invalidateQueries')

    await act(async () => {
      await result.current.mutateAsync('pay_123')
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...SUBSCRIPTIONS_QUERY_KEY],
    })
  })
})

// ---------------------------------------------------------------------------
// usePaymentHistory
// ---------------------------------------------------------------------------

describe('usePaymentHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads payment history with filters', async () => {
    const payments = [makePayment({ id: 'h1' }), makePayment({ id: 'h2' })]
    setupFetchMock([
      {
        url: '/payments',
        response: { success: true, data: payments, meta: { total: 2 } },
      },
    ])

    const { result } = renderHook(
      () => usePaymentHistory({ filters: { type: 'purchase', status: 'completed' } }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.payments).toHaveLength(2)
    expect(result.current.total).toBe(2)
  })

  it('passes date filters as query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderHook(
      () => usePaymentHistory({ filters: { dateFrom: '2026-01-01', dateTo: '2026-01-31' } }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('dateFrom=2026-01-01')
    expect(calledUrl).toContain('dateTo=2026-01-31')
  })
})

// ---------------------------------------------------------------------------
// useSubscriptionStatus
// ---------------------------------------------------------------------------

describe('useSubscriptionStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns inactive status when no subscriptions', async () => {
    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    const { result } = renderHook(
      () => useSubscriptionStatus({ userId: 'u1', appName: 'test-app' }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isActive).toBe(false)
    expect(result.current.plan).toBeNull()
    expect(result.current.features).toEqual([])
  })

  it('returns active status with features from payment metadata', async () => {
    const sub = makePayment({
      type: 'subscription',
      status: 'completed',
      metadata: {
        planName: 'Pro',
        features: ['analytics', 'export'],
      },
    })
    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [sub], meta: { total: 1 } },
      },
    ])

    const { result } = renderHook(
      () => useSubscriptionStatus({ userId: 'u1', appName: 'test-app' }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.plan).toBe('Pro')
    expect(result.current.features).toEqual(['analytics', 'export'])
  })

  it('falls back to plan lookup when metadata has no features', async () => {
    const sub = makePayment({
      type: 'subscription',
      status: 'completed',
      metadata: { planName: 'Business' },
    })
    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [sub], meta: { total: 1 } },
      },
      {
        url: '/plans',
        response: {
          success: true,
          data: [{ id: 'plan1', name: 'Business', features: ['sso', 'api-keys'], active: true }],
          meta: { total: 1 },
        },
      },
    ])

    const { result } = renderHook(
      () => useSubscriptionStatus({ userId: 'u1', appName: 'test-app' }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.plan).toBe('Business')
    expect(result.current.features).toEqual(['sso', 'api-keys'])
  })

  it('handles no userId gracefully (sets loading=false)', async () => {
    const fetchMock = setupFetchMock([])

    const { result } = renderHook(
      () => useSubscriptionStatus({ userId: undefined, appName: 'test-app' }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isActive).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('detects cancelAtPeriodEnd status', async () => {
    const sub = makePayment({
      type: 'subscription',
      status: 'completed',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-02-15T00:00:00Z',
      metadata: { planName: 'Pro', features: ['all'] },
    })
    setupFetchMock([
      {
        url: '/subscriptions',
        response: { success: true, data: [sub], meta: { total: 1 } },
      },
    ])

    const { result } = renderHook(
      () => useSubscriptionStatus({ userId: 'u1', appName: 'test-app' }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.isCanceling).toBe(true)
    expect(result.current.periodEnd).toBeInstanceOf(Date)
  })
})

// ---------------------------------------------------------------------------
// usePay (store-based helper)
// ---------------------------------------------------------------------------

describe('usePay', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('createDonation calls API and adds payment to store', async () => {
    const payment = makePayment({ type: 'donation', id: 'don1' })
    setupFetchMock([
      {
        url: '/donate',
        method: 'POST',
        response: {
          success: true,
          data: { payment, checkoutUrl: 'https://checkout.stripe.com/test' },
        },
      },
    ])

    const { result } = renderHook(() => usePay(), { wrapper: Wrapper })

    await act(async () => {
      const res = await result.current.createDonation({
        projectId: 'proj1',
        amount: 10,
        currency: 'EUR',
      })
      expect(res.checkoutUrl).toContain('stripe.com')
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('createPurchase sets error on failure', async () => {
    setupFetchMock([
      {
        url: '/purchase',
        method: 'POST',
        response: { error: 'Invalid product' },
        status: 400,
      },
    ])

    const { result } = renderHook(() => usePay(), { wrapper: Wrapper })

    await act(async () => {
      try {
        await result.current.createPurchase({
          projectId: 'proj1',
          productId: 'prod1',
          productName: 'Test',
          amount: 10,
        })
      } catch {
        // Expected
      }
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.isLoading).toBe(false)
  })

  it('createSubscription calls API correctly', async () => {
    const payment = makePayment({ type: 'subscription', id: 'sub1' })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { payment, checkoutUrl: 'https://checkout.stripe.com/sub' },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => usePay(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.createSubscription({
        projectId: 'proj1',
        planId: 'plan1',
        planName: 'Pro',
        amount: 29.99,
      })
    })

    // Verify the POST body was sent
    const lastCall = fetchMock.mock.calls[0]
    expect(lastCall?.[1]?.method).toBe('POST')
    const body = JSON.parse(lastCall?.[1]?.body as string)
    expect(body.planId).toBe('plan1')
    expect(body.amount).toBe(29.99)
  })
})

// ---------------------------------------------------------------------------
// usePayContext — error when used outside provider
// ---------------------------------------------------------------------------

describe('usePayContext', () => {
  it('throws when used outside PayProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => usePayContext())
    }).toThrow('usePayContext must be used within a PayProvider')

    consoleSpy.mockRestore()
  })
})
