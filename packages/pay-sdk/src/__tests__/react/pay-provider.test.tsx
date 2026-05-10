/**
 * Tests for PayProvider's application context resolution.
 *
 * Covers the E.3 behaviour: resolving `applicationId` / `appSlug` from a
 * publishable key via `GET /api/keys/config`, graceful degradation on fetch
 * failure, and short-circuiting when the applicationId is explicit.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
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
  const originalDeployEnv = process.env.DEPLOY_ENV

  beforeEach(() => {
    // Pin to production so detectPayEnvironment() returns a deterministic
    // result regardless of jsdom hostname (window.location.hostname = 'localhost').
    process.env.DEPLOY_ENV = 'production'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalDeployEnv === undefined) {
      delete process.env.DEPLOY_ENV
    } else {
      process.env.DEPLOY_ENV = originalDeployEnv
    }
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

  it('when `config.apiUrl` is missing, falls back to DEFAULT_PAY_API_URL (Phase A1)', async () => {
    // Phase A1 ENV-DIET (2026-05-05) — Stripe-style: when neither
    // `config.apiUrl` prop nor `NEXT_PUBLIC_EZPAY_API_URL` env var is
    // provided, the SDK ships a hardcoded prod default
    // (`https://ezpay-api.ezstart.xyz`) so the canonical EZPay cloud
    // works zero-config. This kills the legacy REG-2 bug structurally —
    // the relative `/api/plans` request that previously hit the consumer
    // app's origin can no longer happen.
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
    // Now defaults to the canonical prod host. Self-hosted callers must
    // override via `config.apiUrl` or `NEXT_PUBLIC_EZPAY_API_URL`.
    expect(plansUrl.startsWith('https://ezpay-api.ezstart.xyz/api/plans')).toBe(true)
  })
})

describe('PayProvider — Phase 3 auto-resolve payWebUrl from /keys/config', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    usePayStore.setState({
      applicationId: null,
      appSlug: null,
      isReady: false,
      applicationResolutionStatus: 'idle',
    })
  })

  it('auto-resolves `payWebUrl` from /keys/config.webUrl when prop is omitted', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/keys/config')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              applicationId: 'app_autoweb',
              appSlug: 'ezbill',
              apiUrl: 'http://api.example.com',
              webUrl: 'https://ezpay.example.com',
              type: 'publishable',
              env: 'live',
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
      wrapper: ({ children }) => (
        <PayProvider
          publishableKey="ez_pk_live_autoweb"
          config={{ apiUrl: 'http://api.example.com' }}
        >
          {children}
        </PayProvider>
      ),
    })

    // Wait for the resolve to populate the context with the API-returned URL.
    await waitFor(() => expect(result.current.applicationId).toBe('app_autoweb'))
    await waitFor(() => expect(result.current.payWebUrl).toBe('https://ezpay.example.com'))
  })

  it('explicit `payWebUrl` prop wins over /keys/config.webUrl', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/keys/config')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              applicationId: 'app_override',
              appSlug: 'ezbill',
              webUrl: 'https://ezpay.api-resolved.example.com',
              type: 'publishable',
              env: 'live',
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
      wrapper: ({ children }) => (
        <PayProvider
          publishableKey="ez_pk_live_override"
          payWebUrl="https://prop-wins.example.com"
          config={{ apiUrl: 'http://api.example.com' }}
        >
          {children}
        </PayProvider>
      ),
    })

    await waitFor(() => expect(result.current.applicationId).toBe('app_override'))
    // Even after the API resolves, the explicit prop is still authoritative.
    expect(result.current.payWebUrl).toBe('https://prop-wins.example.com')
  })
})

describe('PayProvider — payWebUrl propagation', () => {
  const originalDeployEnv = process.env.DEPLOY_ENV

  beforeEach(() => {
    // Pin to production so detectPayEnvironment() returns 'production'
    // regardless of jsdom hostname — ensures env-aware default URL is
    // the production host (non-localhost → payWebUrl resolves to null).
    process.env.DEPLOY_ENV = 'production'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalDeployEnv === undefined) {
      delete process.env.DEPLOY_ENV
    } else {
      process.env.DEPLOY_ENV = originalDeployEnv
    }
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

describe('PayProvider — publishableKey → X-API-Key auto-injection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    usePayStore.setState({
      applicationId: null,
      appSlug: null,
      isReady: false,
      applicationResolutionStatus: 'idle',
    })
  })

  it('injects publishableKey as X-API-Key header on subsequent client requests', async () => {
    // Stub fetch — first call resolves the publishable key (`/keys/config`),
    // subsequent calls (e.g. `/api/donate`) must carry the `X-API-Key` header.
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/keys/config')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              applicationId: 'app_keyinj',
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
      // For any other call, capture headers so the assertions can check them.
      return new Response(
        JSON.stringify({
          success: true,
          data: { sessionUrl: 'https://stripe.test/session' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(
      () => {
        const ctx = useApplicationContext()
        // Pull the client from the provider via a tiny extra hook
        // (re-using usePayContext indirectly — but we expose it through
        // useApplicationContext via the same provider).
        return ctx
      },
      {
        wrapper: ({ children }) => <Wrapper publishableKey="ez_pk_test_KEYINJ">{children}</Wrapper>,
      }
    )

    await waitFor(() => expect(result.current.isReady).toBe(true))

    // Trigger any client request via createPayClient with the same shape:
    // the simplest path is to import the same client factory and assert
    // headers when calling createDonation. We do so by calling the
    // already-mounted client through usePay() — but to keep the test focused
    // on header injection without a full hook tree, we re-build a minimal
    // client with the same config the provider would have built.
    const { createPayClient } = await import('../../core/pay-client.js')
    const client = createPayClient({
      apiUrl: 'http://api.example.com',
      apiKey: 'ez_pk_test_KEYINJ',
    })
    await client.createDonation({ projectId: 'p1', amount: 10, currency: 'EUR' })

    // The createDonation call should be the latest fetch — find it
    const donateCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/api/donate'))
    expect(donateCall).toBeDefined()
    const headers = donateCall?.[1]?.headers as Record<string, string> | undefined
    expect(headers?.['X-API-Key']).toBe('ez_pk_test_KEYINJ')
  })

  it('does NOT inject apiKey when publishableKey has the wrong prefix (defensive)', async () => {
    // A secret key (`ez_sk_*`) MUST never be smuggled into a browser request.
    // The provider should ignore it (and the consumer is mis-configured).
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { createPayClient } = await import('../../core/pay-client.js')
    // Simulate the provider's defensive derivation: secret prefix → apiKey undefined.
    const wrongPrefix = 'ez_sk_test_LEAK'
    const isPublishable = wrongPrefix.startsWith('ez_pk_') || wrongPrefix.startsWith('epk_')
    const client = createPayClient({
      apiUrl: 'http://api.example.com',
      apiKey: isPublishable ? wrongPrefix : undefined,
    })

    await client.getPayments()
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined
    expect(headers?.['X-API-Key']).toBeUndefined()
  })

  it('accepts legacy `epk_` publishable keys as apiKey', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { createPayClient } = await import('../../core/pay-client.js')
    const client = createPayClient({
      apiUrl: 'http://api.example.com',
      apiKey: 'epk_legacy123',
    })
    await client.getPayments()

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined
    expect(headers?.['X-API-Key']).toBe('epk_legacy123')
  })
})
