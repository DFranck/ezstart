/**
 * Tests for `usePaymentHistory` RBAC scoping.
 *
 * Focus: verify `applicationId` is forwarded to `client.getPayments()` from
 * the PayProvider context and from the explicit prop, and that the hook
 * refetches when the resolved applicationId changes (it is part of the
 * effect dependency set).
 */
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { PayProvider } from '../../react/pay-provider.js'
import { usePaymentHistory } from '../../react/hooks/usePaymentHistory.js'
import { setupFetchMock, makePayment } from '../helpers.js'

function wrapper(opts: { applicationId?: string; appName?: string }) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <PayProvider
        applicationId={opts.applicationId}
        appName={opts.appName}
        config={{ apiUrl: 'http://api.example.com/api' }}
      >
        {children}
      </PayProvider>
    )
  }
}

describe('usePaymentHistory — RBAC applicationId scoping', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('forwards applicationId from PayProvider context to GET /payments', async () => {
    const fetchMock = setupFetchMock([
      {
        url: '/payments',
        response: { success: true, data: [makePayment({ id: 'p1' })], meta: { total: 1 } },
      },
    ])

    const { result } = renderHook(() => usePaymentHistory({ userId: 'u_1' }), {
      wrapper: wrapper({ applicationId: 'app_ezauth' }),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Find the payments request
    const paymentsCall = fetchMock.mock.calls.find(call => String(call[0]).includes('/payments'))
    expect(paymentsCall).toBeDefined()
    const url = String(paymentsCall?.[0])
    expect(url).toContain('applicationId=app_ezauth')
    expect(url).toContain('userId=u_1')
    expect(result.current.payments).toHaveLength(1)
  })

  it('prefers the explicit applicationId prop over the PayProvider context', async () => {
    const fetchMock = setupFetchMock([
      {
        url: '/payments',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    renderHook(() => usePaymentHistory({ userId: 'u_1', applicationId: 'app_explicit' }), {
      wrapper: wrapper({ applicationId: 'app_ctx' }),
    })

    await waitFor(() => {
      const paymentsCall = fetchMock.mock.calls.find(call => String(call[0]).includes('/payments'))
      expect(paymentsCall).toBeDefined()
      const url = String(paymentsCall?.[0])
      expect(url).toContain('applicationId=app_explicit')
      expect(url).not.toContain('applicationId=app_ctx')
    })
  })

  it('omits applicationId from the query when the caller opts out with empty string', async () => {
    const fetchMock = setupFetchMock([
      {
        url: '/payments',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    renderHook(() => usePaymentHistory({ userId: 'u_1', applicationId: '' }), {
      wrapper: wrapper({ applicationId: 'app_ctx' }),
    })

    await waitFor(() => {
      const paymentsCall = fetchMock.mock.calls.find(call => String(call[0]).includes('/payments'))
      expect(paymentsCall).toBeDefined()
      const url = String(paymentsCall?.[0])
      expect(url).not.toContain('applicationId=')
    })
  })

  it('refetches when applicationId changes (dependency in the effect)', async () => {
    const fetchMock = setupFetchMock([
      {
        url: '/payments',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    const { rerender } = renderHook(
      ({ applicationId }: { applicationId: string }) =>
        usePaymentHistory({ userId: 'u_1', applicationId }),
      {
        wrapper: wrapper({}),
        initialProps: { applicationId: 'app_a' },
      }
    )

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(c => String(c[0]).includes('/payments'))
      expect(calls.length).toBeGreaterThanOrEqual(1)
      expect(String(calls[0]?.[0])).toContain('applicationId=app_a')
    })

    rerender({ applicationId: 'app_b' })

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(c => String(c[0]).includes('/payments'))
      expect(calls.length).toBeGreaterThanOrEqual(2)
      expect(String(calls[calls.length - 1]?.[0])).toContain('applicationId=app_b')
    })
  })
})

describe('usePaymentHistory — VULN-2 race condition guard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('discards a stale response from a previous applicationId when user switches apps', async () => {
    // Queue of deferred responses keyed by URL substring so we can resolve them
    // in a non-FIFO order (slow app_a response comes AFTER fast app_b response).
    const deferred = new Map<string, (res: Response) => void>()

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('applicationId=app_a')) {
        return new Promise<Response>(resolve => deferred.set('app_a', resolve))
      }
      if (url.includes('applicationId=app_b')) {
        return new Promise<Response>(resolve => deferred.set('app_b', resolve))
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result, rerender } = renderHook(
      ({ applicationId }: { applicationId: string }) =>
        usePaymentHistory({ userId: 'u_1', applicationId }),
      {
        wrapper: wrapper({}),
        initialProps: { applicationId: 'app_a' },
      }
    )

    // Wait for the app_a fetch to be in-flight
    await waitFor(() => {
      expect(deferred.has('app_a')).toBe(true)
    })

    // Switch to app_b BEFORE app_a has returned
    rerender({ applicationId: 'app_b' })
    await waitFor(() => {
      expect(deferred.has('app_b')).toBe(true)
    })

    // Resolve app_b FIRST (normal UX — fast response)
    deferred.get('app_b')?.(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: 'pay_b',
              projectId: 'pb',
              projectName: 'Project B',
              type: 'purchase',
              amount: 10,
              currency: 'EUR',
              provider: 'stripe',
              paymentId: 'pi_b',
              status: 'completed',
              isAnonymous: false,
              liveMode: false,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          ],
          meta: { total: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await waitFor(() => {
      expect(result.current.payments).toHaveLength(1)
      expect(result.current.payments[0]?.id).toBe('pay_b')
    })

    // NOW resolve the stale app_a response. It MUST be discarded — UI must
    // keep showing app_b data, not overwrite it with app_a's payload.
    deferred.get('app_a')?.(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: 'pay_a_STALE',
              projectId: 'pa',
              projectName: 'Project A',
              type: 'purchase',
              amount: 999,
              currency: 'EUR',
              provider: 'stripe',
              paymentId: 'pi_a',
              status: 'completed',
              isAnonymous: false,
              liveMode: false,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          ],
          meta: { total: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    // Give the stale promise time to settle
    await new Promise(r => setTimeout(r, 30))

    // UI must STILL show app_b data — never the stale app_a payload.
    expect(result.current.payments).toHaveLength(1)
    expect(result.current.payments[0]?.id).toBe('pay_b')
  })

  it('aborts the in-flight request on unmount', async () => {
    const fetchMock = setupFetchMock([
      {
        url: '/payments',
        response: { success: true, data: [], meta: { total: 0 } },
      },
    ])

    const { unmount } = renderHook(
      () => usePaymentHistory({ userId: 'u_1', applicationId: 'app_a' }),
      { wrapper: wrapper({}) }
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    // Unmount while a follow-up fetch could be racing; no assertions beyond
    // "doesn't throw and the cleanup runs" — the request id guard + abort
    // together make late responses safe.
    expect(() => unmount()).not.toThrow()
  })

  it('passes the AbortController signal through to the underlying fetch', async () => {
    // Verify signal propagation end-to-end: abort on the React-side controller
    // must cause the DOM fetch to see an aborted signal and reject with
    // AbortError — NOT merely "response discarded UI-side" (VULN-2 true fix).
    const abortedSignals: AbortSignal[] = []
    let rejectFetch: ((err: Error) => void) | null = null

    const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (!url.includes('/payments')) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
        )
      }

      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal
        if (signal) {
          abortedSignals.push(signal)
          signal.addEventListener('abort', () => {
            rejectFetch = reject
            reject(new DOMException('The operation was aborted', 'AbortError'))
          })
        }
        // Never resolves unless aborted — simulates a slow backend
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { unmount } = renderHook(
      () => usePaymentHistory({ userId: 'u_1', applicationId: 'app_a' }),
      { wrapper: wrapper({}) }
    )

    await waitFor(() => {
      expect(abortedSignals.length).toBeGreaterThanOrEqual(1)
    })

    // Signal must have been passed (not undefined)
    const signal = abortedSignals[0]
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)

    // Trigger unmount → hook cleanup aborts the controller
    unmount()

    // Give the abort event loop time to fire
    await new Promise(r => setTimeout(r, 10))

    expect(signal?.aborted).toBe(true)
    expect(rejectFetch).not.toBeNull()
  })
})

describe('usePaymentHistory — VULN-1 refuse fetch on failed resolution', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('refuses to fetch and surfaces an error when publishableKey resolution fails', async () => {
    // Make /keys/config fail (publishableKey resolution rejects)
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/keys/config')) {
        return new Response(JSON.stringify({ error: 'Upstream 5xx' }), { status: 503 })
      }
      // Any /payments call would be a leak — return an unambiguous cross-app payload
      if (url.includes('/payments')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'pay_CROSS_APP_LEAK' }],
            meta: { total: 1 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('{}', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)
    // Silence expected console.error from the provider
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function FailedWrapper({ children }: { children: React.ReactNode }) {
      return (
        <PayProvider
          publishableKey="ez_pk_test_broken"
          config={{ apiUrl: 'http://api.example.com/api' }}
        >
          {children}
        </PayProvider>
      )
    }

    const { result } = renderHook(() => usePaymentHistory({ userId: 'u_1' }), {
      wrapper: FailedWrapper,
    })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })

    // Error surfaced, no payments fetched — NO cross-app leak.
    expect(result.current.payments).toHaveLength(0)
    expect(result.current.error).toContain('Billing context unavailable')

    // /payments must NOT have been called
    const paymentsCall = fetchMock.mock.calls.find(c => String(c[0]).includes('/payments'))
    expect(paymentsCall).toBeUndefined()

    errorSpy.mockRestore()
  })

  it('defers fetching while resolution is pending', async () => {
    // Never-resolving keys/config fetch to keep the provider in `pending`.
    let releaseResolve: (() => void) | null = null
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/keys/config')) {
        return new Promise<Response>(resolve => {
          releaseResolve = () =>
            resolve(
              new Response(
                JSON.stringify({
                  success: true,
                  data: { applicationId: 'app_pending_done', appSlug: 'ezpay' },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            )
        })
      }
      if (url.includes('/payments')) {
        return new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('{}', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    function PendingWrapper({ children }: { children: React.ReactNode }) {
      return (
        <PayProvider
          publishableKey="ez_pk_test_pending"
          config={{ apiUrl: 'http://api.example.com/api' }}
        >
          {children}
        </PayProvider>
      )
    }

    renderHook(() => usePaymentHistory({ userId: 'u_1' }), { wrapper: PendingWrapper })

    // Allow any microtasks to settle
    await new Promise(r => setTimeout(r, 30))

    // /payments must NOT have been called while status is 'pending'
    const beforeResolve = fetchMock.mock.calls.filter(c => String(c[0]).includes('/payments'))
    expect(beforeResolve).toHaveLength(0)

    // Release the resolution — now /payments should fire.
    releaseResolve?.()

    await waitFor(() => {
      const afterResolve = fetchMock.mock.calls.filter(c => String(c[0]).includes('/payments'))
      expect(afterResolve.length).toBeGreaterThanOrEqual(1)
    })
  })
})
