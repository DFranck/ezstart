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

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

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
      config={{ apiUrl: 'http://api.example.com' }}
    >
      {children}
    </PayProvider>
  )
}

describe('PayProvider — applicationId resolution', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    // Reset zustand store between tests
    usePayStore.setState({
      applicationId: null,
      appSlug: null,
      isReady: false,
      applicationResolutionStatus: 'idle',
    })
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

  it('does NOT fail-open on fetch failure — status=failed, isReady=false (VULN-1)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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
      expect(result.current.applicationResolutionStatus).toBe('failed')
    })

    // Fail-closed: applicationId stays null AND isReady stays false.
    // Prevents usePaymentHistory from silently downgrading to cross-app scope.
    expect(result.current.applicationId).toBeNull()
    expect(result.current.isReady).toBe(false)
    expect(errorSpy).toHaveBeenCalled()
    const message = errorSpy.mock.calls[0]?.[0] as string
    expect(message).toContain('[pay-sdk]')
    expect(message).toContain('Failed to resolve application')
    expect(message).toContain('Scoped queries will be blocked')

    errorSpy.mockRestore()
  })

  it('exposes applicationResolutionStatus: pending → ready on successful resolve', async () => {
    let resolveFetch: ((res: Response) => void) | null = null
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>(resolve => {
          resolveFetch = resolve
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }) => <Wrapper publishableKey="ez_pk_test_slow">{children}</Wrapper>,
    })

    // Initially pending
    await waitFor(() => {
      expect(result.current.applicationResolutionStatus).toBe('pending')
    })
    expect(result.current.isReady).toBe(false)

    // Now resolve the fetch
    resolveFetch?.(
      new Response(
        JSON.stringify({
          success: true,
          data: { applicationId: 'app_ok', appSlug: 'ezbill' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await waitFor(() => {
      expect(result.current.applicationResolutionStatus).toBe('ready')
    })
    expect(result.current.applicationId).toBe('app_ok')
    expect(result.current.isReady).toBe(true)
  })

  it('logs console.error in dev when mounted with only legacy appName (VULN-3)', async () => {
    process.env.NODE_ENV = 'development'
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() => useApplicationContext(), {
      wrapper: ({ children }) => <Wrapper appName="ezpay">{children}</Wrapper>,
    })

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled()
    })

    const message = errorSpy.mock.calls[0]?.[0] as string
    expect(message).toContain('[pay-sdk]')
    expect(message).toContain('only `appName`')
    expect(message).toContain('deprecated')
    errorSpy.mockRestore()
  })

  it('does NOT log the legacy warning when applicationId is provided', async () => {
    process.env.NODE_ENV = 'development'
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() => useApplicationContext(), {
      wrapper: ({ children }) => (
        <Wrapper applicationId="app_123" appName="ezpay">
          {children}
        </Wrapper>
      ),
    })

    await new Promise(r => setTimeout(r, 20))
    // No legacy warning should have fired
    const legacyWarnings = errorSpy.mock.calls.filter(call =>
      (call[0] as string)?.includes('only `appName`')
    )
    expect(legacyWarnings).toHaveLength(0)
    errorSpy.mockRestore()
  })

  it('does NOT log legacy warning in production even when only appName is provided', async () => {
    process.env.NODE_ENV = 'production'
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() => useApplicationContext(), {
      wrapper: ({ children }) => <Wrapper appName="ezpay">{children}</Wrapper>,
    })

    await new Promise(r => setTimeout(r, 20))
    const legacyWarnings = errorSpy.mock.calls.filter(call =>
      (call[0] as string)?.includes('only `appName`')
    )
    expect(legacyWarnings).toHaveLength(0)
    errorSpy.mockRestore()
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

describe('PayProvider — REG-1 infinite loop guard on /keys/config', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    usePayStore.setState({
      applicationId: null,
      appSlug: null,
      isReady: false,
      applicationResolutionStatus: 'idle',
    })
  })

  it('does NOT re-fetch /keys/config when the provider re-renders with the same publishableKey', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: { applicationId: 'app_once', appSlug: 'ezpay' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Wrapper publishableKey="ez_pk_test_stable">{children}</Wrapper>
      ),
    })

    await waitFor(() => {
      expect(result.current.applicationResolutionStatus).toBe('ready')
    })

    // Re-render several times with the SAME publishableKey — must NOT re-fetch.
    rerender()
    rerender()
    rerender()
    rerender()
    await new Promise(r => setTimeout(r, 30))

    const configCalls = fetchMock.mock.calls.filter(call => {
      const url = typeof call[0] === 'string' ? call[0] : ''
      return url.includes('/keys/config')
    })
    expect(configCalls).toHaveLength(1)
  })

  it('does NOT retry /keys/config in a loop when the first attempt returns 429', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: false, error: 'Rate limited' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Wrapper publishableKey="ez_pk_test_rate_limited">{children}</Wrapper>
      ),
    })

    await waitFor(() => {
      expect(result.current.applicationResolutionStatus).toBe('failed')
    })

    // Several re-renders after the failure — must not trigger more calls.
    rerender()
    rerender()
    rerender()
    await new Promise(r => setTimeout(r, 30))

    const configCalls = fetchMock.mock.calls.filter(call => {
      const url = typeof call[0] === 'string' ? call[0] : ''
      return url.includes('/keys/config')
    })
    expect(configCalls).toHaveLength(1)
    errorSpy.mockRestore()
  })
})

describe('PayProvider — REG-2 apiUrl propagation to pay-sdk fetches', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    usePayStore.setState({
      applicationId: null,
      appSlug: null,
      isReady: false,
      applicationResolutionStatus: 'idle',
    })
  })

  it('forwards `config.apiUrl` to PayClient so `/plans` hits the ezpay API (absolute URL)', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { usePlans } = await import('../../react/hooks/usePlans.js')

    const { result } = renderHook(() => usePlans({ active: true }), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Wrapper applicationId="app_scoped_xyz">{children}</Wrapper>
      ),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // The plans call MUST hit the absolute EZPay URL, not the window origin.
    const plansCall = fetchMock.mock.calls.find(call => {
      const url = typeof call[0] === 'string' ? call[0] : ''
      return url.includes('/plans')
    })
    expect(plansCall).toBeDefined()
    const plansUrl = plansCall?.[0] as string
    expect(plansUrl.startsWith('http://api.example.com/api/plans')).toBe(true)
  })

  it('when `config.apiUrl` is missing, falls back to relative URL (regression guard)', async () => {
    // Without config.apiUrl, PayClient defaults apiUrl to ''. The resulting
    // `/plans` URL will be resolved against the current origin — which in a
    // browser context is exactly the REG-2 bug: green-pulse web origin
    // instead of ezpay API. This test documents the required behaviour
    // when `apiUrl` IS provided (absolute URL) vs when it's missing
    // (relative fallback) so future refactors don't silently regress.
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { usePlans } = await import('../../react/hooks/usePlans.js')

    const WrapperNoApiUrl = ({ children }: { children: React.ReactNode }) => (
      <PayProvider applicationId="app_no_url">{children}</PayProvider>
    )

    const { result } = renderHook(() => usePlans({ active: true }), {
      wrapper: WrapperNoApiUrl,
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const plansCall = fetchMock.mock.calls.find(call => {
      const url = typeof call[0] === 'string' ? call[0] : ''
      return url.includes('/plans')
    })
    expect(plansCall).toBeDefined()
    const plansUrl = plansCall?.[0] as string
    // Without apiUrl, the call starts with `/api/plans` — a relative URL that
    // would hit the hosting origin (the REG-2 bug). The fix is at the
    // consumer side: pass `config.apiUrl` explicitly.
    expect(plansUrl.startsWith('/api/plans')).toBe(true)
  })
})

describe('PayProvider — payWebUrl propagation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    usePayStore.setState({
      applicationId: null,
      appSlug: null,
      isReady: false,
      applicationResolutionStatus: 'idle',
    })
  })

  it('exposes the explicit payWebUrl prop through useApplicationContext', async () => {
    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PayProvider
          applicationId="app_123"
          payWebUrl="https://ezpay.example.com"
          config={{ apiUrl: 'https://ezpay-api.example.com' }}
        >
          {children}
        </PayProvider>
      ),
    })

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.payWebUrl).toBe('https://ezpay.example.com')
  })

  it('auto-detects localhost ezpay web when only localhost apiUrl is provided', async () => {
    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PayProvider applicationId="app_123" config={{ apiUrl: 'http://localhost:6130' }}>
          {children}
        </PayProvider>
      ),
    })

    await waitFor(() => expect(result.current.isReady).toBe(true))
    // Localhost auto-wiring resolves the ezpay web dev port (6131).
    expect(result.current.payWebUrl).toBe('http://localhost:6131')
  })

  it('returns null payWebUrl when apiUrl is a non-localhost production host', async () => {
    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PayProvider applicationId="app_123" config={{ apiUrl: 'https://ezpay-api.ezstart.xyz' }}>
          {children}
        </PayProvider>
      ),
    })

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.payWebUrl).toBeNull()
  })

  it('returns null payWebUrl when neither prop nor apiUrl is provided', async () => {
    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PayProvider applicationId="app_123">{children}</PayProvider>
      ),
    })

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.payWebUrl).toBeNull()
  })

  it('explicit payWebUrl wins over localhost auto-detection', async () => {
    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PayProvider
          applicationId="app_123"
          payWebUrl="https://override.example.com"
          config={{ apiUrl: 'http://localhost:6130' }}
        >
          {children}
        </PayProvider>
      ),
    })

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.payWebUrl).toBe('https://override.example.com')
  })
})

describe('PayClient.resolveApplicationByKey', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when publishableKey is empty', async () => {
    const { createPayClient } = await import('../../core/pay-client.js')
    const client = createPayClient({ apiUrl: 'http://api.example.com' })
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

    const { createPayClient } = await import('../../core/pay-client.js')
    const client = createPayClient({ apiUrl: 'http://api.example.com' })
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

    const { createPayClient } = await import('../../core/pay-client.js')
    const client = createPayClient({ apiUrl: 'http://api.example.com' })
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

    const { createPayClient } = await import('../../core/pay-client.js')
    const client = createPayClient({ apiUrl: 'http://api.example.com' })
    const cfg = await client.resolveApplicationByKey('ez_pk_live_ok')

    expect(cfg.applicationId).toBe('app_ok')
    expect(cfg.appSlug).toBe('ezpay')
    expect(cfg.type).toBe('publishable')
    expect(cfg.env).toBe('live')
  })
})
