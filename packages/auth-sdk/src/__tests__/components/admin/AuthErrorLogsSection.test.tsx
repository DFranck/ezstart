/**
 * Smoke tests for `<AuthErrorLogsSection>`.
 *
 * Validates the three primary states (loading / empty / loaded with data),
 * the filter UI scaffolding, and the texts override surface. Detail-modal
 * interaction is exercised separately via the public AuthAdminDashboard test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mock the React Query data hooks so the section renders deterministically.
// ---------------------------------------------------------------------------

const mockUseAdminErrorLogs = vi.fn()
const mockUseAdminErrorLogDetail = vi.fn()

vi.mock('../../../react/admin-error-logs.js', () => ({
  useAdminErrorLogs: (...args: unknown[]) => mockUseAdminErrorLogs(...args),
  useAdminErrorLogDetail: (...args: unknown[]) => mockUseAdminErrorLogDetail(...args),
}))

import { createTestStore, TestAuthProvider } from '../../testProvider.js'
import { act } from '@testing-library/react'
import { createTestUser } from '../../helpers.js'

const { AuthErrorLogsSection } =
  await import('../../../components/admin/_internal/AuthErrorLogsSection.js')

function renderWithProvider(ui: React.ReactElement) {
  const store = createTestStore()
  act(() => {
    store.getState().setAuth(createTestUser(), 'fake-token', 'localStorage', 'fake-rt')
  })
  return render(<TestAuthProvider store={store}>{ui}</TestAuthProvider>)
}

describe('<AuthErrorLogsSection />', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseAdminErrorLogs.mockReset()
    mockUseAdminErrorLogDetail.mockReset()
  })

  it('renders the title + filter labels with default English texts', () => {
    mockUseAdminErrorLogs.mockReturnValue({
      data: { items: [], total: 0, limit: 50, offset: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    })

    renderWithProvider(<AuthErrorLogsSection />)
    expect(screen.getByText('Error logs')).toBeTruthy()
    expect(screen.getByText('Level')).toBeTruthy()
    expect(screen.getByText('Status')).toBeTruthy()
    expect(screen.getByText('URL contains')).toBeTruthy()
  })

  it('renders the loading state when isLoading=true', () => {
    mockUseAdminErrorLogs.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    })

    renderWithProvider(<AuthErrorLogsSection />)
    // role="status" + aria-busy="true" wraps the spinner
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-busy')).toBe('true')
  })

  it('renders the empty state when there are zero entries', () => {
    mockUseAdminErrorLogs.mockReturnValue({
      data: { items: [], total: 0, limit: 50, offset: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    })

    renderWithProvider(<AuthErrorLogsSection />)
    expect(screen.getByText(/No errors logged/i)).toBeTruthy()
  })

  it('renders the error state with retry button when isError=true', () => {
    mockUseAdminErrorLogs.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: vi.fn(),
    })

    renderWithProvider(<AuthErrorLogsSection />)
    expect(screen.getByText('Failed to load error logs.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('renders the data table when entries exist', () => {
    mockUseAdminErrorLogs.mockReturnValue({
      data: {
        items: [
          {
            _id: 'abc123',
            timestamp: '2026-04-30T12:00:00Z',
            level: 'error' as const,
            message: 'Something broke',
            errorName: 'TypeError',
            url: '/api/donations/123',
            method: 'POST',
            statusCode: 500,
            userId: 'user-xyz',
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    })

    const { container } = renderWithProvider(<AuthErrorLogsSection />)
    // DataTable is mocked as a passthrough Div in __tests__/setup.ts — we can
    // only assert the table container is rendered + the header summary.
    expect(container.querySelector('[data-testid="DataTable"]')).toBeTruthy()
    const cardTitle = container.querySelector('[data-testid="CardTitle"]')
    expect(cardTitle?.textContent).toContain('1')
    expect(cardTitle?.textContent).toContain('entries')
  })

  it('honors texts override (custom title + filter labels)', () => {
    mockUseAdminErrorLogs.mockReturnValue({
      data: { items: [], total: 0, limit: 50, offset: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    })

    renderWithProvider(
      <AuthErrorLogsSection
        texts={{
          title: 'Journal des erreurs',
          filterLevelLabel: 'Niveau',
          filterStatusLabel: 'Statut',
          filterUrlLabel: 'URL contient',
          empty: 'Aucune erreur enregistrée.',
        }}
      />
    )
    expect(screen.getByText('Journal des erreurs')).toBeTruthy()
    expect(screen.getByText('Niveau')).toBeTruthy()
    expect(screen.getByText('Statut')).toBeTruthy()
    expect(screen.getByText('URL contient')).toBeTruthy()
    expect(screen.getByText('Aucune erreur enregistrée.')).toBeTruthy()
  })
})
