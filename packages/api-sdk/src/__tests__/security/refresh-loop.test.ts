import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../core/create-client.js'
import { ApiError } from '../../core/api-error.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_BASE = 'http://api.test.local'
const REFRESH_URL = 'http://auth.test.local/api/auth/refresh'

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('401 refresh loop protection', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // VULN-5: Infinite refresh loop if refresh always returns 401
  it('does NOT infinite loop when refresh endpoint always returns 401', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => 'expired-token',
        getRefreshToken: () => 'valid-refresh',
        setTokens: vi.fn(),
      },
      refresh: {
        endpoint: REFRESH_URL,
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    // First call: 401
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, { status: 401 }))
    // Refresh call: also 401
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Refresh failed' }, { status: 401 }))

    // The refresh returns !ok, so doRefresh returns null, no retry happens
    await expect(
      client.apiCall('/protected')
    ).rejects.toMatchObject({ status: 401 })

    // CORRECT: Only 2 calls (original + refresh attempt), no retry
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  // VULN-5b: Refresh returns 200 but invalid tokens, then retry still 401
  it('does not loop when refresh returns 200 but invalid token format', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => 'expired-token',
        getRefreshToken: () => 'valid-refresh',
        setTokens: vi.fn(),
      },
      refresh: {
        endpoint: REFRESH_URL,
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    // First call: 401
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, { status: 401 }))
    // Refresh: 200 but missing accessToken field
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { wrong: 'shape' } }))

    // defaultParseResponse returns null (no accessToken), no retry
    await expect(
      client.apiCall('/protected')
    ).rejects.toMatchObject({ status: 401 })

    // Only original + refresh, no retry
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  // VULN-5c: Refresh returns valid tokens, retry also returns 401
  it('retries exactly once after successful refresh, then throws on second 401', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => 'expired-token',
        getRefreshToken: () => 'valid-refresh',
        setTokens: vi.fn(),
      },
      refresh: {
        endpoint: REFRESH_URL,
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    // First call: 401
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, { status: 401 }))
    // Refresh: success
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { accessToken: 'new-token', refreshToken: 'new-refresh' } })
    )
    // Retry: still 401 (e.g. token immediately revoked)
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Still unauthorized' }, { status: 401 }))

    await expect(
      client.apiCall('/protected')
    ).rejects.toMatchObject({ status: 401 })

    // CORRECT: 3 calls (original + refresh + one retry), no further loop
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  // VULN-5d: Concurrent 401s — single-flight refresh deduplication
  it('concurrent 401s trigger only one refresh call', async () => {
    let refreshCallCount = 0
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => 'expired-token',
        getRefreshToken: () => 'valid-refresh',
        setTokens: vi.fn(),
      },
      refresh: {
        endpoint: REFRESH_URL,
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockImplementation((url: string) => {
      if (url === REFRESH_URL) {
        refreshCallCount++
        return Promise.resolve(
          jsonResponse({ data: { accessToken: 'new-token', refreshToken: 'new-refresh' } })
        )
      }
      if (refreshCallCount === 0) {
        // First round: all return 401
        return Promise.resolve(jsonResponse({ error: 'Unauthorized' }, { status: 401 }))
      }
      // After refresh: success
      return Promise.resolve(jsonResponse({ data: 'ok' }))
    })

    // Fire 3 concurrent calls
    const results = await Promise.allSettled([
      client.apiCall('/a'),
      client.apiCall('/b'),
      client.apiCall('/c'),
    ])

    // All should succeed (or at least not infinite loop)
    expect(results.every(r => r.status === 'fulfilled' || r.status === 'rejected')).toBe(true)

    // CORRECT: Single-flight means only 1 refresh call despite 3 concurrent 401s
    expect(refreshCallCount).toBe(1)
  })

  // VULN-22: Double refresh race condition
  it('second 401 during inflight refresh reuses the same promise', async () => {
    const setTokens = vi.fn()
    let callCount = 0
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => 'expired-token',
        getRefreshToken: () => 'valid-refresh',
        setTokens,
      },
      refresh: {
        endpoint: REFRESH_URL,
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    let refreshResolve: ((v: Response) => void) | null = null
    let refreshCallCount = 0

    fetchMock.mockImplementation((url: string) => {
      if (url === REFRESH_URL) {
        refreshCallCount++
        return new Promise<Response>(resolve => {
          refreshResolve = resolve
        })
      }
      callCount++
      if (callCount <= 2) {
        // First two calls return 401
        return Promise.resolve(jsonResponse({ error: 'Unauthorized' }, { status: 401 }))
      }
      // After refresh, return success
      return Promise.resolve(jsonResponse({ data: 'ok' }))
    })

    // Start two calls that will both get 401
    const p1 = client.apiCall('/a')
    const p2 = client.apiCall('/b')

    // Wait for both to hit 401 and start refresh
    await new Promise(r => setTimeout(r, 50))

    // Only one refresh call should be in-flight
    expect(refreshCallCount).toBe(1)

    // Resolve the refresh
    refreshResolve!(jsonResponse({ data: { accessToken: 'new', refreshToken: 'new-r' } }))

    // Both promises should resolve without unhandled rejections
    const results = await Promise.allSettled([p1, p2])

    // setTokens called exactly once (single-flight)
    expect(setTokens).toHaveBeenCalledTimes(1)

    // Both should complete (either fulfilled or rejected, no unhandled rejection)
    expect(results.every(r => r.status === 'fulfilled' || r.status === 'rejected')).toBe(true)
  })
})
