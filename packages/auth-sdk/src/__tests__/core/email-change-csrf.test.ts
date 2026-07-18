/**
 * CSRF coverage for the core `requestEmailChange` (SDK-CSRF-APICALL-001 wiring).
 *
 * `requestEmailChange` is a same-origin cookie-auth write (`POST /change-email`
 * with `credentials: 'include'`). A raw `fetch` would be CSRF-vulnerable — the
 * browser sends the httpOnly session cookie automatically but never the CSRF
 * header. These tests prove the function now routes through the centralized
 * `cookieWrite` helper: it primes the `csrf-token` cookie on cache miss and
 * attaches the double-submit `X-CSRF-Token` header on the write, retrying once
 * on a 403 CSRF mismatch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestEmailChange } from '../../core/email-change.js'

const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>

const API_URL = 'http://localhost:6110/api/auth'
const CHANGE_EMAIL_URL = `${API_URL}/change-email`
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

describe('requestEmailChange — CSRF double-submit', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    setDocumentCookie('')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('attaches X-CSRF-Token from an existing cookie and skips priming', async () => {
    setDocumentCookie('csrf-token=tok123')
    mockFetch.mockResolvedValueOnce(okJson({ data: { message: 'sent', expiresAt: '2026-01-01' } }))

    const result = await requestEmailChange({ apiUrl: API_URL, newEmail: 'new@example.com' })

    expect(result).toEqual({ message: 'sent', expiresAt: '2026-01-01' })
    // Cookie already present → no prime round-trip, single POST.
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(CHANGE_EMAIL_URL)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(headerOf(init, 'X-CSRF-Token')).toBe('tok123')
  })

  it('primes the csrf cookie on cache miss then attaches the freshly primed token', async () => {
    // 1st fetch = prime GET; simulate the browser storing the Set-Cookie value.
    mockFetch.mockImplementationOnce((url: string) => {
      expect(url).toBe(PRIME_URL)
      setDocumentCookie('csrf-token=primed456')
      return Promise.resolve(okJson({}))
    })
    // 2nd fetch = the POST /change-email write.
    mockFetch.mockResolvedValueOnce(okJson({ data: { message: 'sent', expiresAt: '2026-01-01' } }))

    await requestEmailChange({ apiUrl: API_URL, newEmail: 'new@example.com' })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [primeUrl, primeInit] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(primeUrl).toBe(PRIME_URL)
    expect(primeInit.method).toBe('GET')
    const [postUrl, postInit] = mockFetch.mock.calls[1] as [string, RequestInit]
    expect(postUrl).toBe(CHANGE_EMAIL_URL)
    expect(headerOf(postInit, 'X-CSRF-Token')).toBe('primed456')
  })

  it('retries once with a re-primed token on a 403 CSRF mismatch', async () => {
    setDocumentCookie('csrf-token=stale')
    // 1st POST → 403 CSRF mismatch (with a clonable body).
    const csrfBody = { error: 'CSRF token mismatch' }
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      clone: () => ({ json: async () => csrfBody }),
      json: async () => csrfBody,
    } as unknown as Response)
    // Re-prime GET → refresh the cookie value.
    mockFetch.mockImplementationOnce(() => {
      setDocumentCookie('csrf-token=fresh789')
      return Promise.resolve(okJson({}))
    })
    // Retried POST → success.
    mockFetch.mockResolvedValueOnce(okJson({ data: { message: 'sent', expiresAt: '2026-01-01' } }))

    const result = await requestEmailChange({ apiUrl: API_URL, newEmail: 'new@example.com' })

    expect(result).toEqual({ message: 'sent', expiresAt: '2026-01-01' })
    expect(mockFetch).toHaveBeenCalledTimes(3)
    // The retried write carries the re-primed token.
    const [, retryInit] = mockFetch.mock.calls[2] as [string, RequestInit]
    expect(headerOf(retryInit, 'X-CSRF-Token')).toBe('fresh789')
  })

  it('still attaches Bearer Authorization alongside the CSRF header', async () => {
    setDocumentCookie('csrf-token=tok123')
    mockFetch.mockResolvedValueOnce(okJson({ data: { message: 'sent', expiresAt: '2026-01-01' } }))

    await requestEmailChange({
      apiUrl: API_URL,
      newEmail: 'new@example.com',
      accessToken: 'bearer-abc',
    })

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(headerOf(init, 'Authorization')).toBe('Bearer bearer-abc')
    expect(headerOf(init, 'X-CSRF-Token')).toBe('tok123')
  })
})
