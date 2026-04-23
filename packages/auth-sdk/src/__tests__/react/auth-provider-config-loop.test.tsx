/**
 * CRITICAL regression: `/api/keys/config` infinite loop on plans/chat pages.
 *
 * Incident: on staging, visiting a page that mounts `<AuthProvider
 * publishableKey="...">` fired 40+ successive `GET /api/keys/config` calls
 * per mount, tripping the 30 req/min ezauth rate limit and locking login
 * across all apps that share the IP. Root cause: `resolveSDKConfig` started
 * the fetch synchronously from inside a `useMemo`. React `useMemo` is not a
 * semantic guarantee of single execution — a dev-mode StrictMode double
 * render or any upstream re-render that drops the memoized value re-fires
 * the side effect.
 *
 * Fix: `resolveSDKConfig` is now pure — it returns a `keyFetch` descriptor,
 * and the caller (`<AuthProvider>`) performs the fetch in a `useEffect`
 * guarded by a `resolvedKeyRef` sentinel (identical REG-1 pattern to
 * `pay-sdk`'s `PayProvider`).
 *
 * This test asserts that re-rendering the provider several times with the
 * same `publishableKey` fires `/api/keys/config` exactly once.
 */

import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'

import { AuthProvider } from '../../react/auth-provider.js'

describe('AuthProvider — /keys/config infinite loop guard (REG-1)', () => {
  beforeEach(() => {
    // Ensure a clean global fetch spy before every test.
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fires GET /api/keys/config exactly once on mount', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              appName: 'ezpay',
              apiUrl: 'http://api.example.com',
              webUrl: 'http://web.example.com',
              features: ['*'],
              plan: 'free',
              quotaMonthly: -1,
              scope: 'user',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AuthProvider
        appName="ezpay"
        apiUrl="http://auth.example.com"
        webUrl="http://auth.example.com"
        publishableKey="ez_pk_live_singlefetch"
      >
        <div>child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          typeof url === 'string' ? url.includes('/api/keys/config') : false
        ).length
      ).toBe(1)
    })
  })

  it('does NOT re-fetch /keys/config across 10 parent re-renders with same key', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              appName: 'ezpay',
              apiUrl: 'http://api.example.com',
              webUrl: 'http://web.example.com',
              features: ['*'],
              plan: 'free',
              quotaMonthly: -1,
              scope: 'user',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    )
    vi.stubGlobal('fetch', fetchMock)

    function ParentThatReRenders({ tick }: { tick: number }) {
      return (
        <AuthProvider
          appName="ezpay"
          apiUrl="http://auth.example.com"
          webUrl="http://auth.example.com"
          publishableKey="ez_pk_live_stablekey"
        >
          <div data-testid="tick">{tick}</div>
        </AuthProvider>
      )
    }

    const { rerender } = render(<ParentThatReRenders tick={0} />)

    // Wait for the initial fetch to settle.
    await waitFor(() => {
      const configCalls = fetchMock.mock.calls.filter(([url]) =>
        typeof url === 'string' ? url.includes('/api/keys/config') : false
      )
      expect(configCalls).toHaveLength(1)
    })

    // Force 10 parent re-renders with the same publishableKey. Each render
    // produces a new `sdkConfig` memo only if input string primitives change
    // — which they don't here. But even if the memo were invalidated, the
    // `resolvedKeyRef` guard in `<AuthProvider>` must keep the fetch count at 1.
    for (let tick = 1; tick <= 10; tick += 1) {
      rerender(<ParentThatReRenders tick={tick} />)
    }

    // Yield a few microtasks so any spurious fetch would have landed.
    await new Promise(resolve => setTimeout(resolve, 30))

    const configCalls = fetchMock.mock.calls.filter(([url]) =>
      typeof url === 'string' ? url.includes('/api/keys/config') : false
    )
    expect(configCalls).toHaveLength(1)
  })

  it('does NOT retry /keys/config in a loop when the first attempt returns 429', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: false, error: 'Rate limited' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    function ParentThatReRenders({ tick }: { tick: number }) {
      return (
        <AuthProvider
          appName="ezpay"
          apiUrl="http://auth.example.com"
          webUrl="http://auth.example.com"
          publishableKey="ez_pk_live_429loop"
        >
          <div>{tick}</div>
        </AuthProvider>
      )
    }

    const { rerender } = render(<ParentThatReRenders tick={0} />)

    // Wait for the first (and only) fetch to settle as a 429.
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          typeof url === 'string' ? url.includes('/api/keys/config') : false
        ).length
      ).toBe(1)
    })

    for (let tick = 1; tick <= 5; tick += 1) {
      rerender(<ParentThatReRenders tick={tick} />)
    }
    await new Promise(resolve => setTimeout(resolve, 30))

    const configCalls = fetchMock.mock.calls.filter(([url]) =>
      typeof url === 'string' ? url.includes('/api/keys/config') : false
    )
    // CRITICAL: even after a 429 response, the provider MUST NOT retry. A
    // retry storm would make the rate-limit worse. The consumer must remount
    // (refresh the page) or pass a new `publishableKey` to trigger another
    // attempt.
    expect(configCalls).toHaveLength(1)
  })
})
