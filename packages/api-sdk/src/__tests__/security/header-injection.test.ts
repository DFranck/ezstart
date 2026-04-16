import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../core/create-client.js'
import { buildHeaders } from '../../core/internal/request.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_BASE = 'http://api.test.local'

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Header injection attacks', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // VULN-2a: Token with newline characters (CRLF header injection)
  it('token with CRLF characters is passed to Authorization header', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      tokenStore: {
        getAccessToken: () => 'valid\r\nX-Injected: evil',
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await client.apiCall('/test')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    // FINDING: Token with CRLF passed directly — browser fetch will reject,
    // but this shows no SDK-level sanitization
    expect(headers['Authorization']).toContain('\r\n')
  })

  // VULN-2b: Caller-supplied header keys with special characters
  it('caller can inject arbitrary header names', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await client.apiCall('/test', {
      skipAuth: true,
      headers: { 'X-Custom\r\nEvil: injected': 'value' },
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    // FINDING: Header name with CRLF passed through — fetch API will reject
    // but no SDK-level validation
    expect(Object.keys(headers).some(k => k.includes('\r\n'))).toBe(true)
  })

  // VULN-2c: Authorization header can be overwritten by caller headers
  it('caller-supplied Authorization header is overwritten by token', () => {
    const headers = buildHeaders(
      { Authorization: 'Bearer attacker-token' },
      'real-token',
      {}
    )
    // buildHeaders does NOT check if Authorization already exists — it overwrites
    // FINDING: Token always wins over caller header — this is CORRECT behavior
    // (defense in depth: prevents caller from injecting different auth)
    expect(headers['Authorization']).toBe('Bearer real-token')
  })

  // VULN-2d: Token is null — Authorization header is not set
  it('no Authorization header when token is null', () => {
    const headers = buildHeaders({}, null, {})
    expect(headers['Authorization']).toBeUndefined()
  })

  // VULN-2e: Empty string token still sets Authorization
  it('empty string token still sets Authorization header', () => {
    // Empty string is falsy so token guard should skip it
    const headers = buildHeaders({}, '', {})
    // CORRECT: empty string is falsy, no header set
    expect(headers['Authorization']).toBeUndefined()
  })
})
