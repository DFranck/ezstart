/**
 * Tests for PricingPage — focuses on `applicationId` / `appName` wiring and
 * deprecation warnings.
 */
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  uiComponentsMock,
  loggerMock,
  sonnerMock,
  uiUtilsMock,
  nextImageMock,
  nextNavigationMock,
} from './component-mocks.js'
import { PayProvider } from '../../react/pay-provider.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

const { PricingPage } = await import('../../components/PricingPage.js')

interface FetchCall {
  url: string
}

function makeFetchMock(): { fetchMock: ReturnType<typeof vi.fn>; calls: FetchCall[] } {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    calls.push({ url })
    // Plans endpoint: return empty list so we don't block on rendering.
    if (url.includes('/plans')) {
      return new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/subscriptions')) {
      return new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  return { fetchMock, calls }
}

// `PricingPage` reads `useSubscriptionStatus` (React Query hook) — every
// render needs a `QueryClientProvider`. Fresh client per test isolates cache.
function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderWithProvider(
  ui: React.ReactElement,
  providerProps: {
    applicationId?: string
    appName?: string
    publishableKey?: string
  } = {}
) {
  const queryClient = makeTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <PayProvider
        applicationId={providerProps.applicationId}
        appName={providerProps.appName}
        publishableKey={providerProps.publishableKey}
        config={{ apiUrl: 'http://api.example.com' }}
      >
        {ui}
      </PayProvider>
    </QueryClientProvider>
  )
}

describe('PricingPage — applicationId / appName wiring', () => {
  beforeEach(() => {
    const { fetchMock } = makeFetchMock()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('forwards applicationId to the /plans query when set on props', async () => {
    const { fetchMock, calls } = makeFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    renderWithProvider(<PricingPage applicationId="app_props_123" />)

    await waitFor(() => {
      expect(calls.some(c => c.url.includes('/plans'))).toBe(true)
    })

    const plansCall = calls.find(c => c.url.includes('/plans'))!
    expect(plansCall.url).toContain('applicationId=app_props_123')
    // Legacy appName should NOT be forwarded when applicationId is present
    expect(plansCall.url).not.toContain('appName=')
  })

  it('falls back to legacy appName and warns when applicationId is absent', async () => {
    const { fetchMock, calls } = makeFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderWithProvider(<PricingPage appName="ezbill" />)

    await waitFor(() => {
      expect(calls.some(c => c.url.includes('/plans'))).toBe(true)
    })

    const plansCall = calls.find(c => c.url.includes('/plans'))!
    expect(plansCall.url).toContain('appName=ezbill')
    expect(warnSpy).toHaveBeenCalled()
    const msg = warnSpy.mock.calls[0]?.[0] as string
    expect(msg).toContain('[pay-sdk]')
    expect(msg).toContain('PricingPage')
    expect(msg).toContain('appName')

    warnSpy.mockRestore()
  })

  it('uses provider-resolved applicationId when props omit it', async () => {
    // Provider will call /keys/config first, then PricingPage loads /plans
    const { fetchMock, calls } = makeFetchMock()
    // Replace the /keys/config response
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      calls.push({ url })
      if (url.includes('/keys/config')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { applicationId: 'app_from_provider', appSlug: 'ezpay' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (url.includes('/plans') || url.includes('/subscriptions')) {
        return new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithProvider(<PricingPage />, { publishableKey: 'ez_pk_test_provider' })

    // Wait for the resolved applicationId to propagate into a /plans call.
    await waitFor(
      () => {
        const plansCalls = calls.filter(c => c.url.includes('/plans'))
        const withAppId = plansCalls.find(c => c.url.includes('applicationId=app_from_provider'))
        expect(withAppId).toBeTruthy()
      },
      { timeout: 2000 }
    )
  })
})
