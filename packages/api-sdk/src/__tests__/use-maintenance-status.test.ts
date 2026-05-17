/**
 * @vitest-environment jsdom
 *
 * Covers MED-1 from the Wave C audit:
 *  - The hook's React Query `queryFn` must propagate the AbortSignal it
 *    receives to the underlying `fetch` call.
 *  - The hook must not swallow `AbortError` as "no maintenance" — abort
 *    cancellations must surface to React Query so the query state stays
 *    coherent across remounts and overlapping refetches.
 *
 * Strategy: render the hook with `@testing-library/react` + a real
 * `QueryClient` while stubbing `fetch` so we can inspect call args.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useMaintenanceStatus } from '../react/use-maintenance-status.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_API_URL = 'http://api.test.local'

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeWrapper(): {
  wrapper: React.FC<{ children: React.ReactNode }>
  client: QueryClient
} {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retry so AbortError surfaces immediately.
        retry: false,
        // Disable refetch loops in the test.
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
    },
  })
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client }, children)
  return { wrapper, client }
}

describe('useMaintenanceStatus — MED-1 (AbortSignal propagation)', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('passes a React Query–provided AbortSignal to the underlying fetch', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        enabled: false,
        message: '',
        startedAt: null,
        scheduledEnd: null,
      })
    )

    const { wrapper, client } = makeWrapper()
    const { result } = renderHook(() => useMaintenanceStatus({ apiUrl: TEST_API_URL }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init).toBeDefined()
    expect(init.signal).toBeDefined()
    // React Query always supplies an AbortSignal (not a fake/missing one).
    expect(init.signal).toBeInstanceOf(AbortSignal)

    client.clear()
  })

  it('re-throws AbortError instead of resolving with defaultDisabled() data', async () => {
    // Simulate fetch rejecting with a DOMException-style AbortError.
    const abortErr = new Error('The user aborted a request.')
    abortErr.name = 'AbortError'
    fetchMock.mockRejectedValue(abortErr)

    const { wrapper, client } = makeWrapper()
    const { result } = renderHook(() => useMaintenanceStatus({ apiUrl: TEST_API_URL }), {
      wrapper,
    })

    // Wait for fetch to have been called at least once (the query started).
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    // Give the queryFn microtasks a chance to reject and propagate.
    await new Promise(resolve => setTimeout(resolve, 50))

    // Critical regression guard (MED-1): the hook must NOT swallow
    // AbortError as "no maintenance". The query stays without data — it
    // either surfaces as error state or stays in a non-success/cancelled
    // state — but never resolves to a synthetic disabled banner.
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.data).toBeUndefined()

    client.clear()
  })

  it('silently degrades to defaultDisabled() on non-abort network failure (regression)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'))

    const { wrapper, client } = makeWrapper()
    const { result } = renderHook(() => useMaintenanceStatus({ apiUrl: TEST_API_URL }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      enabled: false,
      message: '',
      startedAt: null,
      scheduledEnd: null,
    })

    client.clear()
  })

  it('silently degrades to defaultDisabled() when fetch returns non-OK (regression)', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }))

    const { wrapper, client } = makeWrapper()
    const { result } = renderHook(() => useMaintenanceStatus({ apiUrl: TEST_API_URL }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.enabled).toBe(false)

    client.clear()
  })

  it('returns parsed payload when the API responds OK', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        enabled: true,
        message: 'Scheduled downtime',
        startedAt: '2026-05-17T10:00:00.000Z',
        scheduledEnd: '2026-05-17T11:00:00.000Z',
      })
    )

    const { wrapper, client } = makeWrapper()
    const { result } = renderHook(() => useMaintenanceStatus({ apiUrl: TEST_API_URL }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      enabled: true,
      message: 'Scheduled downtime',
      startedAt: '2026-05-17T10:00:00.000Z',
      scheduledEnd: '2026-05-17T11:00:00.000Z',
    })

    client.clear()
  })
})
