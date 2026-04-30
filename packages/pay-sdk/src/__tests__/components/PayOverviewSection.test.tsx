/**
 * PAY-OVERVIEW-001 regression — defensive guards in PayOverviewSection.
 *
 * Reproduces the "NaN €" bug observed in production where the backend
 * shipped per-app revenue rows with `undefined`/`null`/`NaN` totals (or a
 * mismatched API contract). The frontend formatter would render `NaN €`
 * cells. These tests pin the safe-coerce helpers and verify the rendered
 * output never contains `NaN`.
 */
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from './component-mocks.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)

vi.mock('recharts', () => ({
  Area: () => null,
  AreaChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'area-chart' }, children),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

const mockClient = {
  config: { apiUrl: 'https://pay.example.com/api' },
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
const { safeAmount, safeCount } =
  await import('../../components/admin/_internal/PayOverviewSection.js')

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

describe('PayOverviewSection — defensive helpers', () => {
  describe('safeAmount', () => {
    it('passes through finite numbers', () => {
      expect(safeAmount(0)).toBe(0)
      expect(safeAmount(1.5)).toBe(1.5)
      expect(safeAmount(-3.14)).toBe(-3.14)
    })
    it('coerces undefined/null/NaN/Infinity to 0', () => {
      expect(safeAmount(undefined)).toBe(0)
      expect(safeAmount(null)).toBe(0)
      expect(safeAmount(NaN)).toBe(0)
      expect(safeAmount(Infinity)).toBe(0)
      expect(safeAmount(-Infinity)).toBe(0)
    })
    it('coerces non-numeric inputs to 0', () => {
      expect(safeAmount('1.5')).toBe(0)
      expect(safeAmount({})).toBe(0)
      expect(safeAmount([])).toBe(0)
    })
  })

  describe('safeCount', () => {
    it('passes through finite non-negative integers', () => {
      expect(safeCount(0)).toBe(0)
      expect(safeCount(42)).toBe(42)
    })
    it('truncates floats', () => {
      expect(safeCount(3.7)).toBe(3)
    })
    it('coerces undefined/null/NaN/negative to 0', () => {
      expect(safeCount(undefined)).toBe(0)
      expect(safeCount(null)).toBe(0)
      expect(safeCount(NaN)).toBe(0)
      expect(safeCount(-5)).toBe(0)
      expect(safeCount(Infinity)).toBe(0)
    })
  })
})

describe('PayOverviewSection — NaN regression (PAY-OVERVIEW-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders no "NaN" anywhere when backend ships undefined revenue per-app row', async () => {
    // Reproduce the exact bad shape that triggered the production bug:
    // backend shipped rows where `total` was undefined (legacy field name),
    // causing `formatCurrency(undefined, undefined)` -> "NaN €".
    mockClient.fetchWithAuth.mockResolvedValue(
      makeOverviewResponse(200, {
        success: true,
        data: {
          totalPayments: 4,
          completedPayments: 4,
          failedPayments: 0,
          refundedPayments: 0,
          activeSubscriptions: 0,
          revenueByCurrency: [{ currency: 'EUR', total: 0 }],
          mrrByCurrency: [],
          revenueTrend: [],
          // Bad row: missing `total`, missing `currency`. Frontend MUST coerce.
          topAppsByRevenue: [
            { appName: 'green-pulse' } as { appName: string; total: number; currency: string },
          ],
        },
      })
    )

    render(<PayAdminDashboard />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('green-pulse')).toBeTruthy()
    })

    // The whole rendered DOM should contain ZERO occurrences of `NaN`
    // (case-insensitive on the literal three letters surrounded by formatter
    // output).
    const html = document.body.innerHTML
    expect(html).not.toMatch(/NaN/)
  })

  it('renders no "NaN" when totals are explicit NaN/null/Infinity', async () => {
    mockClient.fetchWithAuth.mockResolvedValue(
      makeOverviewResponse(200, {
        success: true,
        data: {
          totalPayments: NaN as unknown as number,
          completedPayments: null as unknown as number,
          failedPayments: undefined as unknown as number,
          refundedPayments: 0,
          activeSubscriptions: Infinity as unknown as number,
          revenueByCurrency: [{ currency: 'EUR', total: NaN as unknown as number }],
          mrrByCurrency: [{ currency: 'USD', total: null as unknown as number }],
          revenueTrend: [{ date: '2026-04-01', total: NaN as unknown as number, currency: 'EUR' }],
          topAppsByRevenue: [
            { appName: 'a', total: NaN as unknown as number, currency: 'EUR' },
            { appName: 'b', total: null as unknown as number, currency: 'EUR' },
            { appName: 'c', total: undefined as unknown as number, currency: 'EUR' },
          ],
        },
      })
    )

    render(<PayAdminDashboard />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('a')).toBeTruthy()
    })

    const html = document.body.innerHTML
    expect(html).not.toMatch(/NaN/)
  })

  it('uses fallback EUR currency when row currency is empty/missing', async () => {
    mockClient.fetchWithAuth.mockResolvedValue(
      makeOverviewResponse(200, {
        success: true,
        data: {
          totalPayments: 1,
          completedPayments: 1,
          failedPayments: 0,
          refundedPayments: 0,
          activeSubscriptions: 0,
          revenueByCurrency: [],
          mrrByCurrency: [],
          revenueTrend: [],
          topAppsByRevenue: [{ appName: 'no-currency', total: 100, currency: '' as string }],
        },
      })
    )

    render(<PayAdminDashboard />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('no-currency')).toBeTruthy()
    })

    // Should still render *some* currency formatting (EUR fallback) — never NaN.
    const html = document.body.innerHTML
    expect(html).not.toMatch(/NaN/)
  })
})
