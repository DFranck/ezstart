/**
 * Phase A1 ENV-DIET (2026-05-05) — hardcoded production default for `apiUrl`.
 *
 * Stripe-style pattern: when neither `config.apiUrl` nor
 * `NEXT_PUBLIC_EZPAY_API_URL` is provided, the SDK ships a canonical
 * production default (`DEFAULT_PAY_API_URL`) so consumers deployed on
 * `*.ezstart.xyz` need ZERO env wiring in production.
 *
 * Public API stability: the explicit prop and the env var still win over
 * the default — any pre-existing wiring keeps working unchanged.
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

import { PayProvider, useApplicationContext } from '../../react/pay-provider.js'
import { usePayStore } from '../../react/store.js'
import { DEFAULT_PAY_API_URL } from '../../core/defaults.js'

const originalEnvUrl = process.env.NEXT_PUBLIC_EZPAY_API_URL

function resetStore() {
  usePayStore.setState({
    applicationId: null,
    appSlug: null,
    isReady: false,
    applicationResolutionStatus: 'idle',
  })
}

describe('PayProvider — Phase A1 hardcoded prod apiUrl default', () => {
  beforeEach(() => {
    resetStore()
    delete process.env.NEXT_PUBLIC_EZPAY_API_URL
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetStore()
    if (originalEnvUrl === undefined) {
      delete process.env.NEXT_PUBLIC_EZPAY_API_URL
    } else {
      process.env.NEXT_PUBLIC_EZPAY_API_URL = originalEnvUrl
    }
  })

  it('falls back to DEFAULT_PAY_API_URL on outbound requests when no apiUrl is configured', async () => {
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
    expect(plansUrl.startsWith(`${DEFAULT_PAY_API_URL}/api/plans`)).toBe(true)
  })

  it('explicit `config.apiUrl` wins over the default', async () => {
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

  it('NEXT_PUBLIC_EZPAY_API_URL env var wins over the default', async () => {
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

  it('DEFAULT_PAY_API_URL is the canonical EZPay cloud host', () => {
    // Locks the shipped value so accidental edits surface in CI.
    expect(DEFAULT_PAY_API_URL).toBe('https://ezpay-api.ezstart.xyz')
  })
})
