import { describe, it, expect, vi } from 'vitest'
import { DEFAULT_GET_SERVER_AUTH_TIMEOUT_MS, getServerAuth } from '../../server/get-server-auth.js'
import type { AuthUser } from '../../core/types.js'

const userFixture: AuthUser = {
  _id: 'u_123',
  email: 'jane@example.com',
  username: 'jane',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getServerAuth', () => {
  it('returns null when no cookie header is provided', async () => {
    const fetchImpl = vi.fn()
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns null when cookie header is empty string', async () => {
    const fetchImpl = vi.fn()
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: '',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns null when cookie header is null', async () => {
    const fetchImpl = vi.fn()
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: null,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns user from `{ success: true, data: { user } }` envelope', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: true, data: { user: userFixture } })
    )
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toEqual(userFixture)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Cookie: 'session=abc',
          Accept: 'application/json',
        }),
        cache: 'no-store',
      })
    )
  })

  it('returns user from legacy `{ user }` envelope', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ user: userFixture }))
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toEqual(userFixture)
  })

  it('returns user from raw payload at top level', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(userFixture))
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toEqual(userFixture)
  })

  it('returns user from `{ data: AuthUser }` (no nested user key)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: userFixture }))
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toEqual(userFixture)
  })

  it('returns null on 401 response', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: false, error: 'Unauthorized' }, 401)
    )
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=expired',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toBeNull()
  })

  it('returns null on 500 response', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: false }, 500))
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toBeNull()
  })

  it('returns null when envelope has `success: false` even with a stray user key', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: false, error: 'forbidden', data: { user: userFixture } })
    )
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toBeNull()
  })

  it('returns null on network error and logs a warning', async () => {
    const warn = vi.fn()
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: { warn },
    })
    expect(user).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('[getServerAuth]')
  })

  it('does not throw when logger is omitted on network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('boom')
    })
    await expect(
      getServerAuth({
        apiUrl: 'https://api.example.com',
        cookieHeader: 'session=abc',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toBeNull()
  })

  it('returns null when response is not valid JSON', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('<html>not json</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
    )
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toBeNull()
  })

  it('returns null when JSON has no recognisable user shape', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: { foo: 'bar' } }))
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toBeNull()
  })

  it('handles trailing slash in apiUrl', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: true, data: { user: userFixture } })
    )
    await getServerAuth({
      apiUrl: 'https://api.example.com/',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/me',
      expect.any(Object)
    )
  })

  it('handles multiple trailing slashes in apiUrl', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: true, data: { user: userFixture } })
    )
    await getServerAuth({
      apiUrl: 'https://api.example.com///',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/me',
      expect.any(Object)
    )
  })

  it('returns null when user shape is missing required fields', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: true, data: { user: { _id: 'u_1' /* no email */ } } })
    )
    const user = await getServerAuth({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(user).toBeNull()
  })

  describe('timeout / AbortSignal', () => {
    /**
     * Mock fetch that respects the AbortSignal: rejects with an
     * `AbortError`-shaped exception when the signal aborts, otherwise hangs
     * up to `hangMs` and then resolves with `userFixture`.
     */
    function makeHangingFetch(hangMs: number): typeof fetch {
      const impl = (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        return new Promise<Response>((resolve, reject) => {
          const signal = init?.signal
          const timer = setTimeout(() => {
            resolve(jsonResponse({ success: true, data: { user: userFixture } }))
          }, hangMs)
          if (signal) {
            const onAbort = () => {
              clearTimeout(timer)
              // Match undici's AbortError shape (DOMException with name='AbortError').
              const err = Object.assign(new Error('The operation was aborted.'), {
                name: 'AbortError',
              })
              reject(err)
            }
            if (signal.aborted) {
              onAbort()
            } else {
              signal.addEventListener('abort', onAbort, { once: true })
            }
          }
        })
      }
      return impl as unknown as typeof fetch
    }

    it('default timeout exposes the documented constant', () => {
      expect(DEFAULT_GET_SERVER_AUTH_TIMEOUT_MS).toBe(1500)
    })

    it('returns null gracefully when /me hangs beyond timeoutMs and logs a warn', async () => {
      const warn = vi.fn()
      const fetchImpl = makeHangingFetch(1000)
      const user = await getServerAuth({
        apiUrl: 'https://api.example.com',
        cookieHeader: 'session=abc',
        fetchImpl,
        logger: { warn },
        timeoutMs: 50,
      })
      expect(user).toBeNull()
      expect(warn).toHaveBeenCalledTimes(1)
      const [message, ctx] = warn.mock.calls[0] as [string, Record<string, unknown>]
      expect(message).toContain('[getServerAuth]')
      expect(message.toLowerCase()).toContain('timeout')
      expect(ctx).toMatchObject({ timeoutMs: 50 })
    })

    it('respects a custom timeoutMs passed by the caller', async () => {
      const start = Date.now()
      const user = await getServerAuth({
        apiUrl: 'https://api.example.com',
        cookieHeader: 'session=abc',
        fetchImpl: makeHangingFetch(2000),
        timeoutMs: 100,
      })
      const elapsed = Date.now() - start
      expect(user).toBeNull()
      // Should abort close to 100 ms, well below the 2000 ms hang and the
      // 1500 ms default — give a generous CI-friendly upper bound.
      expect(elapsed).toBeLessThan(800)
    })

    it('does not abort a response that arrives before the timeout', async () => {
      const user = await getServerAuth({
        apiUrl: 'https://api.example.com',
        cookieHeader: 'session=abc',
        // Resolves immediately (next microtask) — well before timeout.
        fetchImpl: makeHangingFetch(0),
        timeoutMs: 1000,
      })
      expect(user).toEqual(userFixture)
    })

    it('disables the timeout when timeoutMs is 0', async () => {
      // With a disabled timeout we cannot wait for a real hang, but we can
      // assert that the signal is NOT passed (or is undefined) by spying on
      // the fetch call shape.
      const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.signal == null).toBe(true)
        return jsonResponse({ success: true, data: { user: userFixture } })
      })
      const user = await getServerAuth({
        apiUrl: 'https://api.example.com',
        cookieHeader: 'session=abc',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 0,
      })
      expect(user).toEqual(userFixture)
    })

    it('does not throw when logger is omitted on timeout', async () => {
      await expect(
        getServerAuth({
          apiUrl: 'https://api.example.com',
          cookieHeader: 'session=abc',
          fetchImpl: makeHangingFetch(500),
          timeoutMs: 25,
        })
      ).resolves.toBeNull()
    })
  })
})
