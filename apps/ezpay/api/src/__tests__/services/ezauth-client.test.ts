/**
 * Tests for the EZAuth S2S client.
 *
 * Uses vitest's global fetch mock — no real network calls. Covers happy
 * paths, 404/401/403 → null, 5xx retry, timeout → null + circuit tripping.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getApplication,
  lookupApplicationBySlug,
  resolveKey,
  _resetCircuitForTests,
} from '../../services/ezauth-client.js'

const originalFetch = globalThis.fetch

function envelope<T>(data: T) {
  return { success: true as const, data }
}

function errorEnvelope(error: string) {
  return { success: false as const, error }
}

function okResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('EZAuth S2S client', () => {
  beforeEach(() => {
    _resetCircuitForTests()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('getApplication', () => {
    it('returns the Application on 200', async () => {
      const payload = {
        id: 'app-1',
        slug: 'acme',
        name: 'Acme',
        ownerId: 'user-1',
        status: 'active' as const,
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z',
      }
      globalThis.fetch = vi.fn(async () => okResponse(envelope(payload))) as typeof fetch

      const app = await getApplication('app-1', {
        apiUrl: 'https://api.example.com',
        bearerToken: 'jwt-123',
      })

      expect(app).toEqual(payload)
      expect(globalThis.fetch).toHaveBeenCalledOnce()
      const call = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
      const [url, init] = call as [string, RequestInit]
      expect(url).toBe('https://api.example.com/api/applications/app-1')
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer jwt-123')
    })

    it('returns null on 404', async () => {
      globalThis.fetch = vi.fn(async () =>
        okResponse(errorEnvelope('not found'), 404)
      ) as typeof fetch

      const app = await getApplication('missing', { apiUrl: 'https://api.example.com' })
      expect(app).toBeNull()
    })

    it('returns null on 401 / 403', async () => {
      globalThis.fetch = vi.fn(async () =>
        okResponse(errorEnvelope('forbidden'), 403)
      ) as typeof fetch

      const app = await getApplication('any', { apiUrl: 'https://api.example.com' })
      expect(app).toBeNull()
    })

    it('retries once on 5xx then succeeds', async () => {
      const payload = {
        id: 'app-1',
        slug: 'acme',
        name: 'Acme',
        ownerId: 'user-1',
        status: 'active' as const,
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z',
      }
      let call = 0
      globalThis.fetch = vi.fn(async () => {
        call += 1
        if (call === 1) return okResponse(errorEnvelope('oops'), 502)
        return okResponse(envelope(payload))
      }) as typeof fetch

      const app = await getApplication('app-1', { apiUrl: 'https://api.example.com' })
      expect(app).not.toBeNull()
      expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    })

    it('returns null when both attempts 5xx (no throw)', async () => {
      globalThis.fetch = vi.fn(async () => okResponse(errorEnvelope('bad'), 502)) as typeof fetch

      const app = await getApplication('x', { apiUrl: 'https://api.example.com' })
      // After retry both failed — fetch returns non-ok and we log + return null.
      expect(app).toBeNull()
    })

    it('returns null on network error', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('network down')
      }) as typeof fetch

      const app = await getApplication('x', { apiUrl: 'https://api.example.com' })
      expect(app).toBeNull()
    })

    it('passes X-API-Key when serverKey is provided', async () => {
      globalThis.fetch = vi.fn(async () =>
        okResponse(
          envelope({
            id: 'a',
            slug: 'b',
            name: 'c',
            ownerId: 'u',
            status: 'active' as const,
            createdAt: '2026-04-20T00:00:00.000Z',
            updatedAt: '2026-04-20T00:00:00.000Z',
          })
        )
      ) as typeof fetch

      await getApplication('a', {
        apiUrl: 'https://api.example.com',
        serverKey: 'ez_sk_live_server',
      })

      const call = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
      const [, init] = call as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['X-API-Key']).toBe('ez_sk_live_server')
    })
  })

  describe('lookupApplicationBySlug', () => {
    it('returns the lookup triple on success', async () => {
      globalThis.fetch = vi.fn(async () =>
        okResponse(envelope({ id: 'app-1', slug: 'acme', name: 'Acme' }))
      ) as typeof fetch

      const data = await lookupApplicationBySlug('acme', {
        apiUrl: 'https://api.example.com',
      })
      expect(data).toEqual({ id: 'app-1', slug: 'acme', name: 'Acme' })
    })

    it('returns null on 404', async () => {
      globalThis.fetch = vi.fn(async () =>
        okResponse(errorEnvelope('not found'), 404)
      ) as typeof fetch

      const data = await lookupApplicationBySlug('missing', {
        apiUrl: 'https://api.example.com',
      })
      expect(data).toBeNull()
    })

    it('url-encodes the slug', async () => {
      globalThis.fetch = vi.fn(async () =>
        okResponse(envelope({ id: 'a', slug: 'a b', name: 'x' }))
      ) as typeof fetch

      await lookupApplicationBySlug('a b', { apiUrl: 'https://api.example.com' })
      const call = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
      const [url] = call as [string, unknown]
      expect(url).toContain('slug=a%20b')
    })
  })

  describe('resolveKey', () => {
    it('returns resolved key info', async () => {
      globalThis.fetch = vi.fn(async () =>
        okResponse(
          envelope({
            applicationId: 'app-1',
            slug: 'acme',
            name: 'Acme',
            type: 'publishable' as const,
            env: 'live' as const,
            scope: 'user' as const,
          })
        )
      ) as typeof fetch

      const data = await resolveKey('ez_pk_live_x', {
        apiUrl: 'https://api.example.com',
      })
      expect(data?.applicationId).toBe('app-1')
      expect(data?.scope).toBe('user')
    })
  })

  describe('Circuit breaker', () => {
    it('opens after 3 consecutive network failures and short-circuits', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('down')
      }) as typeof fetch

      for (let i = 0; i < 3; i++) {
        await getApplication('x', { apiUrl: 'https://api.example.com' })
      }

      const fetchCalls = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length
      const prev = fetchCalls

      // Circuit should be open — next call must NOT hit fetch.
      const next = await getApplication('x', { apiUrl: 'https://api.example.com' })
      expect(next).toBeNull()
      expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(prev)
    })
  })
})
