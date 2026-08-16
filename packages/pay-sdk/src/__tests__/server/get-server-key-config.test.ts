import { describe, it, expect, vi } from 'vitest'
import { getServerKeyConfig } from '../../server/get-server-key-config.js'
import type { ApplicationConfigResponse } from '../../core/types.js'

const configFixture: ApplicationConfigResponse = {
  applicationId: 'app_1',
  appSlug: 'acme',
  apiUrl: 'https://api.example.com',
  webUrl: 'https://acme.example.com',
  type: 'publishable',
  env: 'live',
  scope: 'user',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getServerKeyConfig', () => {
  it('returns null when no publishableKey is provided', async () => {
    const fetchImpl = vi.fn()
    const config = await getServerKeyConfig({
      apiUrl: 'https://api.example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(config).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns config from `{ success: true, data }` envelope', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: configFixture }))
    const config = await getServerKeyConfig({
      apiUrl: 'https://api.example.com',
      publishableKey: 'ez_pk_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(config).toEqual(configFixture)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/keys/config?key=ez_pk_live_abc',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns config from raw payload', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(configFixture))
    const config = await getServerKeyConfig({
      apiUrl: 'https://api.example.com',
      publishableKey: 'ez_pk_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(config).toEqual(configFixture)
  })

  it('url-encodes the publishable key', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: configFixture }))
    await getServerKeyConfig({
      apiUrl: 'https://api.example.com',
      publishableKey: 'ez_pk_live_a+b/c',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/keys/config?key=ez_pk_live_a%2Bb%2Fc',
      expect.any(Object)
    )
  })

  it('returns null on 401', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: false }, 401))
    const config = await getServerKeyConfig({
      apiUrl: 'https://api.example.com',
      publishableKey: 'ez_pk_live_bad',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(config).toBeNull()
  })

  it('returns null on `success: false` envelope', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: false, error: 'invalid key', data: configFixture })
    )
    const config = await getServerKeyConfig({
      apiUrl: 'https://api.example.com',
      publishableKey: 'ez_pk_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(config).toBeNull()
  })

  it('returns null when the shape lacks applicationId/appSlug', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: { foo: 'bar' } }))
    const config = await getServerKeyConfig({
      apiUrl: 'https://api.example.com',
      publishableKey: 'ez_pk_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(config).toBeNull()
  })

  it('returns null and logs warn on network error (never throws)', async () => {
    const warn = vi.fn()
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const config = await getServerKeyConfig({
      apiUrl: 'https://api.example.com',
      publishableKey: 'ez_pk_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      logger: { warn },
    })
    expect(config).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('handles trailing slash in apiUrl', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, data: configFixture }))
    await getServerKeyConfig({
      apiUrl: 'https://api.example.com/',
      publishableKey: 'ez_pk_live_abc',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/keys/config?key=ez_pk_live_abc',
      expect.any(Object)
    )
  })
})
