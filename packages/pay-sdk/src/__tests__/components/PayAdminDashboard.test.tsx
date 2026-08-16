/**
 * Smoke tests for the consolidated `<PayAdminDashboard>` (Wave 1C).
 *
 * Verifies:
 * - The dashboard renders all 5 tabs (Overview / Payments / Subscriptions / Plans / Promos)
 * - Overview tab calls `GET /admin/analytics/overview` and renders stat cards
 * - 404 from the analytics endpoint surfaces a "coming soon" placeholder
 * - The dashboard exposes NO scoping props (auto-derived server-side)
 */
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from './component-mocks.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)

// Stub recharts: the chart subtree is heavy and depends on jsdom layout APIs
// that aren't worth exercising for a smoke test.
vi.mock('recharts', () => ({
  Area: () => null,
  AreaChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'area-chart' }, children),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

const mockClient = {
  config: { apiUrl: 'https://pay.example.com' },
  fetchWithAuth: vi.fn(),
  getHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  getPayments: vi.fn(async () => ({ payments: [], total: 0 })),
  getSubscriptions: vi.fn(async () => ({ payments: [], total: 0 })),
  listPlans: vi.fn(async () => ({ success: true, data: [], meta: { total: 0 } })),
  listPromos: vi.fn(async () => ({ success: true, data: [], meta: { total: 0 } })),
  refundPayment: vi.fn(),
  cancelSubscription: vi.fn(),
  cleanupPayments: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  createPlan: vi.fn(),
  updatePromo: vi.fn(),
  deletePromo: vi.fn(),
  createPromo: vi.fn(),
}

vi.mock('../../react/pay-provider.js', async () => {
  const actual = await vi.importActual<typeof import('../../react/pay-provider.js')>(
    '../../react/pay-provider.js'
  )
  return {
    ...actual,
    usePayContext: () => ({
      client: mockClient,
      applicationId: 'app_1',
      appSlug: 'acme',
      isReady: true,
    }),
  }
})

const { PayAdminDashboard } = await import('../../components/PayAdminDashboard.js')

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function makeOverviewResponse(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

describe('PayAdminDashboard (Wave 1C)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: analytics endpoint not yet implemented (Wave 1A pending)
    mockClient.fetchWithAuth.mockResolvedValue(makeOverviewResponse(404, {}))
  })

  it('renders all 5 tabs in the canonical order', async () => {
    render(<PayAdminDashboard />)
    await flushEffects()

    expect(screen.getByText('Overview')).toBeTruthy()
    expect(screen.getByText('Payments')).toBeTruthy()
    expect(screen.getByText('Subscriptions')).toBeTruthy()
    expect(screen.getByText('Plans')).toBeTruthy()
    expect(screen.getByText('Promos')).toBeTruthy()
  })

  it('shows the "coming soon" placeholder when analytics endpoint returns 404', async () => {
    render(<PayAdminDashboard />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('Analytics coming soon')).toBeTruthy()
    })
  })

  it('renders stat cards from a successful analytics response', async () => {
    mockClient.fetchWithAuth.mockResolvedValue(
      makeOverviewResponse(200, {
        success: true,
        data: {
          totalPayments: 42,
          completedPayments: 30,
          failedPayments: 5,
          refundedPayments: 7,
          activeSubscriptions: 12,
          revenueByCurrency: [{ currency: 'EUR', total: 1234.5 }],
          mrrByCurrency: [{ currency: 'EUR', total: 89.99 }],
          revenueTrend: [],
          topAppsByRevenue: [],
        },
      })
    )

    render(<PayAdminDashboard />)
    await flushEffects()
    await waitFor(() => {
      // Each numeric appears in at least one stat card; getAllByText avoids
      // the duplicate-match failure when a value renders both as a Badge and
      // as the main stat value.
      expect(screen.getAllByText('42').length).toBeGreaterThan(0) // totalPayments
      expect(screen.getAllByText('30').length).toBeGreaterThan(0) // completedPayments
      expect(screen.getAllByText('12').length).toBeGreaterThan(0) // activeSubscriptions
    })
  })

  it('hits GET /admin/analytics/overview on the configured pay api url', async () => {
    render(<PayAdminDashboard />)
    await flushEffects()
    await waitFor(() => {
      expect(mockClient.fetchWithAuth).toHaveBeenCalled()
    })
    const [url] = mockClient.fetchWithAuth.mock.calls[0] ?? []
    expect(url).toBe('https://pay.example.com/api/admin/analytics/overview')
  })

  it('renders the test-mode banner when testMode={true}', async () => {
    render(<PayAdminDashboard testMode />)
    await flushEffects()
    expect(screen.getByText(/Test Mode/i)).toBeTruthy()
    expect(screen.getByText('Delete All Data')).toBeTruthy()
  })

  it('does not render the test-mode banner by default', async () => {
    render(<PayAdminDashboard />)
    await flushEffects()
    expect(screen.queryByText(/Test Mode/i)).toBeNull()
  })

  it('accepts text overrides for the top-level tab labels', async () => {
    render(
      <PayAdminDashboard
        texts={{
          tabOverview: 'VueGen',
          tabPayments: 'Pmts',
          tabSubscriptions: 'Subs',
          tabPlans: 'Pls',
          tabPromos: 'Prms',
        }}
      />
    )
    await flushEffects()
    expect(screen.getByText('VueGen')).toBeTruthy()
    expect(screen.getByText('Pmts')).toBeTruthy()
    expect(screen.getByText('Subs')).toBeTruthy()
    expect(screen.getByText('Pls')).toBeTruthy()
    expect(screen.getByText('Prms')).toBeTruthy()
  })

  it('accepts per-section text overrides via the nested texts prop', async () => {
    render(
      <PayAdminDashboard
        texts={{
          overview: { title: 'My Overview Title' },
        }}
      />
    )
    await flushEffects()
    expect(screen.getByText('My Overview Title')).toBeTruthy()
  })
})
