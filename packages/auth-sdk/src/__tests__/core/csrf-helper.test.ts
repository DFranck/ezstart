/**
 * Unit tests for `core/auth-client/csrf.ts` — the CSRF helper used by the
 * SDK to fetch + cache the double-submit token on cookie-auth writes.
 *
 * Phase 1 of SDK-CSRF-TOKEN-ALWAYS-001. The helper:
 *  - Reads the `csrf-token` cookie from `document.cookie`.
 *  - Primes via `GET /login-cookie/csrf` (browser stores the cookie itself).
 *  - Dedupes concurrent prime calls (single in-flight promise).
 *  - Invalidates the cached "primed" flag on a 403 mismatch (caller-driven).
 *  - Is SSR-safe — `getToken()` returns `undefined` when `document` is unset.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCsrfHelper, type CsrfHelperContext } from '../../core/auth-client/csrf.js'

const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>

function makeCtx(overrides: Partial<CsrfHelperContext> = {}): CsrfHelperContext {
  return {
    apiUrl: 'https://api.example.com/api/auth',
    baseHeaders: (extra?: Record<string, string>) => ({ ...extra }),
    ...overrides,
  }
}

/** Replace `document.cookie` with a fixed value for the test duration. */
function setDocumentCookie(value: string): void {
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => value,
    set: () => {
      // setter is a no-op for these unit tests — the helper only reads.
    },
  })
}

describe('createCsrfHelper', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    setDocumentCookie('')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getToken reads the csrf-token cookie value from document.cookie', () => {
    setDocumentCookie('other=foo; csrf-token=abc123; another=bar')
    const helper = createCsrfHelper(makeCtx())
    expect(helper.getToken()).toBe('abc123')
  })

  it('getToken returns undefined when no csrf-token cookie is present', () => {
    setDocumentCookie('session=foo; other=bar')
    const helper = createCsrfHelper(makeCtx())
    expect(helper.getToken()).toBeUndefined()
  })

  it('prime() fetches GET /login-cookie/csrf with credentials: include', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
    const helper = createCsrfHelper(makeCtx())

    await helper.prime()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/api/auth/login-cookie/csrf')
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('include')
  })

  it('prime() dedupes concurrent in-flight calls into a single fetch', async () => {
    let resolveResponse: (response: Response) => void = () => undefined
    const responsePromise = new Promise<Response>(resolve => {
      resolveResponse = resolve
    })
    mockFetch.mockReturnValueOnce(responsePromise)

    const helper = createCsrfHelper(makeCtx())
    const p1 = helper.prime()
    const p2 = helper.prime()
    const p3 = helper.prime()

    // Three calls were issued in parallel — exactly one fetch should fire.
    expect(mockFetch).toHaveBeenCalledTimes(1)
    resolveResponse({ ok: true, status: 200, json: async () => ({}) } as Response)
    await Promise.all([p1, p2, p3])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('prime() skips the fetch after success when the cookie is still present', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
    const helper = createCsrfHelper(makeCtx())

    await helper.prime()
    // Simulate the server having set the cookie that prime() implicitly relies
    // on (the browser would do this automatically via Set-Cookie).
    setDocumentCookie('csrf-token=deadbeef')
    await helper.prime()
    await helper.prime()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('invalidate() forces the next prime() to re-fetch even when cookie present', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
    const helper = createCsrfHelper(makeCtx())

    await helper.prime()
    setDocumentCookie('csrf-token=cafe')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Without invalidate, a second prime should be a no-op (already primed +
    // cookie present). After invalidate, the next prime must hit the network.
    helper.invalidate()
    await helper.prime()
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('is SSR-safe — getToken returns undefined when document is unavailable', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    // @ts-expect-error — deleting a global is intentional for the SSR sim.
    delete globalThis.document
    try {
      const helper = createCsrfHelper(makeCtx())
      expect(helper.getToken()).toBeUndefined()
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'document', originalDescriptor)
      }
    }
  })

  it('is SSR-safe — prime resolves immediately and does not call fetch when document is unavailable', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    // @ts-expect-error — deleting a global is intentional for the SSR sim.
    delete globalThis.document
    try {
      const helper = createCsrfHelper(makeCtx())
      await helper.prime()
      expect(mockFetch).not.toHaveBeenCalled()
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'document', originalDescriptor)
      }
    }
  })

  it('prime() swallows fetch errors (so writes still surface the original status)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    const helper = createCsrfHelper(makeCtx())
    // Must not throw — the next cookieWrite() will hit a fresh 403 and retry,
    // but the helper itself stays passive when the priming endpoint fails.
    await expect(helper.prime()).resolves.toBeUndefined()
  })
})
