import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiCall } from '@ezstart/api-sdk'
import {
  useMyApplications,
  useApplication,
  useResolveApplicationByKey,
  useCreateApplication,
  useUpdateApplication,
  useRevokeApplication,
} from '../../react/applications.js'
import type { Application, ApplicationResolveResponse } from '../../core/types.js'

const mockApiCall = apiCall as ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const fakeApp: Application = {
  id: 'app_1',
  slug: 'acme',
  name: 'Acme Corp',
  description: 'Acme description',
  ownerId: 'user_1',
  status: 'active',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
}

const fakeResolve: ApplicationResolveResponse = {
  applicationId: 'app_1',
  slug: 'acme',
  name: 'Acme Corp',
  type: 'publishable',
  env: 'live',
  scope: 'user',
}

describe('useMyApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches applications when enabled', async () => {
    mockApiCall.mockResolvedValueOnce([fakeApp])
    const { result } = renderHook(() => useMyApplications(true), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeApp])
    expect(mockApiCall).toHaveBeenCalledWith('/applications', {
      appName: 'ezauth',
      method: 'GET',
    })
  })

  it('adds ?all=true when all=true', async () => {
    mockApiCall.mockResolvedValueOnce([fakeApp])
    const { result } = renderHook(() => useMyApplications(true, { all: true }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiCall).toHaveBeenCalledWith('/applications?all=true', {
      appName: 'ezauth',
      method: 'GET',
    })
  })

  it('adds ?includeArchived=true when includeArchived=true', async () => {
    mockApiCall.mockResolvedValueOnce([fakeApp])
    const { result } = renderHook(() => useMyApplications(true, { includeArchived: true }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiCall).toHaveBeenCalledWith('/applications?includeArchived=true', {
      appName: 'ezauth',
      method: 'GET',
    })
  })

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useMyApplications(false), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
    expect(mockApiCall).not.toHaveBeenCalled()
  })
})

describe('useApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches a single application by id', async () => {
    mockApiCall.mockResolvedValueOnce(fakeApp)
    const { result } = renderHook(() => useApplication('app_1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fakeApp)
    expect(mockApiCall).toHaveBeenCalledWith('/applications/app_1', {
      appName: 'ezauth',
      method: 'GET',
    })
  })

  it('does not fetch when id is null', () => {
    const { result } = renderHook(() => useApplication(null), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
    expect(mockApiCall).not.toHaveBeenCalled()
  })
})

describe('useResolveApplicationByKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves a key to an application', async () => {
    mockApiCall.mockResolvedValueOnce(fakeResolve)
    const { result } = renderHook(() => useResolveApplicationByKey('ez_pk_live_abc'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fakeResolve)
    expect(mockApiCall).toHaveBeenCalledWith('/applications/resolve?key=ez_pk_live_abc', {
      appName: 'ezauth',
      method: 'GET',
    })
  })

  it('does not fetch when key is undefined', () => {
    const { result } = renderHook(() => useResolveApplicationByKey(undefined), {
      wrapper: createWrapper(),
    })
    expect(result.current.isFetching).toBe(false)
    expect(mockApiCall).not.toHaveBeenCalled()
  })
})

describe('useCreateApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an application and calls onSuccess', async () => {
    mockApiCall.mockResolvedValueOnce(fakeApp)
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useCreateApplication({ onSuccess }), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ slug: 'acme', name: 'Acme Corp' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledWith(fakeApp)
    expect(mockApiCall).toHaveBeenCalledWith('/applications', {
      appName: 'ezauth',
      method: 'POST',
      body: { slug: 'acme', name: 'Acme Corp' },
    })
  })

  it('calls onError on failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('slug taken'))
    const onError = vi.fn()
    const { result } = renderHook(() => useCreateApplication({ onError }), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ slug: 'taken', name: 'Taken' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onError).toHaveBeenCalled()
  })
})

describe('useUpdateApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates an application', async () => {
    const updated = { ...fakeApp, name: 'Acme v2' }
    mockApiCall.mockResolvedValueOnce(updated)
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useUpdateApplication({ onSuccess }), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'app_1', data: { name: 'Acme v2' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledWith(updated)
    expect(mockApiCall).toHaveBeenCalledWith('/applications/app_1', {
      appName: 'ezauth',
      method: 'PATCH',
      body: { name: 'Acme v2' },
    })
  })
})

describe('useRevokeApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('archives an application', async () => {
    mockApiCall.mockResolvedValueOnce(undefined)
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useRevokeApplication({ onSuccess }), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'app_1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalled()
    expect(mockApiCall).toHaveBeenCalledWith('/applications/app_1', {
      appName: 'ezauth',
      method: 'DELETE',
    })
  })

  it('forwards ?cascade=true when cascade is true', async () => {
    mockApiCall.mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useRevokeApplication(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'app_1', cascade: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiCall).toHaveBeenCalledWith('/applications/app_1?cascade=true', {
      appName: 'ezauth',
      method: 'DELETE',
    })
  })
})
