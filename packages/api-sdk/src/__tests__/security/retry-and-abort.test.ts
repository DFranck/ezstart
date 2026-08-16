import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../core/create-client.js'
import { ApiError } from '../../core/api-error.js'
import { parseRetryAfter } from '../../core/parse-api-error.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_BASE = 'http://api.test.local'

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Retry-after and abort handling', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // VULN-7: retryAfter with extremely large value — capped at 3600s
  it('extremely large retryAfter is capped at 3600 seconds (1 hour)', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: 'Rate limited', retryAfter: 999999999 },
        { status: 429 }
      )
    )

    let caught: unknown
    try {
      await client.apiCall('/test', { skipAuth: true })
    } catch (err) {
      caught = err
    }

    expect(ApiError.isApiError(caught)).toBe(true)
    // FIX: retryAfter is capped at 3600 to prevent malicious blocking
    expect((caught as ApiError).retryAfter).toBe(3600)
  })

  // VULN-7b: retryAfter as negative number
  it('negative retryAfter is ignored (returns undefined)', () => {
    expect(parseRetryAfter({ retryAfter: -1 })).toBeUndefined()
  })

  // VULN-7c: retryAfter as NaN
  it('NaN retryAfter is ignored', () => {
    expect(parseRetryAfter({ retryAfter: NaN })).toBeUndefined()
  })

  // VULN-7d: retryAfter as Infinity
  it('Infinity retryAfter is ignored', () => {
    expect(parseRetryAfter({ retryAfter: Infinity })).toBeUndefined()
  })

  // VULN-7e: retryAfter as string "Infinity"
  it('string Infinity retryAfter is ignored', () => {
    expect(parseRetryAfter({ retryAfter: 'Infinity' })).toBeUndefined()
  })

  // VULN-6: AbortSignal properly cancels and throws
  it('AbortSignal fires before response — throws NETWORK_ERROR', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    const controller = new AbortController()

    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    const promise = client.apiCall('/slow', {
      skipAuth: true,
      signal: controller.signal,
    })

    controller.abort()

    await expect(promise).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })

  // VULN-6b: AbortSignal already aborted before call
  it('pre-aborted signal throws immediately', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    const controller = new AbortController()
    controller.abort()

    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      if (init.signal?.aborted) {
        return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
      }
      return Promise.resolve(jsonResponse({ ok: true }))
    })

    await expect(
      client.apiCall('/test', { skipAuth: true, signal: controller.signal })
    ).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })
})
