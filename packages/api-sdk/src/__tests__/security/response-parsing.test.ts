import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../core/create-client.js'
import { ApiError } from '../../core/api-error.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_BASE = 'http://api.test.local'

function makeResponse(body: string, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  const status = init.status ?? 200
  return new Response(body, { status, headers: init.headers })
}

describe('Response parsing security', () => {
  let fetchMock: FetchMock
  let client: ReturnType<typeof createApiClient>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    client = createApiClient({
      baseUrl: TEST_BASE,
      envelope: { unwrap: true, throwOnFailureEnvelope: true },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // VULN-3: Server returns HTML instead of JSON
  it('HTML response on 200 is returned as raw text (no crash)', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse('<html><body>404 Not Found</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    )

    // safeParseJson will fail to parse HTML, return it as text
    const result = await client.apiCall('/test', { skipAuth: true })
    expect(typeof result).toBe('string')
    expect(result).toContain('<html>')
  })

  // VULN-3b: Server returns HTML on error
  it('HTML error response is handled gracefully', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse('<html>502 Bad Gateway</html>', { status: 502 })
    )

    await expect(
      client.apiCall('/test', { skipAuth: true })
    ).rejects.toMatchObject({
      status: 502,
      // parseApiError receives the raw HTML string, returns it
      message: '<html>502 Bad Gateway</html>',
    })
  })

  // VULN-4: XSS in error message — error message with HTML/script tags
  it('XSS payload in error message is stored verbatim in ApiError', async () => {
    const xssPayload = '<script>alert("xss")</script>'
    fetchMock.mockResolvedValueOnce(
      makeResponse(
        JSON.stringify({ error: xssPayload }),
        { status: 400 }
      )
    )

    let caught: unknown
    try {
      await client.apiCall('/test', { skipAuth: true })
    } catch (err) {
      caught = err
    }

    expect(ApiError.isApiError(caught)).toBe(true)
    // FINDING: XSS payload is stored verbatim in error.message
    // The SDK does NOT sanitize — this is by design (SDK is transport layer).
    // UI layer MUST sanitize when rendering error messages.
    expect((caught as ApiError).message).toBe(xssPayload)
  })

  // VULN-4b: success:false with XSS in error on 200
  it('XSS in failure envelope on 200 is thrown as ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(
        JSON.stringify({ success: false, error: '<img src=x onerror=alert(1)>' }),
        { status: 200 }
      )
    )

    await expect(
      client.apiCall('/test', { skipAuth: true })
    ).rejects.toMatchObject({
      status: 200,
      message: '<img src=x onerror=alert(1)>',
    })
  })

  // VULN-8: Wrong Content-Type header
  it('JSON body with text/plain Content-Type is still parsed', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse('{"data": "ok"}', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    )

    // safeParseJson reads text() then JSON.parse — ignores Content-Type
    const result = await client.apiCall('/test', { skipAuth: true })
    expect(result).toEqual({ data: 'ok' })
  })

  // Edge: Very large response body
  it('very large JSON response does not crash', async () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `item-${i}` }))
    fetchMock.mockResolvedValueOnce(
      makeResponse(JSON.stringify({ success: true, data: largeArray }))
    )

    const result = await client.apiCall<unknown[]>('/test', { skipAuth: true })
    expect(Array.isArray(result)).toBe(true)
    expect((result as unknown[]).length).toBe(10000)
  })

  // Edge: Null byte in response
  it('null byte in JSON response', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse('{"data": "hello\\u0000world"}')
    )

    const result = await client.apiCall('/test', { skipAuth: true })
    expect(result).toEqual({ data: 'hello\0world' })
  })
})
