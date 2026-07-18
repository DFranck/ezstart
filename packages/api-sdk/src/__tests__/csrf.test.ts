import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../core/create-client.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_BASE = 'http://api.test.local'
const PRIME_URL = `${TEST_BASE}/api/auth/login-cookie/csrf`

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Mutable `document` stub so a primed fetch can update `document.cookie`. */
function stubDocument(cookie = ''): { cookie: string } {
  const doc = { cookie }
  vi.stubGlobal('document', doc)
  return doc
}

/** Extract the headers object from a recorded fetch call. */
function headersOf(fetchMock: FetchMock, callIndex: number): Record<string, string> {
  const init = fetchMock.mock.calls[callIndex]?.[1] as RequestInit
  return init.headers as Record<string, string>
}

describe('apiCall — CSRF double-submit (SDK-CSRF-APICALL-001)', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('(a) attaches X-CSRF-Token from the cookie on a cookie-auth POST', async () => {
    stubDocument('csrf-token=abc123')
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const client = createApiClient({
      baseUrl: TEST_BASE,
      credentials: 'include',
      csrfConfig: { primeUrl: PRIME_URL },
    })
    await client.apiCall('/account/change-email', { method: 'POST', body: { email: 'a@b.c' } })

    // No prime needed (cookie present) → single fetch, header attached.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(headersOf(fetchMock, 0)['X-CSRF-Token']).toBe('abc123')
  })

  it('(b) primes on miss (GET primeUrl) then attaches the freshly-set token', async () => {
    const doc = stubDocument('') // no cookie yet
    // Prime GET → server "sets" the cookie.
    fetchMock.mockImplementationOnce((url: string) => {
      expect(url).toBe(PRIME_URL)
      doc.cookie = 'csrf-token=primed456'
      return Promise.resolve(jsonResponse({ success: true, data: null }))
    })
    // The actual write.
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const client = createApiClient({
      baseUrl: TEST_BASE,
      credentials: 'include',
      csrfConfig: { primeUrl: PRIME_URL },
    })
    await client.apiCall('/admin/maintenance-mode', { method: 'PUT', body: { enabled: true } })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(PRIME_URL)
    expect(headersOf(fetchMock, 1)['X-CSRF-Token']).toBe('primed456')
  })

  it('(c) retries once on 403 with a re-primed token', async () => {
    const doc = stubDocument('csrf-token=stale1')
    // First write → 403 CSRF mismatch.
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'CSRF token mismatch' }, { status: 403 }))
    // Re-prime GET → rotates the cookie.
    fetchMock.mockImplementationOnce(() => {
      doc.cookie = 'csrf-token=fresh2'
      return Promise.resolve(jsonResponse({ success: true, data: null }))
    })
    // Retry write → success.
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const client = createApiClient({
      baseUrl: TEST_BASE,
      credentials: 'include',
      csrfConfig: { primeUrl: PRIME_URL },
    })
    await client.apiCall('/admin/feature-flags/beta', { method: 'PATCH', body: { on: true } })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(headersOf(fetchMock, 0)['X-CSRF-Token']).toBe('stale1') // first attempt
    expect(fetchMock.mock.calls[1]?.[0]).toBe(PRIME_URL) // re-prime
    expect(headersOf(fetchMock, 2)['X-CSRF-Token']).toBe('fresh2') // retry uses fresh token
  })

  it('(d) does NOT attach CSRF on a GET (no prime, no header)', async () => {
    stubDocument('csrf-token=abc123')
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: [] }))

    const client = createApiClient({
      baseUrl: TEST_BASE,
      credentials: 'include',
      csrfConfig: { primeUrl: PRIME_URL },
    })
    await client.apiCall('/admin/feature-flags')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).not.toBe(PRIME_URL)
    expect(headersOf(fetchMock, 0)['X-CSRF-Token']).toBeUndefined()
  })

  it('(e) does NOT attach CSRF on a Bearer-authenticated POST', async () => {
    stubDocument('csrf-token=abc123')
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const client = createApiClient({
      baseUrl: TEST_BASE,
      credentials: 'include',
      csrfConfig: { primeUrl: PRIME_URL },
    })
    await client.apiCall('/donations', {
      method: 'POST',
      body: { amount: 5 },
      getToken: () => 'bearer-token',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const headers = headersOf(fetchMock, 0)
    expect(headers['Authorization']).toBe('Bearer bearer-token')
    expect(headers['X-CSRF-Token']).toBeUndefined()
  })

  it('(f) is SSR-safe: no document → no crash, no CSRF header', async () => {
    // No document stub — `typeof document === "undefined"`.
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const client = createApiClient({
      baseUrl: TEST_BASE,
      credentials: 'include',
      csrfConfig: { primeUrl: PRIME_URL },
    })
    await expect(
      client.apiCall('/account/change-email', { method: 'POST', body: { email: 'a@b.c' } })
    ).resolves.toEqual({ ok: true })

    // prime() no-ops server-side → only the write fetch runs, no header.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(headersOf(fetchMock, 0)['X-CSRF-Token']).toBeUndefined()
  })

  it('(g) backward-compat: no csrfConfig → no prime, no header on cookie-auth POST', async () => {
    stubDocument('csrf-token=abc123')
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const client = createApiClient({ baseUrl: TEST_BASE, credentials: 'include' })
    await client.apiCall('/account/change-email', { method: 'POST', body: { email: 'a@b.c' } })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(headersOf(fetchMock, 0)['X-CSRF-Token']).toBeUndefined()
  })

  it('respects a caller-supplied X-CSRF-Token (does not overwrite)', async () => {
    stubDocument('csrf-token=cookie-token')
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const client = createApiClient({
      baseUrl: TEST_BASE,
      credentials: 'include',
      csrfConfig: { primeUrl: PRIME_URL },
    })
    await client.apiCall('/account/change-email', {
      method: 'POST',
      body: { email: 'a@b.c' },
      headers: { 'X-CSRF-Token': 'caller-wins' },
    })

    expect(headersOf(fetchMock, 0)['X-CSRF-Token']).toBe('caller-wins')
  })

  it('honours a custom cookieName + headerName', async () => {
    stubDocument('xsrf=custom99')
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const client = createApiClient({
      baseUrl: TEST_BASE,
      credentials: 'include',
      csrfConfig: { cookieName: 'xsrf', headerName: 'X-XSRF-Token' },
    })
    await client.apiCall('/account/change-email', { method: 'POST', body: { email: 'a@b.c' } })

    expect(headersOf(fetchMock, 0)['X-XSRF-Token']).toBe('custom99')
  })

  it('without primeUrl: reads existing cookie but never primes on miss', async () => {
    stubDocument('') // no cookie, no primeUrl → nothing to attach
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const client = createApiClient({
      baseUrl: TEST_BASE,
      credentials: 'include',
      csrfConfig: {}, // enabled, but no primeUrl
    })
    await client.apiCall('/account/change-email', { method: 'POST', body: { email: 'a@b.c' } })

    // Single write fetch, no prime GET, no header.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).not.toBe(PRIME_URL)
    expect(headersOf(fetchMock, 0)['X-CSRF-Token']).toBeUndefined()
  })
})
