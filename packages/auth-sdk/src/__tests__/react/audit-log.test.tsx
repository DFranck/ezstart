import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiCall } from '@ezstart/api-sdk'
import { useAuditLog } from '../../react/audit-log.js'
import type { AuditLogListResponse } from '../../core/types.js'

const mockApiCall = apiCall as ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const fakeResponse: AuditLogListResponse = {
  items: [
    {
      id: 'log-1',
      userId: 'user-1',
      appName: 'ezauth',
      action: 'login',
      metadata: { ip: '203.0.113.1', userAgent: 'Mozilla/5.0' },
      createdAt: '2026-04-25T12:00:00Z',
      expiresAt: '2026-05-25T12:00:00Z',
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
}

describe('useAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the audit log without filters', async () => {
    mockApiCall.mockResolvedValueOnce(fakeResponse)
    const { result } = renderHook(() => useAuditLog(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fakeResponse)
    expect(mockApiCall).toHaveBeenCalledWith('/auth/me/audit-log', {
      appName: 'ezauth',
      method: 'GET',
    })
  })

  it('forwards limit + offset + action as query params', async () => {
    mockApiCall.mockResolvedValueOnce(fakeResponse)
    const { result } = renderHook(() => useAuditLog({ limit: 50, offset: 100, action: 'login' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiCall).toHaveBeenCalledWith(
      '/auth/me/audit-log?limit=50&offset=100&action=login',
      { appName: 'ezauth', method: 'GET' }
    )
  })

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useAuditLog({}, false), { wrapper: createWrapper() })
    expect(result.current.isFetching).toBe(false)
    expect(mockApiCall).not.toHaveBeenCalled()
  })

  it('caches separately per filter combination', async () => {
    mockApiCall.mockResolvedValue(fakeResponse)
    const wrapper = createWrapper()
    const { result: r1 } = renderHook(() => useAuditLog({ action: 'login' }), { wrapper })
    const { result: r2 } = renderHook(() => useAuditLog({ action: 'logout' }), { wrapper })

    await waitFor(() => expect(r1.current.isSuccess).toBe(true))
    await waitFor(() => expect(r2.current.isSuccess).toBe(true))

    expect(mockApiCall).toHaveBeenCalledTimes(2)
  })
})
