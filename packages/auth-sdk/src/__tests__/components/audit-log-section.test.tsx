import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiCall } from '@ezstart/api-sdk'
import { AuditLogSection } from '../../components/audit-log-section.js'
import type { AuditLogListResponse } from '../../core/types.js'

const mockApiCall = apiCall as ReturnType<typeof vi.fn>

function renderWithClient(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    React.createElement(QueryClientProvider, { client: queryClient }, node as React.ReactElement)
  )
}

const fakeResponse: AuditLogListResponse = {
  items: [
    {
      id: 'log-1',
      userId: 'user-1',
      appName: 'ezauth',
      action: 'login',
      metadata: { ip: '203.0.113.1' },
      createdAt: '2026-04-25T12:00:00Z',
      expiresAt: '2026-05-25T12:00:00Z',
    },
    {
      id: 'log-2',
      userId: 'user-1',
      appName: 'ezauth',
      action: 'password_change',
      metadata: { ip: '203.0.113.1' },
      createdAt: '2026-04-24T12:00:00Z',
      expiresAt: '2026-05-24T12:00:00Z',
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
}

describe('<AuditLogSection />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the title and retention badge', async () => {
    mockApiCall.mockResolvedValueOnce(fakeResponse)
    renderWithClient(<AuditLogSection />)
    await waitFor(() =>
      expect(mockApiCall).toHaveBeenCalledWith(expect.stringContaining('/auth/me/audit-log'), {
        appName: 'ezauth',
        method: 'GET',
      })
    )
    expect(screen.getByText('Activity log')).toBeTruthy()
    expect(screen.getByText('Last 30 days')).toBeTruthy()
  })

  it('shows retention=Pro when plan="pro"', async () => {
    mockApiCall.mockResolvedValueOnce({ ...fakeResponse, items: [] })
    renderWithClient(<AuditLogSection plan="pro" />)
    await waitFor(() => expect(mockApiCall).toHaveBeenCalled())
    expect(screen.getByText('Last 365 days')).toBeTruthy()
  })

  it('renders an empty state when no entries exist', async () => {
    mockApiCall.mockResolvedValueOnce({ ...fakeResponse, items: [], total: 0 })
    renderWithClient(<AuditLogSection />)
    await waitFor(() => expect(screen.getByText('No activity recorded yet.')).toBeTruthy())
  })

  it('shows the error state with retry button on failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('boom'))
    renderWithClient(<AuditLogSection />)
    await waitFor(() => expect(screen.getByText('Failed to load activity log.')).toBeTruthy())
    expect(screen.getByText('Retry')).toBeTruthy()
  })

  it('skips fetching when enabled=false', () => {
    renderWithClient(<AuditLogSection enabled={false} />)
    expect(mockApiCall).not.toHaveBeenCalled()
  })

  it('honours custom texts overrides', async () => {
    mockApiCall.mockResolvedValueOnce({ ...fakeResponse, items: [], total: 0 })
    renderWithClient(
      <AuditLogSection
        texts={{
          title: 'Mon journal',
          empty: 'Aucune activité',
        }}
      />
    )
    expect(screen.getByText('Mon journal')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Aucune activité')).toBeTruthy())
  })
})
