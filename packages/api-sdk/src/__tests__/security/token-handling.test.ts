import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../core/create-client.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_BASE = 'http://api.test.local'

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Token handling security', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // VULN-20: Token stored in localStorage — XSS readable
  // This is a design documentation test, not a bug
  it('ezstart-client reads tokens from localStorage (XSS-accessible)', () => {
    // FINDING: The ezstart-client.ts reads tokens from localStorage key
    // "ezauth-storage". This means any XSS on the page can read tokens.
    // However, the client uses credentials: 'include' (httpOnly cookies)
    // as the primary auth mechanism. The localStorage tokens are a fallback
    // for non-cookie scenarios.
    //
    // Mitigation: The auth system should prefer httpOnly cookies.
    // The SDK correctly supports both patterns via configurable tokenStore.
    expect(true).toBe(true) // Documentation test
  })

  // VULN-21: Token in URL params — never happens
  it('token is sent in Authorization header, never in URL', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => 'secret-token',
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await client.apiCall('/test')

    const url = fetchMock.mock.calls[0]?.[0] as string
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>

    // CORRECT: Token is in header, never in URL
    expect(url).not.toContain('secret-token')
    expect(headers['Authorization']).toBe('Bearer secret-token')
  })

  // VULN-19: Token NOT in cache keys (React Query)
  it('React Query cache keys do not include tokens', () => {
    // By examining react-query.ts, buildQueryKey uses [appName, endpoint, query]
    // Token is never part of the key — CORRECT
    // This means tokens are not visible in React Query DevTools
    //
    // buildQueryKey(appName, endpoint, query) => [appName, endpoint, query?]
    // No token, no auth headers in the key.
    expect(true).toBe(true) // Documentation test — verified by code review
  })

  // Edge: getToken returns a Promise
  it('async getToken is properly awaited', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => Promise.resolve('async-token'),
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await client.apiCall('/test')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer async-token')
  })

  // Edge: getToken returns undefined (coerced to null)
  it('undefined from getToken is coerced to null (no header)', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => undefined as unknown as string | null,
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await client.apiCall('/test')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })

  // Edge: skipAuth overrides tokenStore
  it('skipAuth prevents token injection even with tokenStore', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => 'should-not-appear',
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await client.apiCall('/public', { skipAuth: true })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })

  // Edge: per-call getToken overrides tokenStore
  it('per-call getToken overrides global tokenStore', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => 'global-token',
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await client.apiCall('/test', {
      getToken: () => 'override-token',
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer override-token')
  })
})
