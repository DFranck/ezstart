import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiCall, __resetRefreshPromiseForTests } from '../ezstart-client.js'
import { ApiError } from '../core/api-error.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_BASE = 'http://api.test.local'

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function textResponse(text: string, init: { status?: number } = {}): Response {
  const status = init.status ?? 200
  // Node's fetch forbids a non-null body for 204/205/304 — pass `null` for those.
  const nullBody = status === 204 || status === 205 || status === 304
  return new Response(nullBody ? null : text, { status })
}

describe('apiCall', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    __resetRefreshPromiseForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('unwraps { success, data } envelope on GET', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 1, name: 'Alice' } }))

    const result = await apiCall<{ id: number; name: string }>('/users/1', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      skipAuth: true,
    })

    expect(result).toEqual({ id: 1, name: 'Alice' })
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe(`${TEST_BASE}/api/users/1`)
    const init = call?.[1] as RequestInit
    expect(init.method).toBe('GET')
  })

  it('normalizes endpoint with /api prefix', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
    await apiCall('users', { appName: 'ezauth', baseUrl: TEST_BASE, skipAuth: true })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${TEST_BASE}/api/users`)
  })

  it('preserves existing /api prefix', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
    await apiCall('/api/users', { appName: 'ezauth', baseUrl: TEST_BASE, skipAuth: true })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${TEST_BASE}/api/users`)
  })

  it('serializes JSON body and sets Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    await apiCall('/users', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: { name: 'Bob' },
      skipAuth: true,
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ name: 'Bob' }))
  })

  it('passes FormData through without setting Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }))

    const form = new FormData()
    form.append('file', 'blob')

    await apiCall('/upload', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: form,
      skipAuth: true,
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['Content-Type']).toBeUndefined()
    expect(init.body).toBe(form)
  })

  it('encodes query params and skips undefined', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: [] }))

    await apiCall('/users', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      query: { page: 1, active: true, q: 'alice', skipMe: undefined },
      skipAuth: true,
    })

    const url = fetchMock.mock.calls[0]?.[0] as string
    expect(url).toContain('page=1')
    expect(url).toContain('active=true')
    expect(url).toContain('q=alice')
    expect(url).not.toContain('skipMe')
  })

  it('returns raw body when response is not wrapped', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ plain: 'payload' }))

    const result = await apiCall<{ plain: string }>('/raw', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      skipAuth: true,
    })

    expect(result).toEqual({ plain: 'payload' })
  })

  it('throws ApiError with parsed nested error message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
        },
        { status: 401 }
      )
    )

    await expect(
      apiCall('/login', {
        appName: 'ezauth',
        baseUrl: TEST_BASE,
        method: 'POST',
        body: { email: 'a@b.c' },
        skipAuth: true,
      })
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
    })
  })

  it('throws ApiError with parsed Zod validation message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          error: 'Invalid request',
          details: [{ message: 'Password must be at least 8 characters', path: ['password'] }],
        },
        { status: 400 }
      )
    )

    await expect(
      apiCall('/register', {
        appName: 'ezauth',
        baseUrl: TEST_BASE,
        method: 'POST',
        body: { password: 'x' },
        skipAuth: true,
      })
    ).rejects.toMatchObject({
      status: 400,
      message: 'Password must be at least 8 characters',
    })
  })

  it('throws ApiError with retryAfter on 429', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            message: 'Too many requests from this IP, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 900,
          },
        },
        { status: 429 }
      )
    )

    let caught: unknown
    try {
      await apiCall('/spam', {
        appName: 'ezauth',
        baseUrl: TEST_BASE,
        skipAuth: true,
      })
    } catch (err) {
      caught = err
    }

    expect(ApiError.isApiError(caught)).toBe(true)
    expect(caught).toMatchObject({
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 900,
    })
    expect((caught as ApiError).message).not.toContain('[object Object]')
  })

  it('throws network ApiError with status 0 on fetch failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(
      apiCall('/anywhere', { appName: 'ezauth', baseUrl: TEST_BASE, skipAuth: true })
    ).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })

  it('throws directly on 401 when skipRefresh is true', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, { status: 401 }))

    await expect(
      apiCall('/secret', {
        appName: 'ezauth',
        baseUrl: TEST_BASE,
        skipRefresh: true,
        getToken: () => 'stale-token',
      })
    ).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('auto-refreshes token on 401 and retries once', async () => {
    // First call: unauthorized
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'Expired' }, { status: 401 }))
    // Refresh call (to /api/auth/refresh on ezauth)
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: { accessToken: 'new-token', refreshToken: 'new-refresh' },
      })
    )
    // Retry: success
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 1 } }))

    // Seed "store" via getToken + stub localStorage for refresh-token read
    const storage: Record<string, string> = {
      'ezauth-storage': JSON.stringify({
        state: { accessToken: 'old-token', refreshToken: 'old-refresh' },
      }),
    }
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value
        },
        removeItem: (key: string) => {
          delete storage[key]
        },
      },
    })

    const result = await apiCall<{ id: number }>('/me', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
    })

    expect(result).toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(3)

    // Retry must use the new token
    const retryInit = fetchMock.mock.calls[2]?.[1] as RequestInit
    const retryHeaders = retryInit.headers as Record<string, string>
    expect(retryHeaders['Authorization']).toBe('Bearer new-token')
  })

  it('throws ApiError when HTTP 2xx body is { success: false }', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, error: { message: 'Business rule X' } }, { status: 200 })
    )

    await expect(
      apiCall('/business', { appName: 'ezauth', baseUrl: TEST_BASE, skipAuth: true })
    ).rejects.toMatchObject({ status: 200, message: 'Business rule X' })
  })

  it('handles empty (204-style) response without throwing', async () => {
    fetchMock.mockResolvedValueOnce(textResponse('', { status: 204 }))

    const result = await apiCall('/noop', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'DELETE',
      skipAuth: true,
    })

    expect(result).toBeNull()
  })

  it('throws ApiError with status 0 when AbortSignal fires', async () => {
    const controller = new AbortController()

    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    const promise = apiCall('/slow', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      skipAuth: true,
      signal: controller.signal,
    })

    controller.abort()

    let caught: unknown
    try {
      await promise
    } catch (err) {
      caught = err
    }

    expect(ApiError.isApiError(caught)).toBe(true)
    expect(caught).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('preserves caller-supplied Content-Type (does not overwrite)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: null }))

    await apiCall('/xml', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      method: 'POST',
      body: { foo: 'bar' },
      headers: { 'Content-Type': 'application/xml' },
      skipAuth: true,
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/xml')
    // Body is still JSON-stringified because our encoder saw a plain object.
    expect(init.body).toBe(JSON.stringify({ foo: 'bar' }))
  })

  it('returns the full envelope when preserveEnvelope is true', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: [1, 2],
        meta: { total: 10, limit: 2, offset: 0 },
      })
    )

    const result = await apiCall<{
      success: true
      data: number[]
      meta: { total: number; limit: number; offset: number }
    }>('/users', {
      appName: 'ezauth',
      baseUrl: TEST_BASE,
      skipAuth: true,
      preserveEnvelope: true,
    })

    expect(result).toEqual({
      success: true,
      data: [1, 2],
      meta: { total: 10, limit: 2, offset: 0 },
    })
  })
})
