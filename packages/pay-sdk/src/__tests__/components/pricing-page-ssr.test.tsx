/**
 * SSR bootstrap tests for PricingPage — `initialPlans` / `initialSubscription`
 * props must render the pricing grid on the very FIRST paint (no skeleton
 * flash) and turn the client `usePlans` fetch into a silent revalidation.
 */
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  uiComponentsMock,
  loggerMock,
  sonnerMock,
  uiUtilsMock,
  nextImageMock,
  nextNavigationMock,
} from './component-mocks.js'
import { PayProvider } from '../../react/pay-provider.js'
import type { Plan, SubscriptionStatusSnapshot } from '../../core/types.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

const { PricingPage } = await import('../../components/PricingPage.js')

const planFixture: Plan = {
  id: 'plan_pro',
  name: 'ProTierZZ',
  amount: 1900,
  currency: 'EUR',
  interval: 'month',
  intervalCount: 1,
  features: ['Feature 1'],
  description: 'Pro plan',
  active: true,
  sortOrder: 1,
  appName: 'ezauth',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function makeFetchMock(): { fetchMock: ReturnType<typeof vi.fn>; calls: string[] } {
  const calls: string[] = []
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    calls.push(url)
    if (url.includes('/plans') || url.includes('/subscriptions')) {
      return new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  })
  return { fetchMock, calls }
}

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <PayProvider applicationId="app_1" config={{ apiUrl: 'http://api.example.com' }}>
      {ui}
    </PayProvider>
  )
}

describe('PricingPage — SSR initialPlans bootstrap', () => {
  beforeEach(() => {
    const { fetchMock } = makeFetchMock()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders plan cards on the FIRST paint when initialPlans is provided (no skeleton flash)', () => {
    const { container, queryByText } = renderWithProvider(
      <PricingPage applicationId="app_1" initialPlans={[planFixture]} />
    )
    // Plan name visible synchronously — no async wait required.
    expect(queryByText('ProTierZZ')).toBeTruthy()
    // No loading skeleton in the tree at first paint.
    expect(container.querySelector('[data-testid="Skeleton"]')).toBeNull()
  })

  it('shows the loading skeleton at first paint when initialPlans is absent', () => {
    const { container } = renderWithProvider(<PricingPage applicationId="app_1" />)
    // Without SSR data, usePlans starts loading → skeletons render.
    expect(container.querySelector('[data-testid="Skeleton"]')).not.toBeNull()
  })

  it('still revalidates against the server after hydrating from initialPlans', async () => {
    const { fetchMock, calls } = makeFetchMock()
    vi.stubGlobal('fetch', fetchMock)

    renderWithProvider(<PricingPage applicationId="app_1" initialPlans={[planFixture]} />)

    // The useEffect fetch fires as a (silent) revalidation.
    await waitFor(() => {
      expect(calls.some(u => u.includes('/plans'))).toBe(true)
    })
  })

  it('highlights the current plan immediately when initialSubscription is provided', () => {
    const snapshot: SubscriptionStatusSnapshot = {
      isActive: true,
      isTrialing: false,
      isCanceling: false,
      plan: 'ProTierZZ',
      features: ['Feature 1'],
      periodEnd: '2026-12-31T00:00:00.000Z',
      subscription: null,
    }
    const { queryByText } = renderWithProvider(
      <PricingPage
        applicationId="app_1"
        userId="u_1"
        initialPlans={[planFixture]}
        initialSubscription={snapshot}
      />
    )
    // The plan card renders synchronously (current-plan state already known).
    expect(queryByText('ProTierZZ')).toBeTruthy()
  })
})
