/**
 * Agnostic core tests.
 *
 * Proves that `createApiClient` works WITHOUT any reference to the @ezstart
 * monorepo (no `getApiUrl`, no `localStorage` ezauth keys, no shared logger).
 * These tests guard against regressions where monorepo coupling leaks back
 * into the agnostic core.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../core/create-client.js'

type FetchMock = ReturnType<typeof vi.fn>

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createApiClient (agnostic)', () => {
  let fetchMock: FetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves baseUrl via a custom function (no @ezstart/config)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    const client = createApiClient({
      baseUrl: appName => `https://api.${appName}.example.com`,
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    await client.apiCall('/users', { appName: 'my-service' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.my-service.example.com/api/users')
  })

  it('uses a literal baseUrl string when no resolver function is needed', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }))

    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    await client.apiCall('/ping')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://flat.example.com/api/ping')
  })

  it('honors a custom pathPrefix (empty string disables prefixing)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }))

    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      pathPrefix: '',
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    await client.apiCall('/users')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://flat.example.com/users')
  })

  it('honors a custom pathPrefix (e.g. /v1) and dedupes existing prefix', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }))
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }))

    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      pathPrefix: '/v1',
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    await client.apiCall('/users')
    await client.apiCall('/v1/users')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://flat.example.com/v1/users')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://flat.example.com/v1/users')
  })

  it('passes through absolute URLs unchanged (no prefix, no base)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }))

    const client = createApiClient({
      baseUrl: null,
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
      pathPrefix: '',
    })

    await client.apiCall('https://other.example.com/raw?x=1')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://other.example.com/raw?x=1')
  })

  it('uses a custom tokenStore (no localStorage)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }))

    const tokens = { access: 'abc' }
    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      tokenStore: { getAccessToken: () => tokens.access },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    await client.apiCall('/me')

    const headers = fetchMock.mock.calls[0]?.[1].headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer abc')
  })

  it('supports an async tokenStore (Promise-returning getters)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }))

    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      tokenStore: {
        getAccessToken: async () => {
          await Promise.resolve()
          return 'async-token'
        },
      },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    await client.apiCall('/me')

    const headers = fetchMock.mock.calls[0]?.[1].headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer async-token')
  })

  it('supports a custom refresh endpoint + setTokens callback (no ezauth)', async () => {
    let stored = { accessToken: 'old', refreshToken: 'rfr' }

    // 1. unauthorized
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'expired' }, { status: 401 }))
    // 2. refresh call
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ accessToken: 'fresh', refreshToken: 'fresh-rfr' })
    )
    // 3. retry with fresh token
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 1 }))

    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      tokenStore: {
        getAccessToken: () => stored.accessToken,
        getRefreshToken: () => stored.refreshToken,
        setTokens: tokens => {
          stored = tokens
        },
      },
      refresh: { endpoint: 'https://auth.example.com/refresh' },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    await client.apiCall('/secret')

    // Refresh hit the configured endpoint
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://auth.example.com/refresh')
    // Retry used the new token
    const retryHeaders = fetchMock.mock.calls[2]?.[1].headers as Record<string, string>
    expect(retryHeaders.Authorization).toBe('Bearer fresh')
    // setTokens was invoked
    expect(stored.accessToken).toBe('fresh')
    expect(stored.refreshToken).toBe('fresh-rfr')
  })

  it('disables envelope handling when configured (returns body untouched)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 42 } }))

    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    const result = await client.apiCall<{ success: boolean; data: { id: number } }>('/users/42')

    expect(result).toEqual({ success: true, data: { id: 42 } })
  })

  it('does not throw on { success: false } envelope when throwOnFailureEnvelope is false', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: { message: 'nope' } }))

    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    const result = await client.apiCall<{ success: boolean; error: { message: string } }>('/x')

    expect(result.success).toBe(false)
    expect(result.error.message).toBe('nope')
  })

  it('does not auto-refresh when no refresh config is provided', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'expired' }, { status: 401 }))

    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      tokenStore: { getAccessToken: () => 'stale' },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    await expect(client.apiCall('/me')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses a custom logger (no @ezstart/logger)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'))

    const warn = vi.fn()
    const debug = vi.fn()
    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      logger: { warn, debug },
      envelope: { unwrap: false, throwOnFailureEnvelope: false },
    })

    await expect(client.apiCall('/oops')).rejects.toThrow()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe('[apiCall] Network error')
  })

  it('throws a clear error when no baseUrl resolves and endpoint is relative', async () => {
    const client = createApiClient({ baseUrl: null })
    await expect(client.apiCall('/users')).rejects.toThrow(/No baseUrl resolved/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exposes the resolved config (read-only)', () => {
    const client = createApiClient({
      baseUrl: 'https://flat.example.com',
      pathPrefix: '/v2',
    })

    expect(client.config.pathPrefix).toBe('/v2')
    expect(client.config.envelope.unwrap).toBe(true)
    expect(client.config.envelope.throwOnFailureEnvelope).toBe(true)
    expect(client.config.credentials).toBe('include')
  })
})
