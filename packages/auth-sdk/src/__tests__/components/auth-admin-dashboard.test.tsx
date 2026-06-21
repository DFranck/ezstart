import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock all the data hooks used by the four sections so the dashboard renders
// without making any network calls.
vi.mock('../../react/applications.js', () => ({
  useMyApplications: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useApplication: () => ({ data: null, isLoading: false, isError: false }),
  useResolveApplicationByKey: () => ({ data: null, isLoading: false, isError: false }),
  useCreateApplication: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateApplication: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useUpdateApplicationTheme: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRevokeApplication: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../react/admin-analytics.js', () => ({
  useAdminAnalyticsOverview: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  }),
}))

vi.mock('../../react/feature-flags.js', () => ({
  useFeatureFlags: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useUpdateFeatureFlag: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../react/maintenance-mode.js', () => ({
  useMaintenanceMode: () => ({ data: undefined, isLoading: false }),
  useUpdateMaintenanceMode: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../react/admin-error-logs.js', () => ({
  useAdminErrorLogs: () => ({
    data: { items: [], total: 0, limit: 50, offset: 0 },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useAdminErrorLogDetail: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
}))

// Note: useAuthStore is now provided via Context (per-Provider). We wrap the
// dashboard in TestAuthProvider with a pre-seeded store carrying a fake
// access token so the admin sections can read it via the Provider tree.
import { createTestStore, TestAuthProvider } from '../testProvider.js'
import { act } from '@testing-library/react'
import { createTestUser } from '../helpers.js'

const { AuthAdminDashboard } = await import('../../components/AuthAdminDashboard.js')

function renderWithProvider(ui: React.ReactElement) {
  const store = createTestStore()
  act(() => {
    store.getState().setAuth(createTestUser(), 'fake-token', 'localStorage', 'fake-rt')
  })
  return render(<TestAuthProvider store={store}>{ui}</TestAuthProvider>)
}

describe('AuthAdminDashboard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders the five default tab labels', () => {
    renderWithProvider(<AuthAdminDashboard />)
    expect(screen.getByText('Overview')).toBeTruthy()
    expect(screen.getByText('Users')).toBeTruthy()
    expect(screen.getByText('Applications')).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
    // 'Error logs' may match the tab trigger AND the section title in the
    // active panel — getAllByText to acknowledge both.
    expect(screen.getAllByText('Error logs').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the Tabs container', () => {
    const { container } = renderWithProvider(<AuthAdminDashboard />)
    const tabs = container.querySelector('[data-testid="Tabs"]')
    expect(tabs).toBeTruthy()
  })

  it('honors custom tab label texts override', () => {
    renderWithProvider(
      <AuthAdminDashboard
        texts={{
          tabOverview: "Vue d'ensemble",
          tabUsers: 'Utilisateurs',
          tabApplications: 'Apps',
          tabSettings: 'Parametres',
          tabErrorLogs: 'Erreurs',
        }}
      />
    )
    expect(screen.getByText("Vue d'ensemble")).toBeTruthy()
    expect(screen.getByText('Utilisateurs')).toBeTruthy()
    expect(screen.getByText('Apps')).toBeTruthy()
    expect(screen.getByText('Parametres')).toBeTruthy()
    expect(screen.getAllByText('Erreurs').length).toBeGreaterThanOrEqual(1)
  })

  it('accepts a defaultTab override', () => {
    renderWithProvider(<AuthAdminDashboard defaultTab="users" />)
    expect(screen.getByText('Users')).toBeTruthy()
  })
})
