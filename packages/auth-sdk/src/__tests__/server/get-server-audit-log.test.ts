import { describe, it, expect, vi } from 'vitest'
import { getServerAuditLog } from '../../server/get-server-audit-log.js'
import type { AuditLogEntry } from '../../core/types.js'

const entryFixture: AuditLogEntry = {
  id: 'al_1',
  userId: 'u_1',
  appName: 'ezauth',
  action: 'login',
  metadata: {},
  createdAt: '2026-04-26T12:00:00.000Z',
  expiresAt: '2026-05-26T12:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getServerAuditLog', () => {
  it('returns null when no cookie header is provided', async () => {
    const fetchImpl = vi.fn()
    const entries = await getServerAuditLog({
      apiUrl: 'https://api.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(entries).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns entries from `{ success: true, data: { items } }` envelope', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        success: true,
        data: { items: [entryFixture], total: 1, limit: 20, offset: 0 },
      })
    )
    const entries = await getServerAuditLog({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(entries).toEqual([entryFixture])
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/me/audit-log',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns entries from legacy `{ items }` envelope', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: [entryFixture] }))
    const entries = await getServerAuditLog({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(entries).toEqual([entryFixture])
  })

  it('appends query params from filters', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        success: true,
        data: { items: [], total: 0, limit: 10, offset: 5 },
      })
    )
    await getServerAuditLog({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      filters: { limit: 10, offset: 5, action: 'login' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/me/audit-log?limit=10&offset=5&action=login',
      expect.any(Object)
    )
  })

  it('returns null on 401', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: false }, 401))
    const entries = await getServerAuditLog({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=expired',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(entries).toBeNull()
  })

  it('returns null on success: false envelope', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: false, error: 'forbidden', data: { items: [entryFixture] } })
    )
    const entries = await getServerAuditLog({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(entries).toBeNull()
  })

  it('returns null and logs warn on network error', async () => {
    const warn = vi.fn()
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const entries = await getServerAuditLog({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: { warn },
    })
    expect(entries).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('handles trailing slash in apiUrl', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: true, data: { items: [], total: 0, limit: 20, offset: 0 } })
    )
    await getServerAuditLog({
      apiUrl: 'https://api.example.com/',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/auth/me/audit-log',
      expect.any(Object)
    )
  })
})
