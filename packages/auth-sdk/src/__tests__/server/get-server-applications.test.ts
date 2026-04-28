import { describe, it, expect, vi } from 'vitest'
import { getServerApplications } from '../../server/get-server-applications.js'
import type { Application } from '../../core/types.js'

const appFixture: Application = {
  id: 'app_1',
  slug: 'acme',
  name: 'Acme Corp',
  ownerId: 'u_1',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getServerApplications', () => {
  it('returns null when no cookie header is provided', async () => {
    const fetchImpl = vi.fn()
    const apps = await getServerApplications({
      apiUrl: 'https://api.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(apps).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns apps from `{ success: true, data }` envelope', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [appFixture] }))
    const apps = await getServerApplications({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(apps).toEqual([appFixture])
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/applications',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns apps from raw array payload', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([appFixture]))
    const apps = await getServerApplications({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(apps).toEqual([appFixture])
  })

  it('appends ?all=true filter for superadmin', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    await getServerApplications({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      filters: { all: true },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/applications?all=true',
      expect.any(Object)
    )
  })

  it('appends ?includeArchived=true filter', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    await getServerApplications({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      filters: { includeArchived: true },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/applications?includeArchived=true',
      expect.any(Object)
    )
  })

  it('returns null on 401', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: false }, 401))
    const apps = await getServerApplications({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=expired',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(apps).toBeNull()
  })

  it('returns null on success: false envelope', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: false, error: 'forbidden', data: [appFixture] })
    )
    const apps = await getServerApplications({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(apps).toBeNull()
  })

  it('returns null and logs warn on network error', async () => {
    const warn = vi.fn()
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const apps = await getServerApplications({
      apiUrl: 'https://api.example.com',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: { warn },
    })
    expect(apps).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('handles trailing slash in apiUrl', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: [] }))
    await getServerApplications({
      apiUrl: 'https://api.example.com/',
      cookieHeader: 'session=abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/applications',
      expect.any(Object)
    )
  })
})
