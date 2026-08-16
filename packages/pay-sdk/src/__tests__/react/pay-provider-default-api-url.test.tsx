/**
 * Env-aware apiUrl resolution (Phase A2 2026-05-10) — pays-sdk derives the
 * correct API URL from the environment when neither `config.apiUrl` nor
 * `NEXT_PUBLIC_EZPAY_API_URL` is provided.
 *
 * The env-aware default (via `getEzpayDefaultUrls()`) replaces the previous
 * hardcoded `DEFAULT_PAY_API_URL`. `DEFAULT_PAY_API_URL` is preserved as a
 * backwards-compat constant but is now an alias for the production URL.
 *
 * Public API stability: explicit prop and env var still win over the default.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

import { PayProvider, useApplicationContext } from '../../react/pay-provider.js'
import { DEFAULT_PAY_API_URL, EZPAY_URLS_BY_ENV } from '../../core/defaults.js'

const originalEnvUrl = process.env.NEXT_PUBLIC_EZPAY_API_URL
const originalDeployEnv = process.env.DEPLOY_ENV

// No store reset helper needed — each test renders a fresh <PayProvider> with
// its own isolated per-tree store (standard.md §0bis: factory + Context).

describe('PayProvider — env-aware apiUrl resolution', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_EZPAY_API_URL
    // Pin DEPLOY_ENV=production so detectPayEnvironment() returns a
    // deterministic result regardless of the jsdom hostname.
    process.env.DEPLOY_ENV = 'production'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalEnvUrl === undefined) {
      delete process.env.NEXT_PUBLIC_EZPAY_API_URL
    } else {
      process.env.NEXT_PUBLIC_EZPAY_API_URL = originalEnvUrl
    }
    if (originalDeployEnv === undefined) {
      delete process.env.DEPLOY_ENV
    } else {
      process.env.DEPLOY_ENV = originalDeployEnv
    }
  })

  it('falls back to the production default when no apiUrl is configured', async () => {
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
        <PayProvider applicationId="app_phase_a1">{children}</PayProvider>
      ),
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
    expect(plansUrl.startsWith(`${EZPAY_URLS_BY_ENV.production.api}/api/plans`)).toBe(true)
  })

  it('falls back to the staging default when DEPLOY_ENV=staging', async () => {
    process.env.DEPLOY_ENV = 'staging'

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
        <PayProvider applicationId="app_staging">{children}</PayProvider>
      ),
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
    expect(plansUrl.startsWith(`${EZPAY_URLS_BY_ENV.staging.api}/api/plans`)).toBe(true)
  })

  it('explicit `config.apiUrl` wins over the env-aware default', async () => {
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
        <PayProvider
          applicationId="app_explicit"
          config={{ apiUrl: 'https://custom-pay.example.com' }}
        >
          {children}
        </PayProvider>
      ),
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
    expect(plansUrl.startsWith('https://custom-pay.example.com/api/plans')).toBe(true)
  })

  it('NEXT_PUBLIC_EZPAY_API_URL env var wins over the env-aware default', async () => {
    process.env.NEXT_PUBLIC_EZPAY_API_URL = 'http://localhost:6130'

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
        <PayProvider applicationId="app_env_wins">{children}</PayProvider>
      ),
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
    expect(plansUrl.startsWith('http://localhost:6130/api/plans')).toBe(true)
  })

  it('trailing \\n in env var is trimmed — falls through to env-aware default', async () => {
    // Reproduce the Vercel staging bug: NEXT_PUBLIC_EZPAY_API_URL had a
    // trailing newline that made the URL invalid. With trim(), the empty/whitespace
    // value is treated as "not set" and the env-aware default kicks in.
    process.env.NEXT_PUBLIC_EZPAY_API_URL = '   \n  '

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
        <PayProvider applicationId="app_trim">{children}</PayProvider>
      ),
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
    // Should use the production default (DEPLOY_ENV=production pinned in beforeEach)
    expect(plansUrl.startsWith(`${EZPAY_URLS_BY_ENV.production.api}/api/plans`)).toBe(true)
  })

  it('explicit `config.apiUrl` wins over both the env var and the default', async () => {
    process.env.NEXT_PUBLIC_EZPAY_API_URL = 'http://localhost:6130'

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
        <PayProvider
          applicationId="app_prop_wins"
          config={{ apiUrl: 'https://prop-wins.example.com' }}
        >
          {children}
        </PayProvider>
      ),
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
    expect(plansUrl.startsWith('https://prop-wins.example.com/api/plans')).toBe(true)
  })

  it('useApplicationContext exposes the resolved client without throwing when no apiUrl is set', async () => {
    const { result } = renderHook(() => useApplicationContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PayProvider applicationId="app_default">{children}</PayProvider>
      ),
    })

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.applicationId).toBe('app_default')
  })

  it('DEFAULT_PAY_API_URL is the canonical EZPay production host', () => {
    expect(DEFAULT_PAY_API_URL).toBe('https://ezpay-api.ezstart.xyz')
    expect(DEFAULT_PAY_API_URL).toBe(EZPAY_URLS_BY_ENV.production.api)
  })
})
