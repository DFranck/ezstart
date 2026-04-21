/**
 * Tests for PayProvider's application context resolution.
 *
 * Covers the E.3 behaviour: resolving `applicationId` / `appSlug` from a
 * publishable key via `GET /api/keys/config`, graceful degradation on fetch
 * failure, and short-circuiting when the applicationId is explicit.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { PayProvider, useApplicationContext } from '../../react/pay-provider.js'
import { usePayStore } from '../../react/store.js'

function Wrapper({
  children,
  publishableKey,
  applicationId,
  appName,
}: {
  children: React.ReactNode
  publishableKey?: string
  applicationId?: string
  appName?: string
}) {
  return (
    <PayProvider
      publishableKey={publishableKey}
      applicationId={applicationId}
      appName={appName}
      config={{ apiUrl: 'http://api.example.com/api' }}
    >
      {children}
    </PayProvider>
  )
}

describe('PayProvider — applicationId resolution', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    // Reset zustand store between tests
    usePayStore.setState({ applicationId: null, appSlug: null, isReady: false })
  })

  it('fetches /keys/config when publishableKey is provided and resolves applicationId', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/keys/config')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              applicationId: 'app_abc123',
              appSlug: 'ezbill',
              apiUrl: 'http://api.example.com',
              webUrl: 'http://app.example.com',
              type: 'publishable',
              env: 'test',
              scope: 'user',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }) => <Wrapper publishableKey="ez_pk_test_xyz">{children}</Wrapper>,
    })

    // Initially unresolved
    expect(result.current.applicationId).toBeNull()

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.applicationId).toBe('app_abc123')
    expect(result.current.appSlug).toBe('ezbill')

    // Ensure fetch was called with the right URL
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('/keys/config')
    expect(calledUrl).toContain('key=ez_pk_test_xyz')
  })

  it('does not fetch when applicationId is provided explicitly', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }) => (
        <Wrapper applicationId="app_direct_456" appName="ezpay">
          {children}
        </Wrapper>
      ),
    })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.applicationId).toBe('app_direct_456')
    expect(result.current.appSlug).toBe('ezpay')
    // Give any hypothetical fetch a chance to run
    await new Promise(r => setTimeout(r, 30))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not fetch when neither publishableKey nor applicationId is provided', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }) => <Wrapper appName="ezpay">{children}</Wrapper>,
    })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.applicationId).toBeNull()
    expect(result.current.appSlug).toBe('ezpay')
    await new Promise(r => setTimeout(r, 30))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gracefully degrades on fetch failure and logs a warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }) => (
        <Wrapper publishableKey="ez_pk_test_invalid" appName="ezbill">
          {children}
        </Wrapper>
      ),
    })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.applicationId).toBeNull()
    expect(result.current.appSlug).toBe('ezbill')
    expect(warnSpy).toHaveBeenCalled()
    const message = warnSpy.mock.calls[0]?.[0] as string
    expect(message).toContain('[pay-sdk]')
    expect(message).toContain('Failed to resolve application')

    warnSpy.mockRestore()
  })

  it('syncs resolved context to the zustand store', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/keys/config')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { applicationId: 'app_store_789', appSlug: 'ezstart' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }) => <Wrapper publishableKey="ez_pk_test_store">{children}</Wrapper>,
    })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    // Store should now reflect the resolved context
    const store = usePayStore.getState()
    expect(store.applicationId).toBe('app_store_789')
    expect(store.appSlug).toBe('ezstart')
    expect(store.isReady).toBe(true)
  })
})

describe('PayClient.resolveApplicationByKey', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when publishableKey is empty', async () => {
    const { PayClient } = await import('../../core/pay-client.js')
    const client = new PayClient({ apiUrl: 'http://api.example.com/api' })
    await expect(client.resolveApplicationByKey('')).rejects.toThrow('publishableKey is required')
  })

  it('throws when response is missing applicationId', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: { appSlug: 'ezbill' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { PayClient } = await import('../../core/pay-client.js')
    const client = new PayClient({ apiUrl: 'http://api.example.com/api' })
    await expect(client.resolveApplicationByKey('ez_pk_test_bad')).rejects.toThrow(
      'Invalid application config response'
    )
  })

  it('throws with error message when response is not ok', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: false, error: 'Rate limited' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { PayClient } = await import('../../core/pay-client.js')
    const client = new PayClient({ apiUrl: 'http://api.example.com/api' })
    await expect(client.resolveApplicationByKey('ez_pk_test_rl')).rejects.toThrow('Rate limited')
  })

  it('returns parsed config on success', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              applicationId: 'app_ok',
              appSlug: 'ezpay',
              apiUrl: 'http://api.example.com',
              webUrl: 'http://app.example.com',
              type: 'publishable',
              env: 'live',
              scope: 'admin',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    const { PayClient } = await import('../../core/pay-client.js')
    const client = new PayClient({ apiUrl: 'http://api.example.com/api' })
    const cfg = await client.resolveApplicationByKey('ez_pk_live_ok')

    expect(cfg.applicationId).toBe('app_ok')
    expect(cfg.appSlug).toBe('ezpay')
    expect(cfg.type).toBe('publishable')
    expect(cfg.env).toBe('live')
  })
})
