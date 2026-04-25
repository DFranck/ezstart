/**
 * Tests for AbortSignal propagation in PayClient.getPayments().
 *
 * Verifies that an `AbortSignal` passed via `GetPaymentsParams.signal` is
 * forwarded to the underlying `fetch()` call. This is what makes the
 * `usePaymentHistory` abort controller actually cancel the HTTP request at
 * the network layer rather than merely discarding the response UI-side.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPayClient } from '../../core/pay-client.js'

describe('PayClient.getPayments — AbortSignal propagation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('forwards the signal from GetPaymentsParams to the underlying fetch call', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
    })
    const controller = new AbortController()

    await client.getPayments({ userId: 'u_1', signal: controller.signal })

    const fetchOptions = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(fetchOptions?.signal).toBe(controller.signal)
  })

  it('does not set signal when none is provided (backward compat)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
    })

    await client.getPayments({ userId: 'u_1' })

    const fetchOptions = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(fetchOptions?.signal).toBeUndefined()
  })

  it('rejects with AbortError when the controller is aborted before fetch resolves', async () => {
    // Use real fetch semantics — a delayed response that will be aborted
    // mid-flight. We simulate this by making fetch honor the AbortSignal.
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal
        if (signal) {
          if (signal.aborted) {
            reject(new DOMException('The operation was aborted', 'AbortError'))
            return
          }
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          })
        }
        // Never resolve unless aborted — simulates a slow backend
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
    })
    const controller = new AbortController()

    const pending = client.getPayments({ userId: 'u_1', signal: controller.signal })

    // Abort immediately — the underlying fetch must see the signal and reject.
    controller.abort()

    await expect(pending).rejects.toThrow(/abort/i)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('forwards signal through the 401 refresh-and-retry path', async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }
      return new Response(JSON.stringify({ success: true, data: [], meta: { total: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = createPayClient({
      appName: 'test',
      apiUrl: 'http://localhost:9999/api',
      getToken: () => 'expired',
      onTokenRefresh: async () => 'fresh',
    })
    const controller = new AbortController()

    await client.getPayments({ userId: 'u_1', signal: controller.signal })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstOpts = fetchMock.mock.calls[0]?.[1] as RequestInit
    const retryOpts = fetchMock.mock.calls[1]?.[1] as RequestInit
    expect(firstOpts?.signal).toBe(controller.signal)
    // The retry spreads the original options so the signal must survive the retry.
    expect(retryOpts?.signal).toBe(controller.signal)
  })
})
