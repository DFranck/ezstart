/**
 * Tests for the EZPay API keys react-query hooks (P6).
 *
 * Strategy: mock `apiCall` from `@ezstart/api-sdk`, render the hooks inside a
 * `QueryClientProvider`, assert the expected URL / method / invalidations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiCall } from '@ezstart/api-sdk'
import {
  usePayKeys,
  useCreatePayKey,
  useRevokePayKey,
  useRotatePayKey,
  usePayKeyUsage,
  PAY_KEYS_QUERY_KEY,
} from '../../react/index.js'
import type {
  PayApiKeyItem,
  CreatePayApiKeyResponse,
  PayApiKeyUsageResponse,
} from '../../core/types.js'

vi.mock('@ezstart/api-sdk', () => ({
  apiCall: vi.fn(),
}))

const mockApiCall = apiCall as ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { Wrapper, queryClient }
}

const fakeKey: PayApiKeyItem = {
  id: 'k_pay_1',
  keyPrefix: 'ez_pk_live_abc',
  name: 'Prod Key',
  applicationId: 'app_1',
  appSlug: 'acme',
  type: 'publishable',
  env: 'live',
  scope: 'user',
  permissions: ['*'],
  status: 'active',
  lastUsedAt: null,
  expiresAt: null,
  createdAt: '2026-01-15T10:00:00Z',
  revokedAt: null,
  quotaMonthly: null,
  usageThisMonth: 12,
}

const fakeCreated: CreatePayApiKeyResponse = {
  id: 'k_pay_2',
  key: 'ez_pk_live_newfullsecret',
  keyPrefix: 'ez_pk_live_new',
  name: 'New Key',
  type: 'publishable',
  env: 'live',
  scope: 'user',
  applicationId: 'app_1',
  appSlug: 'acme',
}

const fakeUsage: PayApiKeyUsageResponse = {
  currentMonth: {
    requestCount: 12,
    topEndpoints: [{ endpoint: '/api/checkout', count: 10 }],
  },
  daily: [{ date: '2026-01-15', requestCount: 3 }],
  quota: { limit: 1000, used: 12, remaining: 988 },
}

describe('usePayKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches keys scoped to an application', async () => {
    mockApiCall.mockResolvedValueOnce([fakeKey])
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => usePayKeys({ applicationId: 'app_1' }), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeKey])
    expect(mockApiCall).toHaveBeenCalledWith('/keys', {
      appName: 'ezpay',
      method: 'GET',
      query: { applicationId: 'app_1' },
    })
  })

  it('fetches all keys when no applicationId is provided', async () => {
    mockApiCall.mockResolvedValueOnce([fakeKey])
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => usePayKeys(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiCall).toHaveBeenCalledWith('/keys', {
      appName: 'ezpay',
      method: 'GET',
      query: undefined,
    })
  })

  it('does not fetch when disabled', () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => usePayKeys({ enabled: false }), {
      wrapper: Wrapper,
    })
    expect(result.current.isFetching).toBe(false)
    expect(mockApiCall).not.toHaveBeenCalled()
  })
})

describe('useCreatePayKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a key, invalidates cache, and calls onSuccess', async () => {
    mockApiCall.mockResolvedValueOnce(fakeCreated)
    const onSuccess = vi.fn()
    const { Wrapper, queryClient } = createWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreatePayKey({ onSuccess }), { wrapper: Wrapper })

    result.current.mutate({
      name: 'New Key',
      applicationId: 'app_1',
      type: 'publishable',
      env: 'live',
      scope: 'user',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledWith(fakeCreated)
    expect(mockApiCall).toHaveBeenCalledWith('/keys', {
      appName: 'ezpay',
      method: 'POST',
      body: {
        name: 'New Key',
        applicationId: 'app_1',
        type: 'publishable',
        env: 'live',
        scope: 'user',
      },
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [...PAY_KEYS_QUERY_KEY],
    })
  })

  it('calls onError on failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('boom'))
    const onError = vi.fn()
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useCreatePayKey({ onError }), {
      wrapper: Wrapper,
    })

    result.current.mutate({ name: 'Bad', applicationId: 'app_1' })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onError).toHaveBeenCalled()
  })
})

describe('useRevokePayKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('revokes a key and invalidates cache', async () => {
    mockApiCall.mockResolvedValueOnce(undefined)
    const onSuccess = vi.fn()
    const { Wrapper, queryClient } = createWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRevokePayKey({ onSuccess }), {
      wrapper: Wrapper,
    })

    result.current.mutate('k_pay_1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalled()
    expect(mockApiCall).toHaveBeenCalledWith('/keys/k_pay_1', {
      appName: 'ezpay',
      method: 'DELETE',
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: [...PAY_KEYS_QUERY_KEY],
    })
  })
})

describe('useRotatePayKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rotates a key and returns the new raw value', async () => {
    mockApiCall.mockResolvedValueOnce(fakeCreated)
    const onSuccess = vi.fn()
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useRotatePayKey({ onSuccess }), {
      wrapper: Wrapper,
    })

    result.current.mutate('k_pay_1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledWith(fakeCreated)
    expect(mockApiCall).toHaveBeenCalledWith('/keys/k_pay_1/rotate', {
      appName: 'ezpay',
      method: 'POST',
    })
  })
})

describe('usePayKeyUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches usage for a key', async () => {
    mockApiCall.mockResolvedValueOnce(fakeUsage)
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => usePayKeyUsage('k_pay_1'), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fakeUsage)
    expect(mockApiCall).toHaveBeenCalledWith('/keys/k_pay_1/usage', {
      appName: 'ezpay',
      method: 'GET',
    })
  })

  it('does not fetch when keyId is null', () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => usePayKeyUsage(null), {
      wrapper: Wrapper,
    })
    expect(result.current.isFetching).toBe(false)
    expect(mockApiCall).not.toHaveBeenCalled()
  })
})
