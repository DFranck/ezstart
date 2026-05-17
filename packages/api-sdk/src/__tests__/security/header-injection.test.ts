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

  // VULN-2c (post-MED-5): caller-supplied Authorization is preserved.
  //
  // Prior policy: token-from-store always overwrote a caller-supplied
  // Authorization header (defense-in-depth against accidental auth
  // injection). New policy (Wave C MED-5): the explicit caller header
  // wins, case-insensitively, so a consumer can intentionally override
  // the auth scheme (e.g. swap to `Basic`, or proxy a delegated token)
  // without the token store silently shadowing it. Bearer leaks via a
  // lowercase `authorization` header are also now prevented.
  it('caller-supplied Authorization header is preserved over the token store (MED-5)', () => {
    const headers = buildHeaders({ Authorization: 'Bearer caller-token' }, 'token-from-store', {})
    expect(headers['Authorization']).toBe('Bearer caller-token')
  })

  it('caller-supplied lowercase authorization header is preserved (MED-5 case-insensitive)', () => {
    const headers = buildHeaders({ authorization: 'Bearer caller-token' }, 'token-from-store', {})
    // The caller's exact-case header is kept, and no duplicate canonical
    // `Authorization` is injected.
    expect(headers['authorization']).toBe('Bearer caller-token')
    expect(headers['Authorization']).toBeUndefined()
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
