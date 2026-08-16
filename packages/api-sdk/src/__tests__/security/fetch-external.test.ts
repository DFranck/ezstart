import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchExternal } from '../../index.js'
import { ApiError } from '../../core/api-error.js'

type FetchMock = ReturnType<typeof vi.fn>

describe('fetchExternal security', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // VULN-11: SSRF — fetchExternal accepts any URL
  it('accepts internal network URLs (SSRF risk — caller responsibility)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ secret: 'data' }), { status: 200 })
    )

    // FINDING: fetchExternal does NOT validate URLs — any URL is accepted.
    // This includes internal network addresses. However, this is by design:
    // fetchExternal is a thin wrapper, SSRF prevention belongs at the
    // network/infrastructure level (firewall, egress rules).
    const result = await fetchExternal<{ secret: string }>('http://169.254.169.254/latest/meta-data/')
    expect(result).toEqual({ secret: 'data' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://169.254.169.254/latest/meta-data/')
  })

  // VULN-12: No response size limit
  it('no response size limit on fetchExternal (caller responsibility)', async () => {
    // fetchExternal calls res.text() which loads entire body into memory
    // FINDING: No max response size enforcement. A malicious server could
    // return a multi-GB response and exhaust memory.
    // Mitigation: infrastructure-level (proxy/CDN response size limits)
    const largeBody = 'x'.repeat(1_000_000)
    fetchMock.mockResolvedValueOnce(new Response(largeBody, { status: 200 }))

    const result = await fetchExternal<string>('http://example.com/large')
    expect(typeof result).toBe('string')
    expect((result as string).length).toBe(1_000_000)
  })

  // VULN-13: No timeout on fetchExternal
  it('hanging server can block fetchExternal indefinitely (no timeout)', async () => {
    // FINDING: fetchExternal does NOT set a default timeout.
    // A malicious/slow server can hang the client forever.
    // Mitigation: caller should pass AbortSignal with timeout.
    const controller = new AbortController()

    fetchMock.mockImplementationOnce(() => {
      return new Promise((_resolve, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })

    // Caller CAN pass an abort signal via init
    const promise = fetchExternal('http://slow.example.com', {
      signal: controller.signal,
    })

    controller.abort()

    await expect(promise).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })

  // Edge: fetchExternal with non-JSON 200 response
  it('non-JSON 200 response returns raw text', async () => {
    fetchMock.mockResolvedValueOnce(new Response('plain text', { status: 200 }))

    const result = await fetchExternal('http://example.com')
    expect(result).toBe('plain text')
  })

  // Edge: fetchExternal with empty 200 response
  it('empty 200 response returns null', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))

    const result = await fetchExternal('http://example.com')
    expect(result).toBeNull()
  })

  // Edge: fetchExternal error with non-JSON body
  it('error with HTML body extracts text as message', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<h1>Internal Server Error</h1>', { status: 500 })
    )

    await expect(
      fetchExternal('http://example.com')
    ).rejects.toMatchObject({
      status: 500,
      message: '<h1>Internal Server Error</h1>',
    })
  })
})
