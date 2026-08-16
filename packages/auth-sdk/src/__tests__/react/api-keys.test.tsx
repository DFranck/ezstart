import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiCall } from '@ezstart/api-sdk'
import {
  useApiKeys,
  useApiKeyUsage,
  useCreateApiKey,
  useRevokeApiKey,
  useRotateApiKey,
} from '../../react/api-keys.js'
import type { ApiKeyItem, ApiKeyUsageResponse, CreateApiKeyResponse } from '../../core/types.js'

const mockApiCall = apiCall as ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const fakeKey: ApiKeyItem = {
  id: 'k1',
  keyPrefix: 'ezk_abc',
  name: 'Test Key',
  appName: '*',
  permissions: [],
  status: 'active',
  lastUsedAt: null,
  expiresAt: null,
  createdAt: '2025-01-01T00:00:00Z',
  revokedAt: null,
  quotaMonthly: 1000,
  usageThisMonth: 42,
}

const fakeUsage: ApiKeyUsageResponse = {
  currentMonth: { requestCount: 42, topEndpoints: [{ endpoint: '/api/auth/me', count: 30 }] },
  daily: [{ date: '2025-01-15', requestCount: 10 }],
  quota: { limit: 1000, used: 42, remaining: 958 },
}

const fakeCreated: CreateApiKeyResponse = {
  id: 'k2',
  key: 'ezk_full_secret_key',
  keyPrefix: 'ezk_ful',
  name: 'New Key',
}

describe('useApiKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches API keys when enabled', async () => {
    mockApiCall.mockResolvedValueOnce([fakeKey])
    const { result } = renderHook(() => useApiKeys(true), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeKey])
    expect(mockApiCall).toHaveBeenCalledWith('/keys', { appName: 'ezauth', method: 'GET' })
  })

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useApiKeys(false), { wrapper: createWrapper() })
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useApiKeyUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches usage for a key', async () => {
    mockApiCall.mockResolvedValueOnce(fakeUsage)
    const { result } = renderHook(() => useApiKeyUsage('k1', true), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fakeUsage)
    expect(mockApiCall).toHaveBeenCalledWith('/keys/k1/usage', { appName: 'ezauth', method: 'GET' })
  })

  it('does not fetch when keyId is null', () => {
    const { result } = renderHook(() => useApiKeyUsage(null), { wrapper: createWrapper() })
    expect(result.current.isFetching).toBe(false)
  })
})

describe('useCreateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a key and calls onSuccess', async () => {
    mockApiCall.mockResolvedValueOnce(fakeCreated)
    const onSuccess = vi.fn()
    const { result } = renderHook(
      () => useCreateApiKey({ onSuccess }),
      { wrapper: createWrapper() }
    )

    result.current.mutate({ name: 'New Key', appName: '*', expiresAt: null })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledWith(fakeCreated)
    expect(mockApiCall).toHaveBeenCalledWith('/keys', {
      appName: 'ezauth',
      method: 'POST',
      body: { name: 'New Key', appName: '*', expiresAt: null },
    })
  })

  it('calls onError on failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('fail'))
    const onError = vi.fn()
    const { result } = renderHook(
      () => useCreateApiKey({ onError }),
      { wrapper: createWrapper() }
    )

    result.current.mutate({ name: 'Bad', appName: '*', expiresAt: null })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onError).toHaveBeenCalled()
  })
})

describe('useRevokeApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('revokes a key', async () => {
    mockApiCall.mockResolvedValueOnce(undefined)
    const onSuccess = vi.fn()
    const { result } = renderHook(
      () => useRevokeApiKey({ onSuccess }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('k1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalled()
    expect(mockApiCall).toHaveBeenCalledWith('/keys/k1', { appName: 'ezauth', method: 'DELETE' })
  })
})

describe('useRotateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rotates a key and returns new key', async () => {
    mockApiCall.mockResolvedValueOnce(fakeCreated)
    const onSuccess = vi.fn()
    const { result } = renderHook(
      () => useRotateApiKey({ onSuccess }),
      { wrapper: createWrapper() }
    )

    result.current.mutate('k1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledWith(fakeCreated)
    expect(mockApiCall).toHaveBeenCalledWith('/keys/k1/rotate', { appName: 'ezauth', method: 'POST' })
  })
})
