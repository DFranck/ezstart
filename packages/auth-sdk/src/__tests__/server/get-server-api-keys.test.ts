import { describe, it, expect, vi } from 'vitest'
import { getServerApiKeys } from '../../server/get-server-api-keys.js'
import type { ApiKeyItem } from '../../core/types.js'

const keyFixture: ApiKeyItem = {
  id: 'k_1',
  keyPrefix: 'ez_pk_live_abc',
  name: 'Test key',
  appName: 'ezauth',
  scope: 'live',
  permissions: [],
  status: 'active',
  lastUsedAt: null,
  expiresAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  revokedAt: null,
  quotaMonthly: null,
  usageThisMonth: 0,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getServerApiKeys', () => {
  it('returns null when no cookie header is provided', async () => {
    const fetchImpl = vi.fn()
    const keys = await getServerApiKeys({
      apiUrl: 'https://api.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(keys).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns keys from `{ success: true, data }` envelope', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [keyFixture] }))
    const keys = await getServerApiKeys({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(keys).toEqual([keyFixture])
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/keys',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Cookie: 'session=abc' }),
        cache: 'no-store',
      })
    )
  })

  it('returns keys from raw array payload', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([keyFixture]))
    const keys = await getServerApiKeys({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(keys).toEqual([keyFixture])
  })

  it('returns empty array when API returns empty data', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    const keys = await getServerApiKeys({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(keys).toEqual([])
  })

  it('returns null on 401', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: false }, 401))
    const keys = await getServerApiKeys({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=expired',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(keys).toBeNull()
  })

  it('returns null on success: false envelope', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: false, error: 'forbidden', data: [keyFixture] })
    )
    const keys = await getServerApiKeys({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(keys).toBeNull()
  })

  it('returns null and logs warn on network error', async () => {
    const warn = vi.fn()
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const keys = await getServerApiKeys({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: { warn },
    })
    expect(keys).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('handles trailing slash in apiUrl', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    await getServerApiKeys({
      apiUrl: 'https://api.example.com/',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/api/keys', expect.any(Object))
  })
})
