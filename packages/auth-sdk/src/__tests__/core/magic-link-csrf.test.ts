/**
 * CSRF coverage for the core `requestMagicLink` (SDK-CSRF-APICALL-001 wiring).
 *
 * `requestMagicLink` is a same-origin cookie-auth write (`POST
 * /magic-link/request` with `credentials: 'include'`). A raw `fetch` would be
 * CSRF-vulnerable. These tests prove the function now routes through the
 * centralized `cookieWrite` helper: it primes the `csrf-token` cookie on cache
 * miss and attaches the double-submit `X-CSRF-Token` header on the write,
 * retrying once on a 403 CSRF mismatch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestMagicLink } from '../../core/magic-link.js'

const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>

const API_URL = 'http://localhost:6110/api/auth'
const REQUEST_URL = `${API_URL}/magic-link/request`
const PRIME_URL = `${API_URL}/login-cookie/csrf`

/** Replace `document.cookie` with a fixed value for the test duration. */
function setDocumentCookie(value: string): void {
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => value,
    set: () => {
      // no-op — the helper only reads document.cookie.
    },
  })
}

function okJson(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response
}

function headerOf(init: RequestInit | undefined, name: string): string | undefined {
  const headers = (init?.headers ?? {}) as Record<string, string>
  return headers[name]
}

describe('requestMagicLink — CSRF double-submit', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    setDocumentCookie('')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('attaches X-CSRF-Token from an existing cookie and skips priming', async () => {
    setDocumentCookie('csrf-token=tok123')
    mockFetch.mockResolvedValueOnce(okJson({ data: { message: 'Check your inbox' } }))

    const result = await requestMagicLink({ apiUrl: API_URL, email: 'me@example.com' })

    expect(result).toEqual({ message: 'Check your inbox' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(REQUEST_URL)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(headerOf(init, 'X-CSRF-Token')).toBe('tok123')
  })

  it('primes the csrf cookie on cache miss then attaches the freshly primed token', async () => {
    mockFetch.mockImplementationOnce((url: string) => {
      expect(url).toBe(PRIME_URL)
      setDocumentCookie('csrf-token=primed456')
      return Promise.resolve(okJson({}))
    })
    mockFetch.mockResolvedValueOnce(okJson({ data: { message: 'Check your inbox' } }))

    await requestMagicLink({ apiUrl: API_URL, email: 'me@example.com' })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [primeUrl, primeInit] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(primeUrl).toBe(PRIME_URL)
    expect(primeInit.method).toBe('GET')
    const [postUrl, postInit] = mockFetch.mock.calls[1] as [string, RequestInit]
    expect(postUrl).toBe(REQUEST_URL)
    expect(headerOf(postInit, 'X-CSRF-Token')).toBe('primed456')
  })

  it('retries once with a re-primed token on a 403 CSRF mismatch', async () => {
    setDocumentCookie('csrf-token=stale')
    const csrfBody = { error: 'CSRF token mismatch' }
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      clone: () => ({ json: async () => csrfBody }),
      json: async () => csrfBody,
    } as unknown as Response)
    mockFetch.mockImplementationOnce(() => {
      setDocumentCookie('csrf-token=fresh789')
      return Promise.resolve(okJson({}))
    })
    mockFetch.mockResolvedValueOnce(okJson({ data: { message: 'Check your inbox' } }))

    const result = await requestMagicLink({ apiUrl: API_URL, email: 'me@example.com' })

    expect(result).toEqual({ message: 'Check your inbox' })
    expect(mockFetch).toHaveBeenCalledTimes(3)
    const [, retryInit] = mockFetch.mock.calls[2] as [string, RequestInit]
    expect(headerOf(retryInit, 'X-CSRF-Token')).toBe('fresh789')
  })
})
