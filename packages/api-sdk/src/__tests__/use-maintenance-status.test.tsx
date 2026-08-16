// @vitest-environment jsdom
/**
 * useMaintenanceStatus — public maintenance status hook.
 *
 * The hook MUST silently degrade to "no maintenance" on any network or
 * parse failure so a misconfigured or unreachable upstream server never
 * breaks the consumer banner / app.
 *
 * Originally lived in `@ezstart/auth-sdk` — moved to `@ezstart/api-sdk`
 * 2026-05-01 because maintenance status is a platform-wide concern, not
 * auth-specific.
 */
import * as matchers from '@testing-library/jest-dom/matchers'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useMaintenanceStatus } from '../react/use-maintenance-status.js'

expect.extend(matchers)

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { Wrapper, queryClient }
}

describe('useMaintenanceStatus', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns the bare maintenance payload when server returns it directly', async () => {
    const payload = {
      enabled: true,
      message: 'Back at 18:00 UTC',
      startedAt: '2026-05-01T10:00:00Z',
      scheduledEnd: '2026-05-01T18:00:00Z',
    }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(payload),
    } as Response)

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useMaintenanceStatus({ apiUrl: 'https://api.example.com' }),
      {
        wrapper: Wrapper,
      }
    )

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toEqual(payload)
  })

  it('unwraps an `{ success: true, data }` envelope when the server returns one', async () => {
    const payload = {
      enabled: true,
      message: 'Maintenance',
      startedAt: null,
      scheduledEnd: null,
    }
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true, data: payload }),
    } as Response)

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useMaintenanceStatus({ apiUrl: 'https://api.example.com' }),
      {
        wrapper: Wrapper,
      }
    )

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.enabled).toBe(true)
    expect(result.current.data?.message).toBe('Maintenance')
  })

  it('silently degrades to "disabled" when the server returns 5xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    } as Response)

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useMaintenanceStatus({ apiUrl: 'https://api.example.com' }),
      {
        wrapper: Wrapper,
      }
    )

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toEqual({
      enabled: false,
      message: '',
      startedAt: null,
      scheduledEnd: null,
    })
  })

  it('silently degrades to "disabled" when fetch throws (network error)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network down'))

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useMaintenanceStatus({ apiUrl: 'https://api.example.com' }),
      {
        wrapper: Wrapper,
      }
    )

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.enabled).toBe(false)
  })

  it('silently degrades when the response body is invalid JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'not json {',
    } as Response)

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useMaintenanceStatus({ apiUrl: 'https://api.example.com' }),
      {
        wrapper: Wrapper,
      }
    )

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.enabled).toBe(false)
  })

  it('honours a custom path override and a trailing slash on apiUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ enabled: false, message: '', startedAt: null, scheduledEnd: null }),
    } as Response)
    globalThis.fetch = fetchMock

    const { Wrapper } = makeWrapper()
    renderHook(
      () =>
        useMaintenanceStatus({
          apiUrl: 'https://api.example.com/',
          path: '/v2/status',
        }),
      { wrapper: Wrapper }
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).toBe('https://api.example.com/v2/status')
  })

  it('does not fetch when `enabled: false`', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    const { Wrapper } = makeWrapper()
    renderHook(() => useMaintenanceStatus({ apiUrl: 'https://api.example.com', enabled: false }), {
      wrapper: Wrapper,
    })

    // Give react-query a tick to schedule (it should not).
    await new Promise(r => setTimeout(r, 50))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
