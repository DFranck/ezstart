/**
 * Tests for useBillingPortal hook — opens a Stripe Customer Portal session.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { PayProvider } from '../../react/pay-provider.js'
import { useBillingPortal } from '../../react/hooks/useBillingPortal.js'
import { setupFetchMock } from '../helpers.js'

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <PayProvider appName="test-app" config={{ apiUrl: 'http://localhost:9999' }}>
      {children}
    </PayProvider>
  )
}

describe('useBillingPortal', () => {
  const originalLocation = window.location

  beforeEach(() => {
    // jsdom's window.location is not writable by default — replace with a mutable stub
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: 'https://app.example.com/billing' },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('redirects window.location.href to the portal URL on success', async () => {
    setupFetchMock([
      {
        url: '/billing/portal',
        method: 'POST',
        response: {
          success: true,
          data: { url: 'https://billing.stripe.com/session/abc' },
        },
      },
    ])

    const { result } = renderHook(() => useBillingPortal(), { wrapper: Wrapper })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()

    await act(async () => {
      await result.current.openPortal('https://app.example.com/account')
    })

    expect((window.location as Location).href).toBe('https://billing.stripe.com/session/abc')
    expect(result.current.error).toBeNull()
  })

  it('exposes the loading state while the request is in flight', async () => {
    let resolveFetch: (() => void) | null = null
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>(resolve => {
          resolveFetch = () =>
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: { url: 'https://billing.stripe.com/session/xyz' },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            )
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useBillingPortal(), { wrapper: Wrapper })

    let pending: Promise<void> | undefined
    act(() => {
      pending = result.current.openPortal()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(true)
    })

    resolveFetch?.()
    await act(async () => {
      await pending
    })
  })

  it('populates the error state when the API returns an error', async () => {
    setupFetchMock([
      {
        url: '/billing/portal',
        method: 'POST',
        response: { error: 'No subscription found for this user' },
        status: 404,
      },
    ])

    const { result } = renderHook(() => useBillingPortal(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.openPortal()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('No subscription found for this user')
  })

  it('populates the error state when fetch itself throws', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('network down')))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useBillingPortal(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.openPortal()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error?.message).toContain('network down')
  })
})
