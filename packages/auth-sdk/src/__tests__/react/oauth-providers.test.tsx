import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiCall } from '@ezstart/api-sdk'
import { useOAuthProviders, useDisconnectOAuthProvider } from '../../react/oauth-providers.js'
import type { ConnectedOAuthProvider } from '../../core/types.js'

const mockApiCall = apiCall as ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const fakeProviders: ConnectedOAuthProvider[] = [
  {
    provider: 'google',
    email: 'me@gmail.com',
    displayName: 'Me',
    connectedAt: '2026-01-01T00:00:00Z',
  },
]

describe('useOAuthProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches providers when enabled', async () => {
    mockApiCall.mockResolvedValueOnce({ providers: fakeProviders })
    const { result } = renderHook(() => useOAuthProviders(true), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fakeProviders)
    expect(mockApiCall).toHaveBeenCalledWith('/auth/me/oauth-providers', {
      appName: 'ezauth',
      method: 'GET',
    })
  })

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useOAuthProviders(false), { wrapper: createWrapper() })
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useDisconnectOAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disconnects a provider and calls onSuccess', async () => {
    mockApiCall.mockResolvedValueOnce(undefined)
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useDisconnectOAuthProvider({ onSuccess }), {
      wrapper: createWrapper(),
    })

    result.current.mutate('google')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalled()
    expect(mockApiCall).toHaveBeenCalledWith('/auth/me/oauth-providers/google', {
      appName: 'ezauth',
      method: 'DELETE',
    })
  })

  it('calls onError on failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('boom'))
    const onError = vi.fn()
    const { result } = renderHook(() => useDisconnectOAuthProvider({ onError }), {
      wrapper: createWrapper(),
    })

    result.current.mutate('google')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onError).toHaveBeenCalled()
  })
})
