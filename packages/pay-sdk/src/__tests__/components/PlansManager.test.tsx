/**
 * Tests for PlansManager — the developer dashboard for managing plans.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uiComponentsMock, loggerMock, sonnerMock, uiUtilsMock } from './component-mocks.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)

type PlanShape = {
  id: string
  name: string
  appName: string
  applicationId: string
  description?: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features?: string[]
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const activePlan: PlanShape = {
  id: 'plan_active',
  name: 'Pro',
  appName: 'acme',
  applicationId: 'app_1',
  amount: 1999,
  currency: 'EUR',
  interval: 'month',
  intervalCount: 1,
  features: ['A', 'B'],
  active: true,
  sortOrder: 1,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
}

const inactivePlan: PlanShape = {
  id: 'plan_inactive',
  name: 'Legacy',
  appName: 'acme',
  applicationId: 'app_1',
  amount: 999,
  currency: 'EUR',
  interval: 'month',
  intervalCount: 1,
  features: [],
  active: false,
  sortOrder: 2,
  createdAt: '2025-11-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
}

const mockClient = {
  listPlans: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
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

const { PlansManager } = await import('../../components/PlansManager.js')

function setupPlans(plans: PlanShape[]) {
  const active = plans.filter(p => p.active)
  const inactive = plans.filter(p => !p.active)
  mockClient.listPlans.mockImplementation(async (params: { active?: boolean }) => {
    const data = params?.active === false ? inactive : active
    return {
      success: true,
      data,
      meta: { total: data.length, limit: 100, offset: 0 },
    }
  })
}

async function flushEffects() {
  // Allow the useEffect-triggered async fetch to settle.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('PlansManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the title, subtitle and create button', async () => {
    setupPlans([])
    render(<PlansManager applicationId="app_1" />)
    await flushEffects()
    expect(screen.getByText('Plans')).toBeTruthy()
    expect(screen.getByText('Manage subscription plans for this application')).toBeTruthy()
    expect(screen.getByText('Create Plan')).toBeTruthy()
  })

  it('shows the empty state when there are no plans', async () => {
    setupPlans([])
    render(<PlansManager applicationId="app_1" />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('No plans yet. Create your first plan.')).toBeTruthy()
    })
  })

  it('renders a row per plan when data is loaded', async () => {
    setupPlans([activePlan, inactivePlan])
    render(<PlansManager applicationId="app_1" />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeTruthy()
    })
    expect(screen.getByText('Legacy')).toBeTruthy()
    // Status badges
    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('Inactive')).toBeTruthy()
  })

  it('opens the editor dialog in create mode when Create Plan is clicked', async () => {
    setupPlans([])
    render(<PlansManager applicationId="app_1" />)
    await flushEffects()
    fireEvent.click(screen.getByText('Create Plan'))
    expect(screen.getByText('Create a new plan')).toBeTruthy()
  })

  it('opens the editor in edit mode when the Edit action is clicked', async () => {
    setupPlans([activePlan])
    render(<PlansManager applicationId="app_1" />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByText('Edit plan')).toBeTruthy()
  })

  it('opens the archive confirmation when Archive is clicked', async () => {
    setupPlans([activePlan])
    render(<PlansManager applicationId="app_1" />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('Archive')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Archive'))
    expect(
      screen.getByText(
        'This plan will no longer be available for new subscriptions. Existing subscriptions continue on the archived price.'
      )
    ).toBeTruthy()
  })

  it('calls deletePlan when the archive confirmation is confirmed', async () => {
    setupPlans([activePlan])
    mockClient.deletePlan.mockResolvedValueOnce({ success: true })
    render(<PlansManager applicationId="app_1" />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('Archive')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Archive'))
    // AlertDialog footer renders a second Archive button for confirm (inside
    // AlertDialogAction) — find all and click the confirm one.
    const archiveButtons = screen.getAllByText('Archive')
    // The last one is inside the AlertDialogFooter.
    fireEvent.click(archiveButtons[archiveButtons.length - 1])
    await waitFor(() => {
      expect(mockClient.deletePlan).toHaveBeenCalledWith('plan_active')
    })
  })

  it('shows loading spinner while fetching', async () => {
    // Never-resolving listPlans so we stay in loading state.
    mockClient.listPlans.mockImplementation(() => new Promise(() => {}))
    render(<PlansManager applicationId="app_1" />)
    await flushEffects()
    expect(screen.getByTestId('spinner')).toBeTruthy()
  })

  it('shows an error + retry when fetch fails', async () => {
    mockClient.listPlans.mockRejectedValue(new Error('boom'))
    render(<PlansManager applicationId="app_1" />)
    await flushEffects()
    await waitFor(() => {
      expect(screen.getByText('boom')).toBeTruthy()
    })
    expect(screen.getByText('Retry')).toBeTruthy()
  })
})
